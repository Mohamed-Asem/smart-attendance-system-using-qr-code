const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const catchAsync = require('./../utils/catchAsync');
const appError = require('./../utils/appError');
const Student = require('./../models/studentModel');
const Doctor = require('./../models/doctorModel');
const Admin = require('./../models/adminModel');
const BlackListToken = require('./../models/blackListTokens');

const getUser = async (id, role) => {
  const lowerCaseRole = role.toLocaleLowerCase();
  let user;
  switch (lowerCaseRole) {
    case 'admin':
      user = await Admin.findById(id);
      break;
    case 'doctor':
      user = await Doctor.findById(id);
      break;
    case 'student':
      user = await Student.findById(id);
      break;
  }
  return user;
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ').at(1);
  }

  if (!token) {
    return next(new appError(401, 'pls login to get access to this resource'));
  }

  // check if the user logged out
  const blackListToken = await BlackListToken.findOne({ token });
  if (blackListToken)
    return next(
      new appError(401, 'You logged out .. please login again to get access')
    );

  // token verification
  const payload = await promisify(jwt.verify)(token, process.env.JWT_SECRETKEY);

  // get user to check if it still exist
  const user = await getUser(payload.id, payload.role);

  if (!user) return next(new appError(401, 'this admin is no longer exist'));
  //check if the doctor has changed his password after token has issued
  let passwordChangedAfterTokenIssued;

  if (user.passwordChangedAt) {
    const time = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
    passwordChangedAfterTokenIssued = payload.iat < time;
  } else {
    passwordChangedAfterTokenIssued = false;
  }

  if (passwordChangedAfterTokenIssued) {
    return next(
      new appError(
        401,
        'user has recently changed his password .. pls login again'
      )
    );
  }

  req.user = user;
  req.token = token;
  next();
});

// authorization :

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new appError(403, 'you are not allowed to perform this action')
      );
    }
    next();
  };
};
