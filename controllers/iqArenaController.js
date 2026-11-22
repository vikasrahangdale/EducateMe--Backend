const crypto = require('crypto');
const mongoose = require('mongoose');
const razorpay = require('../utils/razorpay');
const sendMail = require('../utils/sendEmail');
const IqArenaRegistration = require('../models/IqArenaRegistration');
const { nextRegistrationNumber } = require('../models/IqArenaRegistration');
const { IQ_ARENA, getNotifyRecipients } = require('../config/iqArena');
const { studentConfirmationEmail, adminNotificationEmail } = require('../utils/iqArenaEmails');

// ─────────────────────────────────────────── helpers

const FORM_FIELDS = [
  'name', 'email', 'mobile', 'gender', 'city', 'state',
  'collegeYear', 'graduationYear', 'graduationStream', 'cgpa10', 'cgpa12',
  'mastersAim', 'mastersAimOther', 'entranceExam', 'entranceExamOther',
  'offlineEventAccepted', 'termsAccepted'
];

const EVENT_INFO = {
  eventName: IQ_ARENA.eventName,
  eventTitle: IQ_ARENA.eventTitle,
  eventDate: IQ_ARENA.eventDate,
  eventDateLabel: IQ_ARENA.eventDateLabel,
  mode: IQ_ARENA.mode,
  venue: IQ_ARENA.venue,
  region: IQ_ARENA.region,
  organizer: IQ_ARENA.organizer,
  collaborationPartner: IQ_ARENA.collaborationPartner,
  eventPartner: IQ_ARENA.eventPartner
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(String(id));

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toPublic = (doc) => {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete obj.razorpaySignature;
  delete obj.__v;
  return obj;
};

const normalizeMobile = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

const pickFormData = (body) => {
  const data = {};
  for (const key of FORM_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  for (const key of Object.keys(data)) {
    if (typeof data[key] === 'string') data[key] = data[key].trim();
  }
  if (data.email) data.email = data.email.toLowerCase();
  if (data.mobile !== undefined) data.mobile = normalizeMobile(data.mobile);
  for (const key of ['graduationYear', 'cgpa10', 'cgpa12']) {
    if (data[key] !== undefined && data[key] !== '') data[key] = Number(data[key]);
  }
  data.offlineEventAccepted = data.offlineEventAccepted === true || data.offlineEventAccepted === 'true';
  data.termsAccepted = data.termsAccepted === true || data.termsAccepted === 'true';
  if (data.mastersAim !== 'Other') data.mastersAimOther = undefined;
  if (data.entranceExam !== 'Other') data.entranceExamOther = undefined;
  return data;
};

const validationErrorResponse = (res, error) => {
  const errors = Object.values(error.errors || {}).map((e) => e.message);
  return res.status(400).json({
    success: false,
    message: errors[0] || 'Please check the form and try again',
    errors
  });
};

const safeCompare = (a, b) => {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const findCompletedDuplicate = (userId, email, mobile) =>
  IqArenaRegistration.findOne({
    paymentStatus: 'completed',
    $or: [{ userId }, { email }, { mobile }]
  });

const sendConfirmationEmails = async (reg) => {
  const student = studentConfirmationEmail(reg);
  const admin = adminNotificationEmail(reg);

  const [studentResult, adminResult] = await Promise.allSettled([
    sendMail(reg.email, student.subject, student.html),
    Promise.all(getNotifyRecipients().map((to) => sendMail(to, admin.subject, admin.html)))
  ]);

  if (studentResult.status === 'rejected') {
    console.error(`IQ Arena: student email failed for ${reg.registrationNumber}:`, studentResult.reason?.message);
  }
  if (adminResult.status === 'rejected') {
    console.error(`IQ Arena: admin email failed for ${reg.registrationNumber}:`, adminResult.reason?.message);
  }

  await IqArenaRegistration.updateOne(
    { _id: reg._id },
    {
      $set: {
        'emailStatus.student': studentResult.status === 'fulfilled',
        'emailStatus.admin': adminResult.status === 'fulfilled'
      }
    }
  );
};

/**
 * Atomically flips a registration to "completed". Shared by checkout confirmation and the webhook,
 * so whichever arrives first wins and emails are sent exactly once.
 */
const markRegistrationPaid = async ({ orderId, paymentId, signature, via, amountPaid }) => {
  const set = {
    paymentStatus: 'completed',
    paymentId,
    paidAt: new Date(),
    confirmedVia: via,
    amountPaid
  };
  if (signature) set.razorpaySignature = signature;

  const updated = await IqArenaRegistration.findOneAndUpdate(
    { orderId, paymentStatus: { $ne: 'completed' } },
    { $set: set },
    { new: true }
  );

  if (!updated) {
    const existing = await IqArenaRegistration.findOne({ orderId });
    return { registration: existing, newlyCompleted: false };
  }

  if (!updated.registrationNumber) {
    updated.registrationNumber = await nextRegistrationNumber();
    await updated.save({ validateBeforeSave: false });
  }

  sendConfirmationEmails(updated).catch((err) =>
    console.error('IQ Arena: email dispatch error:', err.message)
  );

  console.log(`✅ IQ Arena payment confirmed via ${via}: ${updated.registrationNumber} (${updated.email})`);
  return { registration: updated, newlyCompleted: true };
};

// ─────────────────────────────────────────── student endpoints

// GET /user/iq-arena/me
const getMyRegistration = async (req, res) => {
  try {
    const registration = await IqArenaRegistration.findOne({ userId: req.user._id })
      .sort({ paymentStatus: 1, updatedAt: -1 }); // "completed" sorts before "failed"/"pending"

    res.json({
      success: true,
      registration: toPublic(registration),
      event: EVENT_INFO,
      fees: {
        registrationFee: IQ_ARENA.registrationFee,
        platformCharge: IQ_ARENA.platformCharge,
        totalPayable: IQ_ARENA.totalPayable,
        testMode: IQ_ARENA.testMode
      }
    });
  } catch (error) {
    console.error('Error fetching IQ Arena registration:', error);
    res.status(500).json({ success: false, message: 'Error fetching your registration' });
  }
};

// POST /user/iq-arena/register
const createRegistration = async (req, res) => {
  try {
    const data = pickFormData(req.body);

    if (!data.offlineEventAccepted) {
      return res.status(400).json({ success: false, message: 'Please confirm that IQ Arena 2027 is an offline event' });
    }
    if (!data.termsAccepted) {
      return res.status(400).json({ success: false, message: 'Please accept the Terms and Conditions' });
    }

    // One registration per person: block if this user, email or mobile already has a paid entry.
    const duplicate = await findCompletedDuplicate(req.user._id, data.email, data.mobile);
    if (duplicate) {
      const isOwn = String(duplicate.userId) === String(req.user._id);
      return res.status(409).json({
        success: false,
        alreadyRegistered: isOwn,
        message: isOwn
          ? 'You are already registered for IQ Arena 2027'
          : 'This email or mobile number is already registered for IQ Arena 2027',
        registration: isOwn ? toPublic(duplicate) : undefined
      });
    }

    // Resume an unpaid registration instead of creating duplicates.
    let registration = await IqArenaRegistration.findOne({
      userId: req.user._id,
      paymentStatus: { $ne: 'completed' }
    });

    if (registration) {
      registration.set(data);
      registration.paymentStatus = 'pending';
      await registration.save();
    } else {
      registration = await IqArenaRegistration.create({ ...data, userId: req.user._id });
    }

    res.status(201).json({
      success: true,
      message: 'Registration saved. Please complete the payment to confirm your seat.',
      registration: toPublic(registration)
    });
  } catch (error) {
    if (error.name === 'ValidationError') return validationErrorResponse(res, error);
    console.error('Error creating IQ Arena registration:', error);
    res.status(500).json({ success: false, message: 'Error saving registration' });
  }
};

// POST /user/iq-arena/create-order
const createOrder = async (req, res) => {
  try {
    const { registrationId } = req.body;
    if (!isValidId(registrationId)) {
      return res.status(400).json({ success: false, message: 'Invalid registration ID' });
    }

    const registration = await IqArenaRegistration.findOne({ _id: registrationId, userId: req.user._id });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    if (registration.paymentStatus === 'completed') {
      return res.status(409).json({
        success: false,
        alreadyRegistered: true,
        message: 'Payment already completed for this registration',
        registration: toPublic(registration)
      });
    }

    const duplicate = await findCompletedDuplicate(req.user._id, registration.email, registration.mobile);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This email or mobile number is already registered for IQ Arena 2027'
      });
    }

    // Amount is decided on the server only.
    const registrationFee = IQ_ARENA.registrationFee;
    const platformCharge = IQ_ARENA.platformCharge;
    const payableAmount = registrationFee + platformCharge;

    const order = await razorpay.orders.create({
      amount: Math.round(payableAmount * 100),
      currency: IQ_ARENA.currency,
      receipt: `iqa27_${Date.now().toString(36)}_${String(registration._id).slice(-8)}`,
      notes: {
        purpose: IQ_ARENA.orderNotesPurpose,
        registrationId: String(registration._id),
        email: registration.email
      }
    });

    registration.orderId = order.id;
    registration.registrationFee = registrationFee;
    registration.platformCharge = platformCharge;
    registration.paymentStatus = 'pending';
    await registration.save();

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      registrationFee,
      platformCharge,
      payableAmount,
      order: { id: order.id, amount: order.amount, currency: order.currency },
      prefill: { name: registration.name, email: registration.email, contact: registration.mobile }
    });
  } catch (error) {
    console.error('Error creating IQ Arena Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Could not start payment. Please try again.' });
  }
};

// POST /user/iq-arena/confirm-payment
const confirmPayment = async (req, res) => {
  try {
    const { registrationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!isValidId(registrationId) || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification details' });
    }

    const registration = await IqArenaRegistration.findOne({ _id: registrationId, userId: req.user._id });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (registration.paymentStatus === 'completed') {
      return res.json({ success: true, registration: toPublic(registration), event: EVENT_INFO });
    }

    if (registration.orderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Order does not match this registration' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (!safeCompare(expected, razorpay_signature)) {
      console.warn(`IQ Arena: invalid payment signature for registration ${registrationId}`);
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const { registration: paid } = await markRegistrationPaid({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      via: 'checkout',
      amountPaid: registration.registrationFee + registration.platformCharge
    });

    res.json({ success: true, registration: toPublic(paid), event: EVENT_INFO });
  } catch (error) {
    console.error('Error confirming IQ Arena payment:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
};

// POST /user/iq-arena/webhook  (raw body, mounted in app.js before express.json)
const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('IQ Arena webhook: RAZORPAY_WEBHOOK_SECRET is not set');
      return res.status(500).json({ success: false });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    if (!signature || !safeCompare(expected, signature)) {
      console.warn('IQ Arena webhook: invalid signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const payment = event?.payload?.payment?.entity;
    const orderId = payment?.order_id;

    if (!payment || !orderId) {
      return res.json({ success: true, ignored: true });
    }

    // The account-wide webhook also receives EM-MAT payments; ignore anything that isn't ours.
    const registration = await IqArenaRegistration.findOne({ orderId });
    if (!registration) {
      return res.json({ success: true, ignored: true });
    }

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const expectedPaise = Math.round((registration.registrationFee + registration.platformCharge) * 100);
      if (payment.amount !== expectedPaise || payment.currency !== IQ_ARENA.currency) {
        console.error(
          `IQ Arena webhook: amount mismatch for order ${orderId}: got ${payment.amount} ${payment.currency}, expected ${expectedPaise}`
        );
        return res.json({ success: true, ignored: true });
      }

      await markRegistrationPaid({
        orderId,
        paymentId: payment.id,
        signature: null,
        via: 'webhook',
        amountPaid: payment.amount / 100
      });
    } else if (event.event === 'payment.failed') {
      await IqArenaRegistration.updateOne(
        { orderId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'failed' } }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('IQ Arena webhook error:', error);
    res.status(500).json({ success: false });
  }
};

// ─────────────────────────────────────────── admin endpoints

const buildAdminQuery = ({ search = '', paymentStatus = 'completed' }) => {
  const query = {};
  if (paymentStatus === 'completed') {
    query.paymentStatus = 'completed';
  } else if (paymentStatus === 'pending') {
    query.paymentStatus = { $in: ['pending', 'failed'] };
  }

  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    query.$or = [
      { name: rx }, { email: rx }, { mobile: rx }, { city: rx }, { state: rx },
      { registrationNumber: rx }, { graduationStream: rx }, { mastersAim: rx }, { entranceExam: rx }
    ];
  }
  return query;
};

// GET /user/iq-arena/all
const getAllRegistrations = async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const query = buildAdminQuery(req.query);

    const [registrations, total] = await Promise.all([
      IqArenaRegistration.find(query)
        .select('-razorpaySignature -__v')
        .sort({ paidAt: -1, registrationDate: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      IqArenaRegistration.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: registrations,
      pagination: {
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
        currentPage: pageNum,
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Error fetching IQ Arena registrations:', error);
    res.status(500).json({ success: false, message: 'Error fetching registrations' });
  }
};

// GET /user/iq-arena/stats
const getStats = async (_req, res) => {
  try {
    // Midnight in India (UTC+5:30), expressed as a UTC instant.
    const IST_OFFSET_MS = 330 * 60 * 1000;
    const nowInIST = new Date(Date.now() + IST_OFFSET_MS);
    nowInIST.setUTCHours(0, 0, 0, 0);
    const startOfTodayIST = new Date(nowInIST.getTime() - IST_OFFSET_MS);

    const [paid, pending, today, revenueAgg, byAim] = await Promise.all([
      IqArenaRegistration.countDocuments({ paymentStatus: 'completed' }),
      IqArenaRegistration.countDocuments({ paymentStatus: { $in: ['pending', 'failed'] } }),
      IqArenaRegistration.countDocuments({ paymentStatus: 'completed', paidAt: { $gte: startOfTodayIST } }),
      IqArenaRegistration.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      IqArenaRegistration.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: '$mastersAim', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        paid,
        pending,
        today,
        revenue: revenueAgg[0]?.total || 0,
        byMastersAim: byAim.map((a) => ({ aim: a._id, count: a.count }))
      }
    });
  } catch (error) {
    console.error('Error fetching IQ Arena stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
};

// GET /user/iq-arena/export  → CSV download
const exportRegistrations = async (req, res) => {
  try {
    const registrations = await IqArenaRegistration.find(buildAdminQuery(req.query))
      .sort({ paidAt: -1, registrationDate: -1 })
      .lean();

    const headers = [
      'Registration No', 'Name', 'Email', 'Mobile', 'Gender', 'City', 'State',
      'College Year', 'Graduation Year', 'Graduation Stream', '10th CGPA', '12th CGPA',
      "Master's Aim", 'Entrance Exam', 'Payment Status', 'Amount Paid', 'Payment ID', 'Order ID',
      'Confirmed Via', 'Paid At', 'Registered At'
    ];

    // Quote cells and neutralise spreadsheet formula injection.
    const cell = (v) => {
      let s = v === undefined || v === null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '');

    const rows = registrations.map((r) => [
      r.registrationNumber, r.name, r.email, r.mobile, r.gender, r.city, r.state,
      r.collegeYear, r.graduationYear, r.graduationStream, r.cgpa10, r.cgpa12,
      r.mastersAim === 'Other' ? `Other - ${r.mastersAimOther}` : r.mastersAim,
      r.entranceExam === 'Other' ? `Other - ${r.entranceExamOther}` : r.entranceExam,
      r.paymentStatus, r.amountPaid, r.paymentId, r.orderId, r.confirmedVia,
      fmt(r.paidAt), fmt(r.registrationDate)
    ].map(cell).join(','));

    const csv = '\uFEFF' + [headers.map(cell).join(','), ...rows].join('\r\n');
    const filename = `IQ_Arena_2027_${req.query.paymentStatus || 'completed'}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting IQ Arena registrations:', error);
    res.status(500).json({ success: false, message: 'Error exporting registrations' });
  }
};

// DELETE /user/iq-arena/:id
const deleteRegistration = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid registration ID' });
    }
    const deleted = await IqArenaRegistration.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    res.json({ success: true, message: 'Registration deleted successfully' });
  } catch (error) {
    console.error('Error deleting IQ Arena registration:', error);
    res.status(500).json({ success: false, message: 'Error deleting registration' });
  }
};

module.exports = {
  getMyRegistration,
  createRegistration,
  createOrder,
  confirmPayment,
  handleWebhook,
  getAllRegistrations,
  getStats,
  exportRegistrations,
  deleteRegistration
};
