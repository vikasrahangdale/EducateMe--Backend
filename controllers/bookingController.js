const Booking = require("../models/Booking");

// CREATE BOOKING
const createBooking = async (req, res) => {
  try {
    const { name, mobile, email, studentClass, interest } = req.body;

    if (!name || !mobile || !studentClass) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const newBooking = await Booking.create({
      name,
      mobile,
      email,
      studentClass,
      interest,
    });

    res.status(201).json({
      message: "Booking created successfully",
      data: newBooking,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL BOOKINGS
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export functions
module.exports = {
  createBooking,
  getAllBookings,
};
