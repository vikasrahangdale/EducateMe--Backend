const express = require("express");
const router = express.Router();

const {
  loginAdmin,
  getAdminProfile,
} = require("../controllers/adminController");

const { protect, adminMiddleware } = require("../middleware/authMiddleware");


// Admin self-registration is turned off: its secret key was public (website code and GitHub).
// New admins are added directly in the database by the developer.
router.post("/register", (_req, res) =>
  res.status(403).json({ success: false, message: "Admin registration is disabled" })
);
router.post("/login", loginAdmin);

router.get("/profile", protect, adminMiddleware, getAdminProfile);

module.exports = router;
