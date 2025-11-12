const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateProfile,
  updatePassword
} = require('../controllers/userControllers'); // <-- correct name


const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

router.get('/getprofile', protect, getUserProfile);
router.put('/updateprofile', protect, updateProfile);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;