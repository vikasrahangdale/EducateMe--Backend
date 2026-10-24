const express = require('express');
const router = express.Router();
const { 
  createAdsRegistration, 
  getAllAdsRegistrations, 
  deleteAdsRegistration 
} = require('../controllers/adsRegistrationController');

// Public route for registration
router.post('/register', createAdsRegistration);

// Admin routes
router.get('/all', getAllAdsRegistrations);
router.delete('/:id', deleteAdsRegistration);

module.exports = router;
