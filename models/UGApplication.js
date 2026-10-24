const mongoose = require('mongoose');

const ugApplicationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "Name is required"],
    trim: true 
  },
  email: { 
    type: String, 
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
  },
  mobile: { 
    type: String, 
    required: [true, "Mobile number is required"],
    minlength: [10, "Mobile number must be at least 10 digits"]
  },
  city: { 
    type: String, 
    required: [true, "City is required"],
    trim: true 
  },
  state: { 
    type: String, 
    required: [true, "State is required"],
    trim: true 
  },
  class: { 
    type: String, 
    required: [true, "Class is required"],
    trim: true 
  },
  stream: { 
    type: String, 
    required: [true, "Stream is required"],
    trim: true 
  },
  grade10: { 
    type: String, 
    required: [true, "Grade 10 is required"] 
  },
  grade12: { 
    type: String, 
    required: [true, "Grade 12 is required"] 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'],
    default: 'pending' 
  },
  paymentId: { type: String },
  examDate: { 
    type: String, 
    required: [true, "Exam date is required"] 
  },
  orderId: { type: String },
  applicationDate: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ugApplicationSchema.index({ email: 1 });
ugApplicationSchema.index({ mobile: 1 });
ugApplicationSchema.index({ paymentStatus: 1 });
ugApplicationSchema.index({ applicationDate: -1 });
ugApplicationSchema.index({ examDate: 1 });

module.exports = mongoose.model('UGApplication', ugApplicationSchema);