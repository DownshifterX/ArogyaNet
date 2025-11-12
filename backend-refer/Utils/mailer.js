// Minimal mailer stub - replace with real email provider in production
const nodemailer = require('nodemailer');

async function sendVerificationEmail(to, token) {
  // For quick demo purposes we just log the verification link.
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:8080'}/api/auth/verify?token=${token}`;
  console.log(`[mailer] verification link for ${to}: ${verificationUrl}`);
  return true;
}

module.exports = { sendVerificationEmail };
