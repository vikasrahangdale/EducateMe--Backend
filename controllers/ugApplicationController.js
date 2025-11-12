const UGApplication = require('../models/UGApplication');

// @desc    Get all UG applications
// @route   GET /api/ug-applications
// @access  Public
const getAllUGApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'applicationDate',
      sortOrder = 'desc',
      paymentStatus = ''
    } = req.query;

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
          { city: { $regex: search, $options: 'i' } },
          { state: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Filter by payment status
    if (paymentStatus) {
      searchQuery.paymentStatus = paymentStatus;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const applications = await UGApplication.find(searchQuery)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await UGApplication.countDocuments(searchQuery);

    res.json({
      success: true,
      applications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalApplications: total
    });
  } catch (error) {
    console.error('Error fetching UG applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching UG applications',
      error: error.message
    });
  }
};

// @desc    Get UG application by ID
// @route   GET /api/ug-applications/:id
// @access  Public
const getUGApplicationById = async (req, res) => {
  try {
    const application = await UGApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'UG Application not found'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Error fetching UG application:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching UG application',
      error: error.message
    });
  }
};

// @desc    Create UG application (without payment - for admin)
// @route   POST /api/ug-applications
// @access  Public
const createUGApplication = async (req, res) => {
  try {
    const applicationData = req.body;

    // Check if application already exists
    const existingApplication = await UGApplication.findOne({
      $or: [
        { email: applicationData.email },
        { mobile: applicationData.mobile }
      ]
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'Application already exists with this email or mobile number'
      });
    }

    const application = await UGApplication.create(applicationData);

    res.status(201).json({
      success: true,
      message: 'UG Application created successfully',
      application
    });
  } catch (error) {
    console.error('Error creating UG application:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating UG application',
      error: error.message
    });
  }
};

// @desc    Update UG application
// @route   PUT /api/ug-applications/:id
// @access  Public
const updateUGApplication = async (req, res) => {
  try {
    const application = await UGApplication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'UG Application not found'
      });
    }

    res.json({
      success: true,
      message: 'UG Application updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating UG application:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating UG application',
      error: error.message
    });
  }
};

// @desc    Delete UG application
// @route   DELETE /api/ug-applications/:id
// @access  Public
const deleteUGApplication = async (req, res) => {
  try {
    const application = await UGApplication.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'UG Application not found'
      });
    }

    res.json({
      success: true,
      message: 'UG Application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting UG application:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting UG application',
      error: error.message
    });
  }
};

// @desc    Get UG applications statistics
// @route   GET /api/ug-applications/stats/overview
// @access  Public
const getUGApplicationsStats = async (req, res) => {
  try {
    const totalApplications = await UGApplication.countDocuments();
    const completedPayments = await UGApplication.countDocuments({ paymentStatus: 'completed' });
    const pendingPayments = await UGApplication.countDocuments({ paymentStatus: 'pending' });
    
    // Applications by stream
    const streamStats = await UGApplication.aggregate([
      {
        $group: {
          _id: '$stream',
          count: { $sum: 1 }
        }
      }
    ]);

    // Applications by state
    const stateStats = await UGApplication.aggregate([
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Monthly applications
    const monthlyStats = await UGApplication.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$applicationDate' },
            month: { $month: '$applicationDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      stats: {
        totalApplications,
        completedPayments,
        pendingPayments,
        streamStats,
        stateStats,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Error fetching UG applications stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching UG applications statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllUGApplications,
  getUGApplicationById,
  createUGApplication,
  updateUGApplication,
  deleteUGApplication,
  getUGApplicationsStats
};