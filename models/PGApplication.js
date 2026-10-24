const mongoose = require('mongoose');

const pgApplicationSchema = new mongoose.Schema({
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
  graduationScore: { 
    type: String, 
    required: [true, "Graduation score is required"] 
  },
  graduationStream: { 
    type: String, 
    required: [true, "Graduation stream is required"],
    trim: true 
  },
  passingYear: { 
    type: String, 
    required: [true, "Passing year is required"] 
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
pgApplicationSchema.index({ email: 1 });
pgApplicationSchema.index({ mobile: 1 });
pgApplicationSchema.index({ paymentStatus: 1 });
pgApplicationSchema.index({ applicationDate: -1 });
pgApplicationSchema.index({ examDate: 1 });
pgApplicationSchema.index({ graduationStream: 1 });

module.exports = mongoose.model('PGApplication', pgApplicationSchema);