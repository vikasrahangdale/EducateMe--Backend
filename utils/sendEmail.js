const transporter = require("../config/email");

const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `vikasrahangdale5606@gmail.com`,
      to,
      subject,
      html,
    });
    console.log("Email sent successfully");
  } catch (err) {
    console.log("Email sending failed:", err.message);
    throw err; 
  }
};

module.exports = sendMail;
