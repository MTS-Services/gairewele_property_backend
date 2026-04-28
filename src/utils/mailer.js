const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"Gairewele" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
};

const sendOtpEmail = async (to, otp) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px;">
      <h2 style="color:#5b21b6;">Password Reset OTP</h2>
      <p>You requested a password reset for your Gairewele account.</p>
      <p>Use the OTP below to reset your password. It is valid for <strong>10 minutes</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#5b21b6;">${otp}</span>
      </div>
      <p style="color:#666;font-size:13px;">If you did not request this, please ignore this email.</p>
    </div>
  `;
  await sendMail(to, "Your Password Reset OTP", html);
};

module.exports = { sendMail, sendOtpEmail };
