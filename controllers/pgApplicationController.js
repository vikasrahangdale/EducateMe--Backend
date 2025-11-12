const PGApplication = require('../models/PGApplication');

// @desc    Get all PG applications
// @route   GET /api/pg-applications
// @access  Public
const getAllPGApplications = async (req, res) => {
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
          { state: { $regex: search, $options: 'i' } },
          { graduationStream: { $regex: search, $options: 'i' } }
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
    const applications = await PGApplication.find(searchQuery)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await PGApplication.countDocuments(searchQuery);

    res.json({
      success: true,
      applications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalApplications: total
    });
  } catch (error) {
    console.error('Error fetching PG applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching PG applications',
      error: error.message
    });
  }
};

// @desc    Get PG application by ID
// @route   GET /api/pg-applications/:id
// @access  Public
const getPGApplicationById = async (req, res) => {
  try {
    const application = await PGApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'PG Application not found'
      });
    }

    res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Error fetching PG application:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching PG application',
      error: error.message
    });
  }
};

// @desc    Create PG application (without payment - for admin)
// @route   POST /api/pg-applications
// @access  Public
const createPGApplication = async (req, res) => {
  try {
    const applicationData = req.body;

    // Check if application already exists
    const existingApplication = await PGApplication.findOne({
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

    const application = await PGApplication.create(applicationData);

    res.status(201).json({
      success: true,
      message: 'PG Application created successfully',
      application
    });
  } catch (error) {
    console.error('Error creating PG application:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating PG application',
      error: error.message
    });
  }
};

// @desc    Update PG application
// @route   PUT /api/pg-applications/:id
// @access  Public
const updatePGApplication = async (req, res) => {
  try {
    const application = await PGApplication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'PG Application not found'
      });
    }

    res.json({
      success: true,
      message: 'PG Application updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating PG application:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating PG application',
      error: error.message
    });
  }
};

// @desc    Delete PG application
// @route   DELETE /api/pg-applications/:id
// @access  Public
const deletePGApplication = async (req, res) => {
  try {
    const application = await PGApplication.findByIdAndDelete(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'PG Application not found'
      });
    }

    res.json({
      success: true,
      message: 'PG Application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting PG application:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting PG application',
      error: error.message
    });
  }
};

// @desc    Get PG applications statistics
// @route   GET /api/pg-applications/stats/overview
// @access  Public
const getPGApplicationsStats = async (req, res) => {
  try {
    const totalApplications = await PGApplication.countDocuments();
    const completedPayments = await PGApplication.countDocuments({ paymentStatus: 'completed' });
    const pendingPayments = await PGApplication.countDocuments({ paymentStatus: 'pending' });
    
    // Applications by graduation stream
    const graduationStreamStats = await PGApplication.aggregate([
      {
        $group: {
          _id: '$graduationStream',
          count: { $sum: 1 }
        }
      }
    ]);

    // Applications by state
    const stateStats = await PGApplication.aggregate([
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Applications by passing year
    const passingYearStats = await PGApplication.aggregate([
      {
        $group: {
          _id: '$passingYear',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Monthly applications
    const monthlyStats = await PGApplication.aggregate([
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
        graduationStreamStats,
        stateStats,
        passingYearStats,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Error fetching PG applications stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching PG applications statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllPGApplications,
  getPGApplicationById,
  createPGApplication,
  updatePGApplication,
  deletePGApplication,
  getPGApplicationsStats
};