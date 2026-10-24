const Booking = require("../models/Booking");

// CREATE BOOKING
const createBooking = async (req, res) => {
  try {
    const { name, mobile, email, studentClass, interest } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!mobile) missingFields.push('mobile');
    if (!studentClass) missingFields.push('studentClass');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: "Required fields missing",
        missingFields 
      });
    }

    // Validate mobile number format
    if (mobile.length < 10 || mobile.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be between 10 and 15 digits"
      });
    }

    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    const newBooking = await Booking.create({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      studentClass: studentClass.trim(),
      interest: interest ? interest.trim() : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: newBooking,
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false,
      message: "Error creating booking",
      error: error.message 
    });
  }
};

// GET ALL BOOKINGS
const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50)); // Cap at 100

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
          { studentClass: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Execute query with pagination
    const bookings = await Booking.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()
      .exec();

    const total = await Booking.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      bookings,
      pagination: {
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        totalBookings: total
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching bookings',
      error: error.message 
    });
  }
};

// DELETE BOOKING
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findByIdAndDelete(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting booking",
      error: error.message
    });
  }
};

// UPDATE BOOKING
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, studentClass, interest } = req.body;

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { name, mobile, email, studentClass, interest },
      { new: true, runValidators: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      data: updatedBooking
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({
      success: false,
      message: "Error updating booking",
      error: error.message
    });
  }
};

// Export functions
module.exports = {
  createBooking,
  getAllBookings,
  deleteBooking,
  updateBooking,
};
