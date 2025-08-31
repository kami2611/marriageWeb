const nodemailer = require("nodemailer");

// Create transporter with your Hostinger SMTP settings
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com", // Hostinger SMTP server
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // contact@damourmuslim.com
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

// Generate 4-digit verification code
function generateVerificationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Send verification email
async function sendVerificationEmail(email, code, username) {
  const mailOptions = {
    from: {
      name: "D'amour Muslim",
      address: process.env.EMAIL_FROM || "noreply@damourmuslim.com",
    },
    to: email,
    subject: "Email Verification - D'amour Muslim",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #E91E63 0%, #673AB7 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .code-box { background: white; border: 2px dashed #E91E63; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; color: #E91E63; letter-spacing: 8px; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>D'amour Muslim</h1>
            <p>Email Verification</p>
          </div>
          <div class="content">
            <h2>Welcome ${username}!</h2>
            <p>Thank you for joining D'amour Muslim. Please verify your email address by entering the code below:</p>
            
            <div class="code-box">
              <p>Your Verification Code:</p>
              <div class="code">${code}</div>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code will expire in 10 minutes</li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2024 D'amour Muslim. All rights reserved.</p>
            <p>Need help? Contact us at support@damourmuslim.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent to:", email);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
  transporter,
};
