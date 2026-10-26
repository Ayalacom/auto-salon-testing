const m = require('mongoose');
const User = m.model('User', new m.Schema({ login: { type: String, unique: true }, password: String, role: { type: String, default: 'client' } }));
const Car = m.model('Car', new m.Schema({ brand: String, model: String, year: Number, price: Number }));
const Client = m.model('Client', new m.Schema({ fullName: String, phone: String, email: String }));
const Appointment = m.model('Appointment', new m.Schema({
  client: { type: m.Schema.Types.ObjectId, ref: 'Client' },
  car: { type: m.Schema.Types.ObjectId, ref: 'Car' },
  type: String, date: Date, status: { type: String, default: 'Жаңа' } }));
module.exports = { User, Car, Client, Appointment };
