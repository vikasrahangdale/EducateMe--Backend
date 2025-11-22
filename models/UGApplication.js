const mongoose = require('mongoose');

const ugApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  class: { type: String, required: true },
  stream: { type: String, required: true },
  grade10: { type: String, required: true },
  grade12: { type: String, required: true },
  paymentStatus: { type: String, default: 'pending' },
  paymentId: { type: String },
    examDate: { type: String, required: true },
  orderId: { type: String },
  applicationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UGApplication', ugApplicationSchema);