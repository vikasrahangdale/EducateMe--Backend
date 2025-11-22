const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendEmail");



const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "30d",
  });
};


const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Required fields check
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user first
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: "user",
    });

    const token = generateToken(user._id, user.role);

    // ============================
    //  CUSTOM EMAIL TEMPLATE HERE
    // ============================

    const htmlTemplate = `
      <p>Dear <b>${name}</b>,</p>

      <p>Greetings from <b>Educate Me!</b></p>

      <p>We’re delighted to inform you that your account has been successfully created on the 
      <b>Educate Me Portal</b>. You can now log in and access your dashboard, learning materials,
      and updates related to your EM-MAT journey.</p>

      <h3>🔐 Login Details</h3>
      <ul>
        <li><b>Registered Email:</b> ${email}</li>
        <li><b>Account Status:</b> Active</li>
        <li><b>Login Link:</b> <a href="https://www.educate-me.in/login">Click here to Login</a></li>
      </ul>

      <h3>📌 What You Can Do Next:</h3>
      <ol>
        <li>Access your dashboard and update your profile details.</li>
        <li>Check your exam updates and important announcements.</li>
        <li>Download EM-MAT preparation materials.</li>
        <li>Stay connected with upcoming notifications and alerts.</li>
      </ol>

      <p>We're excited to have you on board and wish you the very best for your 
      academic journey ahead! Should you need any assistance, feel free to reach out.</p>

      <p>
      Warm regards,<br>
      <b>Team Educate Me</b><br>
      📩 admissions@educate-me.in |
      🌐 <a href="https://www.educate-me.in">www.educate-me.in</a>
      </p>
    `;

    // Try sending welcome email
    try {
      await sendMail(
        email,
        "Welcome to Educate Me – Your Account is Created!",
        htmlTemplate
      );
    } catch (err) {
      console.log("Email sending failed:", err.message);
    }

    // Success Response
    res.status(201).json({
      success: true,
      message: "User registered successfully & Welcome email sent!",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in user registration",
      error: error.message,
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