const appError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Course = require('../models/courseModel');

exports.addNewCourse = catchAsync(async (req, res, next) => {
  const { courseName, courseCode, doctorId, prerequisites } = req.body;
  if (!courseName || !courseCode || !doctorId || !prerequisites) {
    return next(
      new appError(
        400,
        'Enter courseName, courseCode, doctorId and prerequisites'
      )
    );
  }

  const course = await Course.create({
    courseName,
    courseCode,
    doctorId,
    prerequisites,
  });

  res.status(201).json({
    status: 'success',
    data: {
      course,
    },
  });
});

exports.getAllCourses = catchAsync(async (req, res, next) => {
  const courses = await Course.find();
  res.status(200).json({
    status: 'success',
    data: {
      courses,
    },
  });
});

exports.getCourseById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const course = await Course.findById(id)
    .populate({ path: 'lectures' })
    .populate({ path: 'doctorId', select: 'name email' });
  if (!course) return next(new appError(400, 'this course does not exist'));
  res.status(200).json({
    status: 'success',
    data: {
      course,
    },
  });
});

exports.getCourseByCourseCode = catchAsync(async (req, res, next) => {
  const { courseCode } = req.body;
  if (!courseCode) return next(new appError(400, 'Enter the course Code'));

  const course = await Course.findOne({ courseCode })
    .populate({ path: 'lectures' })
    .populate({ path: 'doctorId', select: 'name email' });

  if (!course) return next(new appError(404, 'This course does not exist'));
  res.status(200).json({
    status: 'success',
    data: {
      course,
    },
  });
});

exports.deleteCourseByCourseCode = catchAsync(async (req, res, next) => {
  const { courseCode } = req.body;
  if (!courseCode) return next(new appError(400, 'Enter the course Code'));

  const course = await Course.findOneAndDelete({ courseCode });
  if (!course) return next(new appError(404, 'This course does not exist'));
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.deleteCourseById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const course = await Course.findByIdAndDelete(id);
  if (!course) return next(new appError(404, 'this course does not exist'));
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const course = await Course.findByIdAndUpdate(id, req.body, { new: true });
  if (!course) {
    return next(new appError(404, 'this course does not exist'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      course,
    },
  });
});

exports.getDoctorCourses = catchAsync(async (req, res, next) => {
  // doctor must be authenticated
  const doctorId = req.user.id;
  const courses = await Course.find({ doctorId }).select('courseName');
  res.status(200).json({
    status: 'success',
    data: {
      courses,
    },
  });
});
