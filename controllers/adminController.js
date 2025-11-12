const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "30d",
  });
};

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered with another account"
      });
    }

    const admin = await User.create({
      name,
      email,
      password,
      phone,
      role: "admin"
    });

    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in admin registration",
      error: error.message
    });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.role !== "admin") {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials"
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Admin login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in admin login",
      error: error.message
    });
  }
};

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
