const { IQ_ARENA } = require('../config/iqArena');

// Escape user-supplied values before interpolating them into HTML.
const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (date) =>
  new Date(date || Date.now()).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  });

// Marks emails sent while IQ_ARENA_TEST_AMOUNT is set, so test registrations are easy to spot.
const testTag = () => (IQ_ARENA.testMode ? '[TEST] ' : '');

const aimLabel = (r) => (r.mastersAim === 'Other' ? `Other — ${r.mastersAimOther}` : r.mastersAim);
const examLabel = (r) => (r.entranceExam === 'Other' ? `Other — ${r.entranceExamOther}` : r.entranceExam);

const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f1f1f4;color:#6b7280;font-size:14px;width:44%;vertical-align:top;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f1f1f4;color:#111827;font-size:14px;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`;

const sectionTitle = (text) => `
  <p style="margin:28px 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f97316;font-weight:700;">${text}</p>`;

const shell = (preheader, inner) => `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(17,24,39,0.08);">
        ${inner}
        <tr>
          <td style="background:#0b0b12;padding:22px 32px;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.7;">
              Presented by <b style="color:#fff;">${IQ_ARENA.organizer}</b> &nbsp;•&nbsp;
              In association with <b style="color:#fff;">${IQ_ARENA.collaborationPartner}</b><br>
              Event Partner: <b style="color:#fff;">${IQ_ARENA.eventPartner}</b>
            </p>
            <p style="margin:10px 0 0;color:#6b7280;font-size:12px;">
              📩 ${IQ_ARENA.contactEmail} &nbsp;|&nbsp; ☎️ ${IQ_ARENA.contactPhone} &nbsp;|&nbsp; 🌐 ${IQ_ARENA.website}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const hero = (eyebrow, title, subtitle) => `
  <tr>
    <td style="background:#0b0b12;background-image:linear-gradient(135deg,#0b0b12 0%,#1f1235 55%,#7c2d12 100%);padding:40px 32px 34px;text-align:center;">
      <p style="margin:0 0 10px;color:#fdba74;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">${eyebrow}</p>
      <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:1.2;font-weight:800;">${title}</h1>
      <p style="margin:12px 0 0;color:#e5e7eb;font-size:15px;">${subtitle}</p>
    </td>
  </tr>`;

// ─────────────────────────────────────────── Student confirmation

const studentConfirmationEmail = (r) => {
  const html = shell(
    `You're registered for ${IQ_ARENA.eventName}! Registration ${esc(r.registrationNumber)}`,
    `
    ${hero('Registration Confirmed', `🏆 ${IQ_ARENA.eventName}`, IQ_ARENA.tagline)}
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 14px;font-size:16px;color:#111827;">Dear <b>${esc(r.name)}</b>,</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">
          Congratulations! Your registration for <b>${IQ_ARENA.eventTitle}</b> is confirmed and your payment
          of <b>₹${r.amountPaid}</b> has been received. Get ready to think big, play smart and stand out!
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:2px dashed #fdba74;border-radius:14px;">
          <tr>
            <td style="padding:20px 22px;text-align:center;">
              <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9a3412;font-weight:700;">Your Registration Number</p>
              <p style="margin:6px 0 0;font-size:28px;font-weight:800;color:#c2410c;letter-spacing:2px;">${esc(r.registrationNumber)}</p>
            </td>
          </tr>
        </table>

        ${sectionTitle('📅 Event Details')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Event', IQ_ARENA.eventTitle)}
          ${row('Date', IQ_ARENA.eventDateLabel)}
          ${row('Mode', `${IQ_ARENA.mode} (in-person attendance required)`)}
          ${row('Venue', `${IQ_ARENA.venue} (${IQ_ARENA.region})`)}
          ${row('Presented by', IQ_ARENA.organizer)}
          ${row('In association with', IQ_ARENA.collaborationPartner)}
          ${row('Event Partner', IQ_ARENA.eventPartner)}
        </table>

        ${sectionTitle('👤 Participant Details')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Name', esc(r.name))}
          ${row('Email', esc(r.email))}
          ${row('Mobile', esc(r.mobile))}
          ${row('College Year', esc(r.collegeYear))}
          ${row('Graduation', `${esc(r.graduationStream)} (${esc(r.graduationYear)})`)}
          ${row("Master's Aim", esc(aimLabel(r)))}
          ${row('Entrance Exam', esc(examLabel(r)))}
          ${row('City / State', `${esc(r.city)}, ${esc(r.state)}`)}
        </table>

        ${sectionTitle('💳 Payment Receipt')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Registration Fee', `₹${r.registrationFee}`)}
          ${row('Platform Fee', `₹${r.platformCharge}`)}
          ${row('Total Paid', `<span style="color:#16a34a;">₹${r.amountPaid}</span>`)}
          ${row('Payment ID', esc(r.paymentId))}
          ${row('Paid On', formatDateTime(r.paidAt))}
        </table>

        ${sectionTitle('📍 What happens next')}
        <ol style="margin:0;padding-left:20px;color:#374151;font-size:14px;line-height:1.9;">
          <li>Entries will be screened and shortlisted candidates will be invited to participate.</li>
          <li>The exact venue address, reporting time and entry pass will be shared on this email.</li>
          <li>Carry a valid college ID / government photo ID and this registration number on the event day.</li>
          <li>Start preparing: GD, Idea Stage, Business Challenge, Pitch Yourself and Rapid Fire await you!</li>
        </ol>

        <p style="margin:28px 0 0;font-size:15px;color:#374151;line-height:1.7;">
          See you at the Arena!<br>
          <b>Team Educate Me &amp; Career Critics</b>
        </p>
      </td>
    </tr>`
  );

  return {
    subject: `${testTag()}🏆 You're in! ${IQ_ARENA.eventName} Registration Confirmed — ${r.registrationNumber}`,
    html
  };
};

// ─────────────────────────────────────────── Educate Me team notification

const adminNotificationEmail = (r) => {
  const html = shell(
    `New ${IQ_ARENA.eventName} registration: ${esc(r.name)} (${esc(r.registrationNumber)})`,
    `
    ${hero('New Registration', `🎉 ${esc(r.name)} just registered`, `${IQ_ARENA.eventName} • ${esc(r.registrationNumber)}`)}
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 6px;font-size:15px;color:#374151;line-height:1.7;">
          A new student has registered and <b style="color:#16a34a;">paid ₹${r.amountPaid}</b> for ${IQ_ARENA.eventName}.
          Confirmed via <b>${esc(r.confirmedVia)}</b> at ${formatDateTime(r.paidAt)}.
        </p>

        ${sectionTitle('Student')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Registration No.', esc(r.registrationNumber))}
          ${row('Name', esc(r.name))}
          ${row('Email', esc(r.email))}
          ${row('Mobile', esc(r.mobile))}
          ${row('Gender', esc(r.gender))}
          ${row('City / State', `${esc(r.city)}, ${esc(r.state)}`)}
        </table>

        ${sectionTitle('Academics & Aspirations')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('College Year', esc(r.collegeYear))}
          ${row('Graduation Year', esc(r.graduationYear))}
          ${row('Graduation Stream', esc(r.graduationStream))}
          ${row('10th CGPA', `${esc(r.cgpa10)} / 10`)}
          ${row('12th CGPA', `${esc(r.cgpa12)} / 10`)}
          ${row("Master's Aim", esc(aimLabel(r)))}
          ${row('Entrance Exam', esc(examLabel(r)))}
        </table>

        ${sectionTitle('Payment')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Amount', `₹${r.amountPaid} (₹${r.registrationFee} + ₹${r.platformCharge} platform fee)`)}
          ${row('Payment ID', esc(r.paymentId))}
          ${row('Order ID', esc(r.orderId))}
        </table>

        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;">
          This registration is now listed under <b>IQ Arena 2027 Registrations</b> in the admin dashboard.
        </p>
      </td>
    </tr>`
  );

  return {
    subject: `${testTag()}New IQ Arena 2027 Registration: ${r.name} (${r.registrationNumber})`,
    html
  };
};

module.exports = { studentConfirmationEmail, adminNotificationEmail };
