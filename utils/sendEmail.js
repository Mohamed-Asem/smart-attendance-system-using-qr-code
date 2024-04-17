const nodemailer = require('nodemailer');
const catchAsync = require('./catchAsync');

const sendEmail = async ({ html, subject, to }) => {
  const transporter = nodemailer.createTransport({
    host: 'localhost',
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `Qr App <process.env.EMAIL>`,
    to, // we will get email address from the user
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);

  return info; // used to check if the email has been sent to the user or this email or not exist
};

module.exports = sendEmail;
