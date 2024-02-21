const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function sendVerificationEmail(userEmail, verificationToken, name) {
  // Read the HTML file
  const filePath = path.join(__dirname, 'verificationEmailTemplate.html');
  let htmlContent = fs.readFileSync(filePath, 'utf8');
  
  // Replace placeholders with actual data
  htmlContent = htmlContent.replace('{{name}}', name).replace('{{verificationToken}}', verificationToken);
  
  // Create a transporter as before
  const transporter = nodemailer.createTransport({
    host: "us2.smtp.mailhostbox.com",
    port: 587,
    secure: false, // Note: Use true for 465, false for other ports
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: "info@citsolution.tech", // Change this to your email
    to: userEmail,
    subject: "Welcome to DYNAMIC_CITS — Create and verify your account now.",
    html: htmlContent, // Use the read and modified HTML content
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully.");
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
}

module.exports = sendVerificationEmail;
