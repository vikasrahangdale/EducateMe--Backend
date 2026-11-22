const IqArenaReminder = require('../models/IqArenaReminder');

const normalizeMobile = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

// Small in-memory limit so one visitor can't flood the list: 5 sign-ups per IP per hour.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();
const tooManyRequests = (ip) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
};

// POST /user/iq-arena/reminder  (public)
const createReminder = async (req, res) => {
  try {
    // Behind nginx, req.ip is the proxy's address. nginx appends the real visitor address as the
    // last entry of X-Forwarded-For (earlier entries can be faked by the visitor), so use that one.
    const ip = String(req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.ip;
    if (tooManyRequests(ip)) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }
    const name = String(req.body?.name || '').trim().replace(/\s+/g, ' ');
    const whatsapp = normalizeMobile(req.body?.whatsapp);

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ success: false, message: 'Please enter your name.' });
    }
    if (!/^[6-9]\d{9}$/.test(whatsapp)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit WhatsApp number.' });
    }

    await IqArenaReminder.findOneAndUpdate(
      { whatsapp },
      { $set: { name }, $inc: { signups: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
    return res.json({ success: true, message: "Done! We'll send you one reminder on WhatsApp before registration closes." });
  } catch (error) {
    console.error('IQ Arena reminder signup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not save your reminder. Please try again.' });
  }
};

// GET /user/iq-arena/reminders  (admin)
const getReminders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [items, total] = await Promise.all([
      IqArenaReminder.find({}).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      IqArenaReminder.countDocuments(),
    ]);
    return res.json({
      success: true,
      data: items,
      pagination: { currentPage: page, totalPages: Math.max(1, Math.ceil(total / limit)), totalItems: total },
    });
  } catch (error) {
    console.error('IQ Arena reminders list failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load reminders.' });
  }
};

module.exports = { createReminder, getReminders };
