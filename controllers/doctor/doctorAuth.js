const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const Doctor = require('./../../models/doctorModel');
const BlackListToken = require('./../../models/blackListTokens');
const appError = require('./../../utils/appError');
const catchAsync = require('./../../utils/catchAsync');
const sendEmail = require('./../../utils/sendEmail');

const createJWT = (id, role) => {
  const token = jwt.sign({ id, role }, process.env.JWT_SECRETKEY, {
    expiresIn: process.env.JWT_EXPIRESIN,
  });

  return token;
};

exports.doctorLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email) {
    return next(new appError(400, 'email missed, please enter your email'));
  }

  if (!password) {
    return next(
      new appError(400, 'password missed, please enter your password')
    );
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return new appError(400, 'email and password must be strings');
  }

  const doctor = await Doctor.findOne({ email }).select('+password');

  if (!doctor) {
    return next(new appError(404, 'this doctor does not exist'));
  }

  // compare password :
  let checkedPassword;

  if (doctor.notActivated) {
    checkedPassword = doctor.password === password;
    doctor.notActivated = undefined;
    doctor.password = await bcrypt.hash(doctor.password, 12);
    await doctor.save();
  } else {
    checkedPassword = await bcrypt.compare(password, doctor.password);
  }

  if (!checkedPassword) {
    return next(new appError(401, 'password is not correct!'));
  }

  const token = createJWT(doctor._id, doctor.role);

  res.status(200).json({
    status: 'success',
    token,
  });
});

// 1) forget password

exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1) get the user based on posted email :

  const { email } = req.body;

  if (!email) return next(new appError(400, 'Enter your email'));

  if (typeof email !== 'string')
    return next(new appError(400, 'Email must be of type string'));

  const doctor = await Doctor.findOne({ email });
  if (!doctor)
    return next(new appError(404, 'There is no user with this email address'));

  //2) generate reset password :
  const passwordResetCode = doctor.generatePasswordResetCodeForDoctors();
  await doctor.save({ validateBeforeSave: false });

  // sending password reset code the user email
  const subject = 'Forget password confirmation code';
  const message = `If you forgot your password, please use this code <b style="color:red">${passwordResetCode}</b> to reset it <i>This code is only valid for 2 minutes</i>, but if you have not forgotten your password, please ignore this email.`;
  try {
    const info = await sendEmail({ html: message, subject, to: doctor.email });

    if (info.rejected.length > 0) {
      return next(
        400,
        'Something wrong with this email maybe it does not exist'
      );
    }
    res.status(200).json({
      status: 'success',
      message: 'The confirmation code has been sent to your email successfully',
    });
  } catch (err) {
    console.log(err);
    next(
      new appError(
        500,
        'An error occurred while sending the email. Please try again later'
      )
    );
  }
});

// 2) confirm reset password code :

exports.confirmPasswordResetCode = catchAsync(async (req, res, next) => {
  const { email, confirmCode } = req.body;
  if (!email || !confirmCode)
    return next(
      new appError(400, 'Please Enter email and The confirmation code')
    );

  if (typeof email !== 'string')
    return next(new appError(400, 'Email must be of type string'));

  if (typeof confirmCode !== 'number')
    return next(
      new appError(400, 'The confirmation code must be of type Number')
    );

  const doctor = await Doctor.findOne({ email });
  if (!doctor)
    return next(
      new appError(404, 'There is no doctor with this email address')
    );

  //check if the confirmation code is correct
  if (doctor.passwordResetCode !== confirmCode)
    return next(
      new appError(400, 'Incorrect confirmation code, please try again')
    );

  //  check if the code still valid :
  if (doctor.passwordResetCodeExpireIn < Date.now())
    return next(
      new appError(400, 'This code not valid any more please try another one')
    );

  // if every thing ok then allow him to change his password and send response back
  doctor.allowedToResetPassword = true;
  doctor.passwordResetCode = undefined;
  doctor.passwordResetCodeExpireIn = undefined;

  await doctor.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message:
      'The code has been successfully confirmed. You can reset your password now',
  });
});

// 3) Reset password for doctors

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, password, passwordConfirm } = req.body;
  if (!email || !password || !passwordConfirm) {
    return next(
      new appError(
        400,
        'Please enter your email, password, and passwordConfirm'
      )
    );
  }

  const doctor = await Doctor.findOne({ email });

  if (!doctor)
    return next(
      new appError(400, 'there is no doctor with this email address')
    );

  // check if the doctor allowed to change his password
  if (!doctor.allowedToResetPassword)
    return next(
      new appError(
        403,
        'You are not allowed to reset your password unless you enter a valid confirmation code'
      )
    );

  // if every thing ok then check if the password and passwordConfirm are the same :
  if (password !== passwordConfirm)
    return next(
      new appError(400, 'password and password confirm are not the same')
    );

  // finally reset password in the DB :
  doctor.password = await bcrypt.hash(password, 12);
  doctor.allowedToResetPassword = undefined;
  doctor.passwordChangedAt = Date.now();
  await doctor.save();

  res.status(200).json({
    status: 'success',
    message:
      'Your password successfully updated .. please login again with your new password',
  });
});

// 4) resend reset password confirmation code
exports.resendPasswordResetCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new appError(400, 'Enter your email'));

  if (typeof email !== 'string')
    return next(new appError(400, 'Email must be of type string'));

  const doctor = await Doctor.findOne({ email });
  if (!doctor)
    return next(
      new appError(404, 'There is no doctor with this email address')
    );

  //2) generate reset password ;
  const passwordResetCode = doctor.generatePasswordResetCodeForDoctors();
  await doctor.save({ validateBeforeSave: false });

  // sending password reset code the user email
  const subject = 'Forget password confirmation code';
  const message = `If you forgot your password, please use this code <b style="color:red">${passwordResetCode}</b> to reset it  <i>This code is only valid for 2 minutes</i>, but if you have not forgotten your password, please ignore this email.`;
  try {
    const info = await sendEmail({ html: message, subject, to: doctor.email });

    if (info.rejected.length > 0) {
      return next(
        400,
        'Something wrong with this email maybe it does not exist'
      );
    }
    res.status(200).json({
      status: 'success',
      message: 'The confirmation code has been sent to your email successfully',
    });
  } catch (err) {
    console.log(err);
    next(
      new appError(
        500,
        'An error occurred while sending the email. Please try again later'
      )
    );
  }
});

//  update password :

exports.changePassword = catchAsync(async (req, res, next) => {
  // doctor must be authenticated to use this function:

  const doctor = await Doctor.findById(req.user.id).select('+password');

  const { currentPassword, newPassword, passwordConfirm } = req.body;
  if (!currentPassword || !newPassword || !passwordConfirm)
    return next(
      new appError(
        400,
        'Please enter your currentPassword, newPassword and passwordConfirm'
      )
    );

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof passwordConfirm !== 'string'
  )
    return next(
      new appError(
        400,
        'currentPassword, newPassword and passwordConfirm must be in type string'
      )
    );

  // check if the password and passwordConfirm are the same :
  if (newPassword !== passwordConfirm)
    return next(
      new appError(400, 'password and password confirm are not the same')
    );

  // check if the current password is correct:
  if (!(await bcrypt.compare(currentPassword, doctor.password)))
    return next(
      new appError(400, 'Your current password is incorrect. Please try again')
    );

  // check if the current password and new one are not the same
  if (await bcrypt.compare(newPassword, doctor.password))
    return next(
      new appError(
        400,
        'The new password must be different from the current password'
      )
    );

  // finally reset password in the DB :
  doctor.password = await bcrypt.hash(newPassword, 12);
  doctor.passwordChangedAt = Date.now();
  await doctor.save();

  res.status(200).json({
    status: 'success',
    message:
      'Your password successfully updated .. please login with your new password',
  });
});

// log out :resendChangePasswordConfirmationCode

exports.doctorsLogout = catchAsync(async (req, res, next) => {
  await BlackListToken.create({
    token: req.token,
    reason: 'doctor logged out',
  });
  res.status(204).json({
    status: 'success',
    message: 'doctor logged out successfully',
  });
});
