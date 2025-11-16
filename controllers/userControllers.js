const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "30d",
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: "user"
    });

   const token = generateToken(user._id, user.role);


    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in user registration",
      error: error.message
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
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
      message: "Login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in login",
      error: error.message
    });
  }
};

// Logout User
const logoutUser = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logout successful"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in logout",
      error: error.message
    });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
      error: error.message
    });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        phone
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message
    });
  }
};

// Update Password
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating password",
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateProfile,
  updatePassword
};