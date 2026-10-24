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

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Cap at 100

    // Execute query with pagination (optimize with lean() for read-only operations)
    const applications = await PGApplication.find(searchQuery)
      .sort(sortOptions)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean()
      .exec();

    // Get total count for pagination (use countDocuments for better performance)
    const total = await PGApplication.countDocuments(searchQuery);

    res.json({
      success: true,
      applications,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
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
    // Validate ID format
    if (!req.params.id || !/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format'
      });
    }

    const application = await PGApplication.findById(req.params.id).lean();

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
    // Whitelist allowed PG fields and validate required PG-specific fields
    const allowedFields = [
      'name','email','mobile','city','state','class','stream','grade10','grade12','graduationScore','graduationStream','passingYear','examDate','paymentStatus','paymentId','orderId','applicationDate'
    ];

    const applicationData = {};
    for (const k of allowedFields) {
      if (req.body[k] !== undefined) applicationData[k] = req.body[k];
    }

    // Validate presence of PG-required fields
    const missing = [];
    ['graduationScore','graduationStream','passingYear','examDate'].forEach(f => {
      if (!applicationData[f]) missing.push(f);
    });
    if (missing.length > 0) {
      return res.status(400).json({ success: false, message: 'Missing required PG fields', missing });
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




const downloadPGApplicationsPDF = async (req, res) => {
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

    const applications = await PGApplication.find(searchQuery)
      .sort({ applicationDate: -1 })
      .lean()
      .exec();

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No PG applications found matching the criteria'
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
    res.setHeader('Content-Disposition', `attachment; filename=PG_Applications_${new Date().toISOString().split('T')[0]}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).font('Helvetica-Bold').text('PG Applications Report', { align: 'center' });
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
      doc.text(`Graduation Score: ${app.graduationScore}%`);
      doc.text(`Graduation Stream: ${app.graduationStream}`);
      doc.text(`Passing Year: ${app.passingYear}`);
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
    console.error('Error generating PG applications PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
};




const getPGApplicationsByUserId = async (req, res) => {
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
    const applications = await PGApplication.find({ email: user.email }).lean();

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Error fetching user PG applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user PG applications',
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
  getPGApplicationsStats,
  downloadPGApplicationsPDF,
  getPGApplicationsByUserId
};