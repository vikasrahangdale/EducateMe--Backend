const express = require("express");
const { createBooking, getAllBookings, deleteBooking, updateBooking } = require("../controllers/bookingController");
const { protect, adminMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// POST → Save new booking
router.post("/create", createBooking);

// GET → Admin Dashboard (Fetch All)
router.get("/allbooking", protect, adminMiddleware, getAllBookings);

// PUT → Update booking by ID (Admin only)
router.put("/:id", protect, adminMiddleware, updateBooking);

// DELETE → Delete booking by ID (Admin only)
router.delete("/:id", protect, adminMiddleware, deleteBooking);

module.exports = router;
