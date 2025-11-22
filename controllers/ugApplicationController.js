const UGApplication = require('../models/UGApplication');
const sendMail = require("../utils/sendEmail");


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
          { state: { $regex: search, $options: 'i' } },
          { examDate: { $regex: search, $options: 'i' } }

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


const ugApplicationEmailTemplate = (data) => `
  <p>Dear <b>${data.name}</b>,</p>

  <p>Greetings from <b>Educate Me!</b></p>

  <p>We’re pleased to inform you that your application for the 
  <b>EM-MAT Exam</b> has been successfully received and your payment of 
  <b>₹500</b> has been confirmed.</p>

  <h3>📌 Exam & Application Details</h3>
  <ul>
    <li><b>Exam Name:</b> EM-MAT (Educate Me Management Aptitude Test)</li>
    <li><b>Application Status:</b> Confirmed</li>
    <li><b>Exam Date:</b> ${data.examDate || "(Chosen by Student)"}</li>
    <li><b>Mode of Exam:</b> Take from Home (CBT)</li>
    <li><b>Exam Duration:</b> 60 minutes (UG)</li>
    <li><b>Exam Hours:</b> 11:00 AM – 5:00 PM</li>
  </ul>

  <h3>🧾 Payment Details</h3>
  <ul>
    <li><b>Amount Paid:</b> ₹500</li>
    <li><b>Transaction ID:</b> ${data.transactionId || "Not Provided"}</li>
    <li><b>Payment Status:</b> ${data.paymentStatus}</li>
    <li><b>Payment Date:</b> ${new Date().toLocaleDateString()}</li>
  </ul>

  <h3>👤 Personal Details</h3>
  <ul>
    <li><b>Name:</b> ${data.name}</li>
    <li><b>Email:</b> ${data.email}</li>
    <li><b>Mobile:</b> ${data.mobile}</li>
    <li><b>City:</b> ${data.city || "Not Provided"}</li>
    <li><b>State:</b> ${data.state || "Not Provided"}</li>
    <li><b>Stream:</b> ${data.stream}</li>
  </ul>

  <h3>📍 Next Steps</h3>
  <ol>
    <li>Please check your registered email regularly for further updates.</li>
    <li>Course Prep Material has already been sent to you.</li>
    <li>Keep your application number and payment receipt safe for future reference.</li>
    <li>Prepare well — we wish you the very best for your upcoming EM-MAT Exam!</li>
  </ol>

  <p>
    If you have any questions or need assistance, feel free to contact us at<br>
    📩 <b>admissions@educate-me.in</b> or call 📞 <b>7974163158</b>.
  </p>

  <p>
    Thank you for choosing <b>Educate Me</b>.<br>
    We look forward to seeing you excel in your academic journey ahead!
  </p>

  <p>
    Warm regards,<br>
    <b>Team Educate Me</b><br>
    📩 admissions@educate-me.in |
    🌐 <a href="https://www.educate-me.in" target="_blank">www.educate-me.in</a>
  </p>
`;

const createUGApplication = async (req, res) => {
  try {
    const applicationData = req.body;

    // Check existing user
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

    // Create new UG application
    const application = await UGApplication.create(applicationData);

    res.status(201).json({
      success: true,
      message: 'UG Application created successfully (Email will be sent after payment confirmation)',
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


const updateUGApplication = async (req, res) => {
  try {
    const oldApplication = await UGApplication.findById(req.params.id);

    if (!oldApplication) {
      return res.status(404).json({
        success: false,
        message: 'UG Application not found'
      });
    }

    const application = await UGApplication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // 🚨 Send Email ONLY when payment changes from pending → completed
    if (
      oldApplication.paymentStatus !== "completed" &&
      application.paymentStatus === "completed"
    ) {
      try {
        const html = ugApplicationEmailTemplate(application);

        await sendMail(
          application.email,
          "Your UG EM-MAT Application Payment is Confirmed!",
          html
        );

        console.log("UG payment confirmation email sent successfully");
      } catch (emailErr) {
        console.log("Email sending failed:", emailErr.message);
      }
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
  getUGApplicationsStats,
  ugApplicationEmailTemplate
};