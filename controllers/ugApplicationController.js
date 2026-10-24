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

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Cap at 100

    // Execute query with pagination (optimize with lean() for read-only operations)
    const applications = await UGApplication.find(searchQuery)
      .sort(sortOptions)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()
      .exec();

    // Get total count for pagination (use countDocuments for better performance)
    const total = await UGApplication.countDocuments(searchQuery);

    res.json({
      success: true,
      applications,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
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
    // Validate ID format
    if (!req.params.id || !/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format'
      });
    }

    const application = await UGApplication.findById(req.params.id).lean();

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
    // Whitelist allowed UG fields and prevent accidental PG-only fields
    const allowedFields = [
      'name','email','mobile','city','state','class','stream','grade10','grade12','examDate','paymentStatus','paymentId','orderId','applicationDate'
    ];

    // If request contains PG-only fields, reject (prevents PG data being saved via UG endpoint)
    const pgOnlyFields = ['graduationScore','graduationStream','passingYear'];
    const presentPgFields = pgOnlyFields.filter(f => req.body[f] !== undefined);
    if (presentPgFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid fields for UG application',
        invalidFields: presentPgFields
      });
    }

    const applicationData = {};
    for (const k of allowedFields) {
      if (req.body[k] !== undefined) applicationData[k] = req.body[k];
    }

    // Normalize examDate to YYYY-MM-DD when possible
    if (applicationData.examDate) {
      const parsed = new Date(applicationData.examDate);
      if (!isNaN(parsed)) {
        applicationData.examDate = parsed.toISOString().split('T')[0];
      } else {
        return res.status(400).json({ success: false, message: 'Invalid examDate format' });
      }
    }

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

const downloadUGApplicationsPDF = async (req, res) => {
  try {
    const {
      search = '',
      paymentStatus = '',
      startDate = '',
      endDate = ''
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

    // Filter by date range
    if (startDate || endDate) {
      searchQuery.applicationDate = {};
      if (startDate) {
        searchQuery.applicationDate.$gte = new Date(startDate);
      }
      if (endDate) {
        searchQuery.applicationDate.$lte = new Date(endDate);
      }
    }

    const applications = await UGApplication.find(searchQuery)
      .sort({ applicationDate: -1 })
      .lean()
      .exec();

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No UG applications found matching the criteria'
      });
    }

    // Generate PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=UG_Applications_${new Date().toISOString().split('T')[0]}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).font('Helvetica-Bold').text('UG Applications Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Total Applications: ${applications.length}`, { align: 'center' });
    doc.moveDown(2);

    // Add applications data
    applications.forEach((app, index) => {
      // Application header
      doc.fontSize(14).font('Helvetica-Bold').text(`Application #${index + 1}`, { underline: true });
      doc.moveDown(0.5);

      // Personal details
      doc.fontSize(10).font('Helvetica-Bold').text('Personal Information:');
      doc.font('Helvetica').text(`Name: ${app.name}`);
      doc.text(`Email: ${app.email}`);
      doc.text(`Mobile: ${app.mobile}`);
      doc.text(`City: ${app.city}, ${app.state}`);
      doc.moveDown();

      // Academic details
      doc.font('Helvetica-Bold').text('Academic Information:');
      doc.font('Helvetica').text(`Class: ${app.class}`);
      doc.text(`Stream: ${app.stream}`);
      doc.text(`10th Grade: ${app.grade10}%`);
      doc.text(`12th Grade: ${app.grade12}%`);
      doc.moveDown();

      // Exam details
      doc.font('Helvetica-Bold').text('Exam Details:');
      doc.font('Helvetica').text(`Exam Date: ${app.examDate}`);
      doc.text(`Application Date: ${new Date(app.applicationDate).toLocaleDateString()}`);
      doc.moveDown();

      // Payment details
      doc.font('Helvetica-Bold').text('Payment Information:');
      doc.font('Helvetica').text(`Status: ${app.paymentStatus}`);
      if (app.paymentId) doc.text(`Payment ID: ${app.paymentId}`);
      if (app.orderId) doc.text(`Order ID: ${app.orderId}`);
      doc.moveDown();

      // Separator line
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();
    });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Error generating UG applications PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
};

const getUGApplicationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the user to get their email
    const User = require('../models/userModel');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find applications matching the user's email
    const applications = await UGApplication.find({ email: user.email }).lean();

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Error fetching user UG applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user UG applications',
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
  downloadUGApplicationsPDF,
  ugApplicationEmailTemplate,
  getUGApplicationsByUserId
};