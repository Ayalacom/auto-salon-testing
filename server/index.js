require('express-async-errors');
const express = require('express'), mongoose = require('mongoose'), cors = require('cors');
const jwt = require('jsonwebtoken'), bcrypt = require('bcryptjs'), fs = require('fs'), path = require('path');
const { User, Car, Client, Appointment } = require('./models');
const SECRET = 'autosalon_secret', PORT = 5000;
const app = express(); app.use(cors()); app.use(express.json());

fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
const log = (file, msg) => fs.appendFileSync(path.join(__dirname, 'logs', file), new Date().toISOString() + ' ' + msg + '\n');
app.use((req, res, next) => { res.on('finish', () => log('app.log', `${req.method} ${req.originalUrl} ${res.statusCode}`)); next(); });

const bad = (res, msg) => res.status(400).json({ message: msg });
const notFound = (res) => res.status(404).json({ message: 'Табылмады' });
const okId = (id) => mongoose.isValidObjectId(id);

function auth(roles) {
  return (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      req.user = jwt.verify(token, SECRET);
    } catch (e) { return res.status(401).json({ message: 'Алдымен жүйеге кіріңіз' }); }
    if (roles && !roles.includes(req.user.role)) return res.status(403).json({ message: 'Рұқсат жоқ' });
    next();
  };
}
const staff = ['admin', 'manager'];

// ---------- AUTH ----------
app.post('/api/auth/register', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return bad(res, 'Логин мен құпиясөз міндетті');
  if (password.length < 6) return bad(res, 'Құпиясөз кемінде 6 символ болуы керек');
  if (await User.findOne({ login })) return bad(res, 'Бұл логин бос емес');
  const u = await User.create({ login, password: await bcrypt.hash(password, 10), role: 'client' });
  res.status(201).json({ id: u._id, login: u.login, role: u.role });
});
app.post('/api/auth/login', async (req, res) => {
  const u = await User.findOne({ login: req.body.login });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password)))
    return res.status(401).json({ message: 'Логин немесе құпиясөз қате' });
  res.json({ token: jwt.sign({ id: u._id, role: u.role }, SECRET, { expiresIn: '2h' }), role: u.role, login: u.login });
});

// ---------- CARS ----------
function checkCar(b) {
  if (!b.brand || !b.model) return 'Марка мен модель міндетті';
  if (!Number.isInteger(b.year) || b.year < 1990 || b.year > 2030) return 'Шығарылған жылы дұрыс емес';
  if (typeof b.price !== 'number' || b.price <= 0) return 'Баға 0-ден үлкен сан болуы керек';
}
app.get('/api/cars', auth(), async (req, res) => res.json(await Car.find()));
app.get('/api/cars/:id', auth(), async (req, res) => {
  const c = okId(req.params.id) && await Car.findById(req.params.id);
  c ? res.json(c) : notFound(res);
});
app.post('/api/cars', auth(staff), async (req, res) => {
  const err = checkCar(req.body); if (err) return bad(res, err);
  res.status(201).json(await Car.create(req.body));
});
app.put('/api/cars/:id', auth(staff), async (req, res) => {
  const err = checkCar(req.body); if (err) return bad(res, err);
  const c = okId(req.params.id) && await Car.findByIdAndUpdate(req.params.id, req.body, { new: true });
  c ? res.json(c) : notFound(res);
});
app.delete('/api/cars/:id', auth(staff), async (req, res) => {
  const c = okId(req.params.id) && await Car.findByIdAndDelete(req.params.id);
  c ? res.json({ message: 'Өшірілді' }) : notFound(res);
});

// ---------- CRM (clients) ----------
function checkClient(b) {
  if (!b.fullName) return 'Аты-жөні міндетті';
  if (!/^\+7\d{10}$/.test(b.phone || '')) return 'Телефон +7 және 10 саннан тұруы керек';
  if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) return 'Email дұрыс емес';
}
app.get('/api/clients', auth(staff), async (req, res) => res.json(await Client.find()));
app.post('/api/clients', auth(), async (req, res) => {
  const err = checkClient(req.body); if (err) return bad(res, err);
  res.status(201).json(await Client.create(req.body));
});
app.put('/api/clients/:id', auth(staff), async (req, res) => {
  const err = checkClient(req.body); if (err) return bad(res, err);
  const c = okId(req.params.id) && await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
  c ? res.json(c) : notFound(res);
});
app.delete('/api/clients/:id', auth(staff), async (req, res) => {
  const c = okId(req.params.id) && await Client.findByIdAndDelete(req.params.id);
  c ? res.json({ message: 'Өшірілді' }) : notFound(res);
});

// ---------- APPOINTMENTS ----------
const flow = { 'Жаңа': ['Қаралуда', 'Бас тартылды'], 'Қаралуда': ['Расталды', 'Бас тартылды'], 'Расталды': ['Аяқталды'], 'Аяқталды': [], 'Бас тартылды': [] };
app.get('/api/appointments', auth(), async (req, res) =>
  res.json(await Appointment.find().populate('client car')));
app.post('/api/appointments', auth(), async (req, res) => {
  const { clientId, carId, type, date } = req.body;
  if (!okId(clientId) || !(await Client.findById(clientId))) return bad(res, 'Клиент таңдалмаған');
  if (!okId(carId) || !(await Car.findById(carId))) return bad(res, 'Көлік таңдалмаған');
  if (!['қарау', 'тест-драйв'].includes(type)) return bad(res, 'Өтінім түрі қате');
  if (!date || isNaN(new Date(date)) || new Date(date) < new Date()) return bad(res, 'Күні болашақта болуы керек');
  res.status(201).json(await Appointment.create({ client: clientId, car: carId, type, date }));
});
app.put('/api/appointments/:id/status', auth(staff), async (req, res) => {
  const a = okId(req.params.id) && await Appointment.findById(req.params.id);
  if (!a) return notFound(res);
  if (!(flow[a.status] || []).includes(req.body.status)) return bad(res, `${a.status} күйінен ${req.body.status} күйіне өтуге болмайды`);
  a.status = req.body.status; await a.save(); res.json(a);
});

app.use((err, req, res, nextFn) => {
  log('error.log', `${req.method} ${req.originalUrl} ${err.stack}`);
  res.status(500).json({ message: 'Серверлік қате' });
});

mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/autosalon')
  .then(() => app.listen(PORT, () => console.log('Сервер http://localhost:' + PORT)))
  .catch((e) => { log('error.log', 'MongoDB қосылмады: ' + e.message); console.error('MongoDB қосылмады'); });
