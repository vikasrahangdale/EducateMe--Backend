const express = require("express");
const router = express.Router();

const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
} = require("../controllers/adminController");

const { protect, adminMiddleware } = require("../middleware/authMiddleware");


router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

router.get("/profile", protect, adminMiddleware, getAdminProfile);

module.exports = router;
