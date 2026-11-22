const mongoose = require('mongoose');

// "Not ready yet? Remind me on WhatsApp" sign-ups from the IQ Arena page.
// One record per WhatsApp number; signing up again just updates the name.
const iqArenaReminderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name is too short'],
      maxlength: [80, 'Name is too long'],
    },
    whatsapp: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
    },
    signups: { type: Number, default: 1 },
  },
  { timestamps: true }
);

iqArenaReminderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('IqArenaReminder', iqArenaReminderSchema);
