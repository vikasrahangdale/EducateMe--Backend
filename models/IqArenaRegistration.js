const mongoose = require('mongoose');
const { IQ_ARENA, OPTIONS } = require('../config/iqArena');

const requiredIfOther = (field) =>
  function () {
    return this[field] === 'Other';
  };

const iqArenaRegistrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  registrationNumber: { type: String },

  // Personal
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit mobile number']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: { values: OPTIONS.gender, message: 'Invalid gender' }
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },

  // Academic
  collegeYear: {
    type: String,
    required: [true, 'College year is required'],
    enum: { values: OPTIONS.collegeYear, message: 'Invalid college year' }
  },
  graduationYear: {
    type: Number,
    required: [true, 'Graduation year is required'],
    min: [OPTIONS.minGraduationYear, 'Invalid graduation year'],
    max: [OPTIONS.maxGraduationYear, 'Graduation year must be 2027 or earlier']
  },
  graduationStream: {
    type: String,
    required: [true, 'Graduation stream is required'],
    trim: true
  },
  cgpa10: {
    type: Number,
    required: [true, '10th CGPA is required'],
    min: [0, '10th CGPA must be between 0 and 10'],
    max: [10, '10th CGPA must be between 0 and 10']
  },
  cgpa12: {
    type: Number,
    required: [true, '12th CGPA is required'],
    min: [0, '12th CGPA must be between 0 and 10'],
    max: [10, '12th CGPA must be between 0 and 10']
  },

  // Aspirations
  mastersAim: {
    type: String,
    required: [true, "Master's aim is required"],
    enum: { values: OPTIONS.mastersAim, message: "Invalid master's aim" }
  },
  mastersAimOther: {
    type: String,
    trim: true,
    required: [requiredIfOther('mastersAim'), "Please specify your master's aim"]
  },
  entranceExam: {
    type: String,
    required: [true, 'Entrance exam is required'],
    enum: { values: OPTIONS.entranceExam, message: 'Invalid entrance exam' }
  },
  entranceExamOther: {
    type: String,
    trim: true,
    required: [requiredIfOther('entranceExam'), 'Please specify your entrance exam']
  },

  // Declarations
  offlineEventAccepted: {
    type: Boolean,
    required: true,
    validate: { validator: (v) => v === true, message: 'You must confirm the event is offline' }
  },
  termsAccepted: {
    type: Boolean,
    required: true,
    validate: { validator: (v) => v === true, message: 'You must accept the Terms and Conditions' }
  },

  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  registrationFee: { type: Number, default: IQ_ARENA.registrationFee },
  platformCharge: { type: Number, default: IQ_ARENA.platformCharge },
  amountPaid: { type: Number },
  orderId: { type: String },
  paymentId: { type: String },
  razorpaySignature: { type: String },
  paidAt: { type: Date },
  confirmedVia: { type: String, enum: ['checkout', 'webhook'] },

  emailStatus: {
    student: { type: Boolean, default: false },
    admin: { type: Boolean, default: false }
  },

  registrationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

iqArenaRegistrationSchema.index({ userId: 1 });
iqArenaRegistrationSchema.index({ email: 1 });
iqArenaRegistrationSchema.index({ mobile: 1 });
iqArenaRegistrationSchema.index({ paymentStatus: 1 });
iqArenaRegistrationSchema.index({ orderId: 1 });
iqArenaRegistrationSchema.index({ registrationDate: -1 });
iqArenaRegistrationSchema.index({ registrationNumber: 1 }, { unique: true, sparse: true });

// Atomic counter so registration numbers are sequential and never collide.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const IqArenaCounter = mongoose.model('IqArenaCounter', counterSchema);

const nextRegistrationNumber = async () => {
  const counter = await IqArenaCounter.findOneAndUpdate(
    { _id: IQ_ARENA.orderNotesPurpose },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${IQ_ARENA.registrationPrefix}-${String(counter.seq).padStart(5, '0')}`;
};

const IqArenaRegistration = mongoose.model('IqArenaRegistration', iqArenaRegistrationSchema);

module.exports = IqArenaRegistration;
module.exports.nextRegistrationNumber = nextRegistrationNumber;
