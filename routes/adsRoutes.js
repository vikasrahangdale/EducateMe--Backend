const express = require('express');
const router = express.Router();
const { 
  createAdsRegistration, 
  getAllAdsRegistrations, 
  deleteAdsRegistration 
} = require('../controllers/adsRegistrationController');
const { protect, adminMiddleware } = require('../middleware/authMiddleware');

// Public route for registration
router.post('/register', createAdsRegistration);

// Admin routes: leads contain names, phones and emails, so an admin login is required
router.get('/all', protect, adminMiddleware, getAllAdsRegistrations);
router.delete('/:id', protect, adminMiddleware, deleteAdsRegistration);

module.exports = router;
