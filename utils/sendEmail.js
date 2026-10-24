const transporter = require("../config/email");

const sendMail = async (to, subject, html) => {
  try {
    // Validate inputs
    if (!to || !subject || !html) {
      throw new Error('Missing required email fields: to, subject, or html');
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email address: ${to}`);
    }

    const fromEmail = process.env.FROM_EMAIL || 'nikhil.sewaramani.edu@gmail.com';

    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
    });
    
    console.log(`✅ Email sent successfully to: ${to}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    throw err; 
  }
};

module.exports = sendMail;
