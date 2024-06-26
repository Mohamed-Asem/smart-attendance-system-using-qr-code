const appError = require('./../utils/appError');

const sendErrorInDevelopment = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorInProduction = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('Error happened 😜', err);
    res.status(500).json({
      status: 'error',
      message: 'Something wrong happened',
      error: err,
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // in development :
  if (process.env.NODE_ENV === 'development') {
    sendErrorInDevelopment(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    if (err.name === 'CastError') {
      err = new appError(400, `Invalid ${err.path} : ${err.value}`);
    }

    // handling duplicate fields value :
    if (err.code === 11000) {
      err = new appError(
        400,
        `Duplicate field ${Object.keys(err.keyValue)[0]} with the value ${
          err.keyValue[Object.keys(err.keyValue)[0]]
        }`
      );
    }

    // handling mongoose validation error :
    if (err.errors?.name?.name === 'ValidatorError') {
      let errors = Object.values(err.errors)
        .map(el => el.message)
        .join('. ');
      err = new appError(400, `Invalid input data : ${errors}`);
    }

    // handling TokenExpiredError
    if (err.name === 'TokenExpiredError') {
      err = new appError(401, 'Token has been expired .. pls login again');
    }

    if (err.name === 'JsonWebTokenError') {
      err = new appError(401, 'Invalid token pls login again!');
    }
    sendErrorInProduction(err, res);
  }
};

module.exports = globalErrorHandler;
