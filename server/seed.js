const mongoose = require('mongoose'), bcrypt = require('bcryptjs');
const { User, Car } = require('./models');
(async () => {
  await mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/autosalon');
  await User.deleteMany({}); await Car.deleteMany({});
  await User.create([{ login: 'manager', password: await bcrypt.hash('manager123', 10), role: 'manager' },
                     { login: 'admin', password: await bcrypt.hash('admin123', 10), role: 'admin' }]);
  await Car.create([{ brand: 'Toyota', model: 'Camry', year: 2022, price: 15000000 },
                    { brand: 'Hyundai', model: 'Tucson', year: 2023, price: 14500000 }]);
  console.log('Дайын: manager/manager123, admin/admin123'); process.exit();
})();
