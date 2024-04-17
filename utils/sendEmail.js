const nodemailer = require('nodemailer');
const catchAsync = require('./catchAsync');

const sendEmail = async ({ html, subject, to }) => {
  const transporter = nodemailer.createTransport({
    host: 'localhost',
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
      user: 'asemm9930@gmail.com',
      pass: 'dvtz ycgy noem wzyw',
    },
  });

  const mailOptions = {
    from: 'mohamed asem <asemm9930@gmail.com>',
    // to: 'asem47261@gmail.com',
    // to: 'hebawaheed169@gmail.com',
    to, // we will get email address from the user
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);

  return info; // used to check if the email has been sent to the user or this email or not exist
};

module.exports = sendEmail;
