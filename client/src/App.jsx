import { useState, useEffect } from 'react';

async function api(url, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) }, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Қате');
  return data;
}
const money = (n) => Number(n).toLocaleString('ru-RU') + ' ₸';
const Note = ({ m }) => (m ? <div className={'note ' + (m.ok ? 'ok' : '')}>{m.t}</div> : null);

function Login({ onLogin }) {
  const [f, setF] = useState({ login: '', password: '' }); const [m, setM] = useState(null);
  const send = async (path) => {
    try {
      const d = await api('/api/auth/' + path, 'POST', f);
      if (path === 'login') { localStorage.setItem('token', d.token); localStorage.setItem('role', d.role); localStorage.setItem('login', d.login); onLogin(d.role); }
      else setM({ ok: true, t: 'Тіркелдіңіз, енді кіріңіз' });
    } catch (e) { setM({ t: e.message }); }
  };
  return (<div className="auth"><div className="box"><h1>Auto<span>Salon</span></h1><p>Автосалон жұмысын басқару жүйесі</p>
    <Note m={m} />
    <input placeholder="Логин" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} />
    <input type="password" placeholder="Құпиясөз" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
    <button onClick={() => send('login')}>Кіру</button><button className="light" onClick={() => send('register')}>Тіркелу</button></div></div>);
}

function Cars({ staff }) {
  const [list, setList] = useState([]); const [f, setF] = useState({ brand: '', model: '', year: '', price: '' }); const [m, setM] = useState(null); const [q, setQ] = useState('');
  const load = () => api('/api/cars').then(setList).catch((e) => setM({ t: e.message }));
  useEffect(() => { load(); }, []);
  const add = async () => {
    try { await api('/api/cars', 'POST', { ...f, year: Number(f.year), price: Number(f.price) }); setM({ ok: true, t: 'Көлік қосылды' }); setF({ brand: '', model: '', year: '', price: '' }); load(); }
    catch (e) { setM({ t: e.message }); }
  };
  const del = async (id) => { try { await api('/api/cars/' + id, 'DELETE'); load(); } catch (e) { setM({ t: e.message }); } };
  const shown = list.filter((c) => (c.brand + ' ' + c.model).toLowerCase().includes(q.toLowerCase()));
  return (<div><div className="hero"><h2>Автокөліктер каталогы</h2><p>Барлығы: {list.length} көлік</p></div>
    <div className="wrap"><Note m={m} />
      <div className="bar"><input placeholder="Іздеу (марка, модель)" value={q} onChange={(e) => setQ(e.target.value)} />
        {staff && <>{[['brand', 'Марка'], ['model', 'Модель'], ['year', 'Жыл'], ['price', 'Баға']].map(([k, p]) => <input key={k} style={{ width: 120 }} placeholder={p} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)}
          <button onClick={add}>+ Қосу</button></>}</div>
      <div className="grid">{shown.map((c) => <div className="car" key={c._id}><div className="pic">🚗</div><div className="in">
        <h3>{c.brand} {c.model}</h3><div className="meta">{c.year} жыл</div><div className="price">{money(c.price)}</div>
        {staff && <button className="del" onClick={() => del(c._id)}>Өшіру</button>}</div></div>)}</div></div></div>);
}

function Clients() {
  const [list, setList] = useState([]); const [f, setF] = useState({ fullName: '', phone: '+7', email: '' }); const [m, setM] = useState(null);
  const load = () => api('/api/clients').then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const add = async () => { try { await api('/api/clients', 'POST', f); setM({ ok: true, t: 'Клиент сақталды' }); load(); } catch (e) { setM({ t: e.message }); } };
  return (<div><div className="hero"><h2>Клиенттер</h2><p>Клиенттер базасы (өтінім үшін ID қажет)</p></div>
    <div className="wrap"><Note m={m} /><div className="bar">
      <input placeholder="Аты-жөні" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
      <input placeholder="+7XXXXXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <button onClick={add}>Сақтау</button></div>
      <div className="grid">{list.map((c) => <div className="person" key={c._id}><div className="av">{c.fullName?.[0]}</div>
        <div><div>{c.fullName}</div><small>{c.phone}</small><small>ID: {c._id}</small></div></div>)}</div></div></div>);
}

function Appointments({ staff }) {
  const [list, setList] = useState([]); const [cars, setCars] = useState([]);
  const [f, setF] = useState({ clientId: '', carId: '', type: 'тест-драйв', date: '' }); const [m, setM] = useState(null);
  const load = () => api('/api/appointments').then(setList).catch(() => {});
  useEffect(() => { load(); api('/api/cars').then(setCars); }, []);
  const add = async () => { try { await api('/api/appointments', 'POST', f); setM({ ok: true, t: 'Өтінім сақталды' }); load(); } catch (e) { setM({ t: e.message }); } };
  const status = async (id, s) => { try { await api(`/api/appointments/${id}/status`, 'PUT', { status: s }); setM(null); load(); } catch (e) { setM({ t: e.message }); } };
  return (<div><div className="hero"><h2>Өтінімдер және тест-драйв</h2><p>Қарауға немесе тест-драйвқа жазылу</p></div>
    <div className="wrap"><Note m={m} /><div className="bar">
      <input placeholder="Клиент ID" value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} />
      <select value={f.carId} onChange={(e) => setF({ ...f, carId: e.target.value })}><option value="">Көлік таңдаңыз</option>
        {cars.map((c) => <option key={c._id} value={c._id}>{c.brand} {c.model}</option>)}</select>
      <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option>тест-драйв</option><option>қарау</option></select>
      <input type="datetime-local" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      <button onClick={add}>Жіберу</button></div>
      <table><thead><tr><th>Клиент</th><th>Көлік</th><th>Түрі</th><th>Күні</th><th>Мәртебе</th>{staff && <th>Өзгерту</th>}</tr></thead>
        <tbody>{list.map((a) => <tr key={a._id}><td>{a.client?.fullName}</td><td>{a.car?.brand} {a.car?.model}</td><td>{a.type}</td>
          <td>{new Date(a.date).toLocaleString()}</td><td><span className={'pill s-' + a.status.split(' ')[0]}>{a.status}</span></td>
          {staff && <td><div className="row">{['Қаралуда', 'Расталды', 'Аяқталды', 'Бас тартылды'].map((s) => <button className="mini" key={s} onClick={() => status(a._id, s)}>{s}</button>)}</div></td>}</tr>)}</tbody></table></div></div>);
}

export default function App() {
  const [role, setRole] = useState(localStorage.getItem('role')); const [tab, setTab] = useState('cars');
  const staff = role === 'admin' || role === 'manager';
  const logout = () => { localStorage.clear(); setRole(null); };
  if (!role) return <Login onLogin={setRole} />;
  const tabs = [['cars', 'Автокөліктер'], ['clients', 'Клиенттер'], ['app', 'Өтінімдер']];
  return (<div><div className="nav"><div className="brand">Auto<span>Salon</span></div>
    <div className="tabs">{tabs.map(([k, t]) => <button key={k} className={'tab ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{t}</button>)}</div>
    <div className="who">{localStorage.getItem('login')} <i>{role}</i><button className="light" onClick={logout}>Шығу</button></div></div>
    {tab === 'cars' && <Cars staff={staff} />}{tab === 'clients' && <Clients />}{tab === 'app' && <Appointments staff={staff} />}</div>);
}
