const AdsRegistration = require("../models/AdsRegistration");

// CREATE ADS REGISTRATION
const createAdsRegistration = async (req, res) => {
  try {
    const { name, phone, city, email, examPreparing, lookingFor } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!phone) missingFields.push('phone');
    if (!city) missingFields.push('city');
    if (!email) missingFields.push('email');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: "Required fields missing",
        missingFields 
      });
    }

    const newRegistration = await AdsRegistration.create({
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      email: email.trim().toLowerCase(),
      examPreparing: examPreparing ? examPreparing.trim() : undefined,
      lookingFor: lookingFor ? lookingFor.trim() : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: newRegistration,
    });

  } catch (error) {
    console.error('Error creating ads registration:', error);
    res.status(500).json({ 
      success: false,
      message: "Error creating registration",
      error: error.message 
    });
  }
};

// GET ALL ADS REGISTRATIONS
const getAllAdsRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const registrations = await AdsRegistration.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()
      .exec();

    const total = await AdsRegistration.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: registrations,
      pagination: {
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching registrations',
      error: error.message 
    });
  }
};

// DELETE ADS REGISTRATION
const deleteAdsRegistration = async (req, res) => {
  try {
    const registration = await AdsRegistration.findByIdAndDelete(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      message: 'Registration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting registration',
      error: error.message
    });
  }
};

module.exports = {
  createAdsRegistration,
  getAllAdsRegistrations,
  deleteAdsRegistration
};
