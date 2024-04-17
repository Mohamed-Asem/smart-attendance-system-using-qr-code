const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const Admin = require('./../../models/adminModel');
const BlackListToken = require('../../models/blackListTokens');
const catchAsync = require('../../utils/catchAsync');
const appError = require('../../utils/appError');
const sendEmail = require('./../../utils/sendEmail');

const createJWT = (id, role) => {
  const token = jwt.sign({ id, role }, process.env.JWT_SECRETKEY, {
    expiresIn: process.env.JWT_EXPIRESIN,
  });

  return token;
};

exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new appError(400, 'Enter your email, password'));
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return new appError(400, 'email and password must be strings');
  }

  const admin = await Admin.findOne({ email }).select('+password');

  if (!admin) {
    return next(new appError(404, 'this user does not exist'));
  }

  // compare password :

  if (!(await bcrypt.compare(password, admin.password))) {
    return next(new appError(401, 'password is not correct!'));
  }

  const token = createJWT(admin._id, admin.role);

  res.status(200).json({
    status: 'success',
    token,
  });
});

// // protect route check if the it is logged in
// exports.protect = catchAsync(async (req, res, next) => {
//   let token;
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith('Bearer')
//   ) {
//     token = req.headers.authorization.split(' ').at(1);
//   }

//   if (!token) {
//     return next(new appError(401, 'pls login to get access to this resource'));
//   }

//   // check if the user logged out
//   const blackListToken = await BlackListToken.findOne({ token });
//   if (blackListToken)
//     return next(
//       new appError(401, 'You logged out .. please login again to get access')
//     );
//   // token verification
//   const payload = await promisify(jwt.verify)(token, process.env.JWT_SECRETKEY);
//   const admin = await Admin.findById(payload.id);
//   if (!admin) return next(new appError(401, 'this admin is no longer exist'));
//   //check if the doctor has changed his password after token has issued
//   if (admin.checkIfTheAdminChangedPasswordAfterTokenIssued(payload.iat)) {
//     return next(
//       new appError(
//         401,
//         'Admin has recently changed his password .. pls login again'
//       )
//     );
//   }
//   req.user = admin;
//   req.token = token;
//   next();
// });

// // authorization :

// exports.restrictTo = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.role)) {
//       return next(
//         new appError(403, 'you are not allowed to perform this action')
//       );
//     }
//     next();
//   };
// };

// 4 functions related to forget password functionalities

// 1) forget password

exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1) get the user based on posted email :

  const { email } = req.body;

  if (!email) return next(new appError(400, 'Enter your email'));

  if (typeof email !== 'string')
    return next(new appError(400, 'Email must be of type string'));

  const admin = await Admin.findOne({ email });

  if (!admin)
    return next(new appError(404, 'There is no user with this email address'));

  //2) generate reset password :
  const passwordResetCode = admin.generatePasswordResetCodeForAdmins();
  await admin.save({ validateBeforeSave: false });

  // sending password reset code the user email
  const subject = 'Forget password confirmation code';
  const message = `If you forgot your password, please use this code <b style="color:red">${passwordResetCode}</b> to reset it <i>This code is only valid for 2 minutes</i>, but if you have not forgotten your password, please ignore this email.`;
  try {
    const info = await sendEmail({ html: message, subject, to: admin.email });

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

  const admin = await Admin.findOne({ email });
  if (!admin)
    return next(new appError(404, 'There is no admin with this email address'));

  //check if the confirmation code is correct
  if (admin.passwordResetCode !== confirmCode)
    return next(
      new appError(400, 'Incorrect confirmation code, please try again')
    );

  //  check if the code still valid :
  if (admin.passwordResetCodeExpireIn < Date.now())
    return next(
      new appError(400, 'This code not valid any more please try another one')
    );

  // if every thing ok then allow him to change his password and send response back
  admin.allowedToResetPassword = true;
  admin.passwordResetCode = undefined;
  admin.passwordResetCodeExpireIn = undefined;

  await admin.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message:
      'The code has been successfully confirmed. You can reset your password now',
  });
});

// 3) Reset password for admins

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

  const admin = await Admin.findOne({ email });

  if (!admin)
    return next(new appError(400, 'there is no admin with this email address'));

  // check if the admin allowed to change his password
  if (!admin.allowedToResetPassword)
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
  admin.password = password;
  admin.allowedToResetPassword = undefined;
  admin.passwordChangedAt = Date.now();
  await admin.save();

  // log in the user
  const token = createJWT(admin._id, admin.role);

  res.status(200).json({
    status: 'success',
    message: 'Your password successfully updated',
    token,
  });
});

// 4) resend reset password confirmation code
exports.resendPasswordResetCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new appError(400, 'Enter your email'));

  if (typeof email !== 'string')
    return next(new appError(400, 'Email must be of type string'));

  const admin = await Admin.findOne({ email });
  if (!admin)
    return next(new appError(404, 'There is no admin with this email address'));

  //2) generate reset password ;
  const passwordResetCode = admin.generatePasswordResetCodeForAdmins();
  await admin.save({ validateBeforeSave: false });

  // sending password reset code the user email
  const subject = 'Forget password confirmation code';
  const message = `If you forgot your password, please use this code <b style="color:red">${passwordResetCode}</b> to reset it  <i>This code is only valid for 2 minutes</i>, but if you have not forgotten your password, please ignore this email.`;
  try {
    const info = await sendEmail({ html: message, subject, to: admin.email });

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

// -_________________ these functions related to change password functionalities _________________-

// change password  password :

exports.changePassword = catchAsync(async (req, res, next) => {
  // admin must be authenticated to use this function:

  const admin = await Admin.findById(req.user.id).select('+password');

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
  if (!(await bcrypt.compare(currentPassword, admin.password)))
    return next(
      new appError(400, 'Your current password is incorrect. Please try again')
    );

  if (await bcrypt.compare(newPassword, admin.password))
    return next(
      new appError(
        400,
        'The new password must be different from the current password'
      )
    );

  // finally reset password in the DB :
  admin.password = newPassword;
  admin.passwordChangedAt = Date.now();
  await admin.save();

  const token = createJWT(admin._id, admin.role);

  res.status(200).json({
    status: 'success',
    message: 'Your password successfully updated',
    token,
  });
});

// log out :

exports.adminLogout = catchAsync(async (req, res, next) => {
  await BlackListToken.create({
    token: req.token,
    reason: 'admin logged out',
  });
  res.status(204).json({
    status: 'success',
    message: 'you logged out successfully',
  });
});
