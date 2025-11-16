const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String },
    studentClass: { type: String, required: true },
    interest: { type: String },
  },
  { timestamps: true }
);

// Export with CommonJS
module.exports = mongoose.model("Booking", bookingSchema);
