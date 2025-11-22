const PGApplication = require('../models/PGApplication');
const sendMail = require("../utils/sendEmail");


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
          { graduationStream: { $regex: search, $options: 'i' } },
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


const pgApplicationEmailTemplate = (data) => `
  <p>Dear <b>${data.name}</b>,</p>

  <p>Greetings from <b>Educate Me!</b></p>

  <p>We’re pleased to inform you that your application for the <b>EM-MAT Exam</b> 
  has been successfully received and your payment of <b>₹500</b> has been confirmed.</p>

  <h3>📌 Applicant Details</h3>
  <ul>
    <li><b>Name:</b> ${data.name}</li>
    <li><b>Email:</b> ${data.email}</li>
    <li><b>Mobile:</b> ${data.mobile}</li>
    <li><b>City:</b> ${data.city || "Not Provided"}</li>
    <li><b>State:</b> ${data.state || "Not Provided"}</li>
    <li><b>Graduation Stream:</b> ${data.graduationStream}</li>
    <li><b>Application Date:</b> ${new Date().toLocaleDateString()}</li>
  </ul>

  <h3>📝 Exam Details</h3>
  <ul>
    <li><b>Exam Name:</b> EM-MAT (Educate Me Management Aptitude Test)</li>
    <li><b>Application Status:</b> Confirmed</li>
    <li><b>Exam Date:</b> ${data.examDate || "(Date as chosen by student)"}</li>
    <li><b>Mode of Exam:</b> Take from Home (CBT)</li>
    <li><b>Exam Duration:</b> 90 Minutes (PG)</li>
    <li><b>Exam Hours:</b> 11:00 AM – 5:00 PM</li>
  </ul>

  <h3>💳 Payment Details</h3>
  <ul>
    <li><b>Amount Paid:</b> ₹500</li>
    <li><b>Transaction ID:</b> ${data.transactionId || "(Not Provided)"}</li>
    <li><b>Payment Date:</b> ${data.paymentDate || new Date().toLocaleDateString()}</li>
  </ul>

  <h3>📍 Next Steps</h3>
  <ol>
    <li>Please check your registered email regularly for further updates.</li>
    <li>Course Prep Material has already been sent to you.</li>
    <li>Keep your application number and payment receipt safe for future reference.</li>
    <li>Prepare well — we wish you the very best for your upcoming EM-MAT Exam!</li>
  </ol>

  <p>If you have any questions or need assistance, feel free to contact us:</p>
  <p>
    📩 <b>admissions@educate-me.in</b><br>
    ☎️ 7974163158
  </p>

  <p>
    Thank you for choosing <b>Educate Me</b>.<br>
    We look forward to seeing you excel in your academic journey ahead.
  </p>

  <p>
    Warm regards,<br>
    <b>Team Educate Me</b><br>
    📩 admissions@educate-me.in | 🌐 www.educate-me.in
  </p>
`;


const createPGApplication = async (req, res) => {
  try {
    const applicationData = req.body;

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

    // ❗ Only save application (no email)
    const application = await PGApplication.create(applicationData);

    res.status(201).json({
      success: true,
      message: 'PG Application created successfully (payment pending)',
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



const updatePGApplication = async (req, res) => {
  try {
    // Existing before update
    const oldApplication = await PGApplication.findById(req.params.id);

    if (!oldApplication) {
      return res.status(404).json({
        success: false,
        message: 'PG Application not found'
      });
    }

    // Update application
    const application = await PGApplication.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // ✔ Send email only when payment changes from pending → completed
    if (
      req.body.paymentStatus === "completed" &&
      oldApplication.paymentStatus !== "completed"
    ) {
      try {
        const html = pgApplicationEmailTemplate(application);

        await sendMail(
          application.email,
          "Your PG EM-MAT Application Payment is Confirmed!",
          html
        );

        console.log("Payment confirmation email sent!");
      } catch (emailErr) {
        console.log("Email sending failed:", emailErr.message);
      }
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