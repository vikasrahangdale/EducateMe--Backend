const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, "Name is required"],
      trim: true 
    },
    mobile: { 
      type: String, 
      required: [true, "Mobile number is required"],
      minlength: [10, "Mobile number must be at least 10 digits"]
    },
    email: { 
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    studentClass: { 
      type: String, 
      required: [true, "Student class is required"],
      trim: true 
    },
    interest: { 
      type: String,
      trim: true 
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
bookingSchema.index({ mobile: 1 });
bookingSchema.index({ email: 1 });
bookingSchema.index({ createdAt: -1 });

// Export with CommonJS
module.exports = mongoose.model("Booking", bookingSchema);
