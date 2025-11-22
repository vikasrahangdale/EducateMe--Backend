const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,  // Brevo में SMTP username = email
    pass: process.env.BREVO_SMTP_KEY   // Brevo SMTP Key
  }
});

module.exports = transporter;
