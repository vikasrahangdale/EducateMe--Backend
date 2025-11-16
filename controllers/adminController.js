const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

// Generate Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "SECRET_KEY",
    { expiresIn: "30d" }
  );
};

// Admin Register
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, secretKey } = req.body;

    if (secretKey !== "EDUCATEME-ADMIN-2024") {
      return res.status(401).json({
        success: false,
        message: "Invalid Admin Secret Key",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: "admin",
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        id: user._id,
        name,
        email,
        phone,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in admin registration",
      error: error.message,
    });
  }
};

// Admin Login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });

    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied! Not an admin",
      });
    }

    const validPass = await user.comparePassword(password);
    if (!validPass)
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Admin login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in admin login",
      error: error.message,
    });
  }
};

// ---------------------- GET ADMIN PROFILE ----------------------
const getAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select("-password");

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching admin profile",
      error: error.message
    });
  }
};

module.exports = { registerAdmin, loginAdmin, getAdminProfile };
