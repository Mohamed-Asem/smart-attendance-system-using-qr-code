const { promisify } = require('util');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('./../../utils/sendEmail');
const Student = require('../../models/studentModel');
const BlackListToken = require('./../../models/blackListTokens');
const catchAsync = require('../../utils/catchAsync');
const appError = require('../../utils/appError');

const createJWT = (id, role) => {
  const token = jwt.sign({ id, role }, process.env.JWT_SECRETKEY, {
    expiresIn: process.env.JWT_EXPIRESIN,
  });

  return token;
};

// login
exports.studentLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new appError(400, 'Enter your email, password and role'));
  }

  if (typeof email !== 'string' || typeof password !== 'string') {
    return new appError(400, 'email and password must be strings');
  }

  const student = await Student.findOne({ email }).select('+password');

  if (!student) {
    return next(new appError(404, 'There is no user with this email address'));
  }

  // compare password :
  let checkedPassword;

  if (student.notActivated) {
    checkedPassword = student.password === password;
    student.notActivated = undefined;
    student.password = await bcrypt.hash(student.password, 12);
    await student.save();
  } else {
    checkedPassword = await bcrypt.compare(password, student.password);
  }

  if (!checkedPassword) {
    return next(new appError(400, 'Password is not correct!'));
  }

  const token = createJWT(student._id, student.role);

  res.status(200).json({
    status: 'success',
    token,
  });
});

// protect routes : check if the user is authenticated :
// exports.protect = catchAsync(async (req, res, next) => {
//   // get the token from the headers and check if it exist
//   let token;
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith('Bearer')
//   ) {
//     token = req.headers.authorization.split(' ').at(1);
//   }

//   if (!token) {
//     return next(
//       new appError(
//         401,
//         'Token missed .. Please login to get access to this resource'
//       )
//     );
//   }

//   // check if the user logged out
//   const blackListToken = await BlackListToken.findOne({ token });
//   if (blackListToken)
//     return next(
//       new appError(401, 'You logged out .. please login again to get access')
//     );

//   // token verification
//   const payload = await promisify(jwt.verify)(token, process.env.JWT_SECRETKEY);

//   // check if the user still exist
//   const student = await Student.findById(payload.id);

//   if (!student)
//     return new appError(401, 'There is no user with this email address');
//   // check if the student changed password after token issued

//   if (student.checkIfStudentChangedPasswordAfterTokenIssued(payload.iat)) {
//     return next(
//       new appError(
//         401,
//         'user has recently changed his password pls login again'
//       )
//     );
//   }

//   req.user = student;
//   req.token = token;
//   next();
// });

// // implement authorization :
// exports.restrictTo = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.role)) {
//       new appError(403, 'you are not allowed to perform this action');
//     }
//     next();
//   };
// };

// forget password :
exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1) get the user based on posted email :

  const { email } = req.body;
  if (!email) return next(new appError(400, 'Enter your email'));
  if (typeof email !== 'string')
    return next(new appError(400, 'Email must be of type string'));

  const student = await Student.findOne({ email });
  if (!student)
    return next(new appError(404, 'There is no user with this email address'));

  //2) generate reset password :
  const passwordResetCode = student.generatePasswordResetCodeForStudent();
  await student.save({ validateBeforeSave: false });

  // sending password reset code the user email
  const subject = 'Forget password confirmation code';
  const message = `If you forgot your password, please use this code <b style="color:red">${passwordResetCode}</b> to reset it <i>This code is only valid for 2 minutes</i>, but if you have not forgotten your password, please ignore this email.`;

  try {
    const info = await sendEmail({ html: message, subject, to: student.email });

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

// confirm reset password code :

exports.confirmPasswordResetCode = catchAsync(async (req, res, next) => {
  const { email, confirmCode } = req.body;
  if (!email || !confirmCode)
    return next(
      new appError(400, 'Please Enter your email and The confirmation code')
    );

  if (typeof email !== 'string')
    return next(new appError(400, 'email must be of type string'));

  if (typeof confirmCode !== 'number')
    return next(
      new appError(400, 'The confirmation code must be of type Number')
    );

  const student = await Student.findOne({ email });
  if (!student)
    return next(
      new appError(404, 'There is no student with this email address')
    );

  //check if the confirmation code is correct
  if (student.passwordResetCode !== confirmCode)
    return next(
      new appError(400, 'Incorrect confirmation code, please try again')
    );

  //  check if the code still valid :
  if (student.passwordResetCodeExpireIn < Date.now())
    return next(
      new appError(400, 'This code not valid any more please try again later')
    );

  // if every thing ok then allow him to change his password and send response back
  student.allowedToResetPassword = true;
  student.passwordResetCode = undefined;
  student.passwordResetCodeExpireIn = undefined;

  await student.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message:
      'The code has been successfully confirmed. You can now reset your password',
  });
});

// reset password :
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

  const student = await Student.findOne({ email });

  if (!student)
    return next(
      new appError(400, 'there is no student with this email address')
    );

  // check if the student allowed to change his password
  if (!student.allowedToResetPassword)
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

  student.password = await bcrypt.hash(password, 12);
  student.allowedToResetPassword = undefined;
  student.passwordChangedAt = Date.now();
  await student.save();

  // log in the user
  const token = createJWT(student._id, student.role);

  res.status(200).json({
    status: 'success',
    message: 'Your password successfully updated',
    token,
  });
});

exports.resendPasswordResetCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new appError(400, 'Enter your email'));

  if (typeof email !== 'string')
    return next(new appError(400, 'Email must be of type string'));

  const student = await Student.findOne({ email });
  if (!student)
    return next(
      new appError(404, 'There is no student with this email address')
    );

  //2) generate reset password ;
  const passwordResetCode = student.generatePasswordResetCodeForStudent();
  await student.save({ validateBeforeSave: false });

  // sending password reset code the user email
  const subject = 'Forget password confirmation code';
  const message = `If you forgot your password, please use this code <b style="color:red">${passwordResetCode}</b> to reset it  <i>This code is only valid for 2 minutes</i>, but if you have not forgotten your password, please ignore this email.`;
  try {
    const info = await sendEmail({ html: message, subject, to: student.email });

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

//  -_________________ these functions related to change password functionalities _________________-

//   update password :

exports.changePassword = catchAsync(async (req, res, next) => {
  // student must be authenticated to use this function:

  const student = await Student.findById(req.user.id).select('+password');

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
        'currentPassword,newPassword and passwordConfirm must be in type string'
      )
    );

  // check if the password and passwordConfirm are the same :
  if (newPassword !== passwordConfirm)
    return next(
      new appError(400, 'password and password confirm are not the same')
    );

  // check if the current password is correct:
  if (!(await bcrypt.compare(currentPassword, student.password)))
    return next(
      new appError(400, 'Your current password is incorrect. Please try again')
    );

  // check if the current password and new password are the same
  if (await bcrypt.compare(newPassword, student.password))
    return next(
      new appError(
        400,
        'The new password must be different from the current password'
      )
    );

  // finally reset password in the DB :
  student.password = await bcrypt.hash(newPassword, 12);
  student.passwordChangedAt = Date.now();
  await student.save();

  const token = createJWT(student._id, student.role);

  res.status(200).json({
    status: 'success',
    message: 'Your password successfully updated',
    token,
  });
});

// log out :

exports.studentsLogout = catchAsync(async (req, res, next) => {
  await BlackListToken.create({
    token: req.token,
    reason: 'student logged out',
  });
  res.status(204).json({
    status: 'success',
    message: 'you logged out successfully',
  });
});
