const express = require('express');
const {
  getMyRegistration,
  createRegistration,
  createOrder,
  confirmPayment,
  getAllRegistrations,
  getStats,
  exportRegistrations,
  deleteRegistration
} = require('../controllers/iqArenaController');
const { createReminder, getReminders } = require('../controllers/iqArenaReminderController');
const { protect, adminMiddleware } = require('../middleware/authMiddleware');

// Note: POST /user/iq-arena/webhook is mounted directly in app.js because it needs the raw body.

const router = express.Router();

// Student (logged-in user)
router.get('/me', protect, getMyRegistration);
router.post('/register', protect, createRegistration);
router.post('/create-order', protect, createOrder);
router.post('/confirm-payment', protect, confirmPayment);
// Public: "Not ready yet? Remind me on WhatsApp"
router.post('/reminder', createReminder);

// Admin
router.get('/all', protect, adminMiddleware, getAllRegistrations);
router.get('/stats', protect, adminMiddleware, getStats);
router.get('/export', protect, adminMiddleware, exportRegistrations);
router.get('/reminders', protect, adminMiddleware, getReminders);
router.delete('/:id', protect, adminMiddleware, deleteRegistration);

module.exports = router;
