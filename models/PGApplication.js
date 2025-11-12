const mongoose = require('mongoose');

const pgApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  class: { type: String, required: true },
  stream: { type: String, required: true },
  grade10: { type: String, required: true },
  grade12: { type: String, required: true },
  graduationScore: { type: String, required: true },
  graduationStream: { type: String, required: true },
  passingYear: { type: String, required: true },
  paymentStatus: { type: String, default: 'pending' },
  paymentId: { type: String },
  orderId: { type: String },
  applicationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PGApplication', pgApplicationSchema);