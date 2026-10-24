const mongoose = require('mongoose');

const adsRegistrationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "Name is required"],
    trim: true 
  },
  phone: { 
    type: String, 
    required: [true, "Phone number is required"]
  },
  city: { 
    type: String, 
    required: [true, "City is required"],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, "Email is required"],
    lowercase: true,
    trim: true
  },
  examPreparing: { 
    type: String,
    trim: true 
  },
  lookingFor: { 
    type: String,
    trim: true 
  },
  registrationDate: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdsRegistration', adsRegistrationSchema);
