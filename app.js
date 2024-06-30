const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const appError = require('./utils/appError');
const errorController = require('./controllers/errorControllers');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const courseRoutes = require('./routes/courseRoutes');

// starting express app
const app = express();

// middlewares :

// set CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Private-Network', true);
  return next();
});

app.use(helmet());

// body parser
app.use(express.json());
app.use(mongoSanitize());

app.use(compression());

// routes :
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/admins', adminRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/courses', courseRoutes);

// handle unhandled routes :

app.all('*', (req, res, next) => {
  return next(new appError(404, 'this routes does not exist on this server'));
});

app.use(errorController);

module.exports = app;
