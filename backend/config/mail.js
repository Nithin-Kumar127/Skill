const nodemailer = require("nodemailer");

/**
 * Production Outbound Transactional Email Transport Pipeline Configuration
 * Connects securely to Google SMTP relay grids using your App Passwords.
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,         // Automatically pulls your Gmail address out of your .env file
    pass: process.env.EMAIL_APP_PASSWORD, // Automatically pulls your 16-character App Password out of your .env file
  },
});

/**
 * Sends a real, live outbound transactional email via Gmail SMTP.
 * Keeps backward compatibility intact so old files importing this function won't break.
 */
async function sendAutomatedEmail({ to, subject, html }) {
  try {
    const mailOptions = {
      from: `"SkillSphere Support" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`\n📧 Live Email Sent Successfully! Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("❌ Critical SMTP Delivery Failure Error:", error.message);
    throw error;
  }
}

module.exports = { 
  sendAutomatedEmail,
  transporter 
};