const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  username: { type: String, default: 'Noma\'lum' },
  phone: { type: String },
  type: { type: String, enum: ['taksi', 'pochta'], required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  passengers: { type: Number },
  status: { type: String, default: 'yangi' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
