// IQ Arena 2027 — single source of truth for fees, event details and form options.
// The payable amount is ALWAYS computed here on the server; the client never sends it.

// TEST MODE: set IQ_ARENA_TEST_AMOUNT=1 in .env to charge ₹1 instead of ₹159.
// Remove the variable (and restart) to go back to real pricing. Never set it in production.
const TEST_AMOUNT = Number(process.env.IQ_ARENA_TEST_AMOUNT);
const TEST_MODE = Number.isFinite(TEST_AMOUNT) && TEST_AMOUNT >= 1; // Razorpay minimum is ₹1

const REGISTRATION_FEE = TEST_MODE ? TEST_AMOUNT : 149; // ₹
const PLATFORM_CHARGE = TEST_MODE ? 0 : 10;             // ₹
const TOTAL_PAYABLE = REGISTRATION_FEE + PLATFORM_CHARGE; // ₹159 in normal mode

if (TEST_MODE) {
  console.warn(
    `⚠️  IQ Arena TEST MODE: charging ₹${TOTAL_PAYABLE} instead of ₹159. ` +
    'Remove IQ_ARENA_TEST_AMOUNT from .env before going live.'
  );
}

const IQ_ARENA = {
  eventName: 'IQ Arena 2027',
  eventTitle: 'IQ Arena 2027 — Quiz Championship',
  tagline: 'Think Big. Play Smart. Own the Future.',

  registrationFee: REGISTRATION_FEE,
  platformCharge: PLATFORM_CHARGE,
  totalPayable: TOTAL_PAYABLE,
  testMode: TEST_MODE,
  currency: 'INR',

  eventDate: '2027-01-23',
  eventDateLabel: 'Saturday, 23 January 2027',
  mode: 'Offline',
  venue: 'Sparsh Business School, Noida',
  region: 'Delhi NCR',

  organizer: 'Educate Me',
  collaborationPartner: 'Career Critics', // shown as "In association with"
  eventPartner: 'Sparsh Business School',

  contactEmail: 'admissions@educate-me.in',
  contactPhone: '7974163158',
  website: 'www.educate-me.in',

  registrationPrefix: 'IQA27',
  orderNotesPurpose: 'iq-arena-2027',
};

const OPTIONS = {
  collegeYear: ['Final Year', 'Graduate'],
  mastersAim: ['MBA', 'MCA', 'M.Tech', 'MSc', 'LLM', 'Other'],
  entranceExam: ['CAT', 'XAT', 'MAT', 'CMAT', 'MHT-CET', 'NMAT', 'GATE', 'Other'],
  gender: ['Male', 'Female', 'Other', 'Prefer not to say'],
  maxGraduationYear: 2027,
  minGraduationYear: 2000,
};

// Comma-separated list of Educate Me team inboxes that get "new registration" alerts.
const getNotifyRecipients = () =>
  (process.env.IQ_ARENA_NOTIFY_EMAIL || IQ_ARENA.contactEmail)
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

module.exports = { IQ_ARENA, OPTIONS, getNotifyRecipients };
