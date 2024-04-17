const express = require('express');
const helmet = require('helmet');
const appError = require('./utils/appError');
const errorController = require('./controllers/errorControllers');
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lectureRoutes = require('./routes/lectureRoutes');
// starting express app
const app = express();

// middlewares :

app.use(helmet());

// body parser
app.use(express.json());

// routes :
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/admins', adminRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/lectures', lectureRoutes);

// handle unhandled routes :

app.all('*', (req, res, next) => {
  return next(new appError(404, 'this routes does not exist on this server'));
});

app.use(errorController);

module.exports = app;
