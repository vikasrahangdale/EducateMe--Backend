const express = require("express");
const { createBooking, getAllBookings } = require("../controllers/bookingController");

const router = express.Router();

// POST → Save new booking
router.post("/create", createBooking);

// GET → Admin Dashboard (Fetch All)
router.get("/allbooking", getAllBookings);

module.exports = router;
