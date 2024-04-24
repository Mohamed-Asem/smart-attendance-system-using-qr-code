const appError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Course = require('../models/courseModel');
const Lecture = require('./../models/lectureModel');

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
  const { courseName, courseCode, doctorId, prerequisites } = req.body;
  if (!courseName || !courseCode || !doctorId || !prerequisites) {
    return next(
      new appError(
        400,
        'please enter courseName, courseCode, doctorId, and prerequisites to update the course'
      )
    );
  }
  const course = await Course.findByIdAndUpdate(
    id,
    { courseName, courseCode, doctorId, prerequisites },
    { new: true }
  );
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

// add lectures of specific course:

exports.addCourseLectures = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const { lectures } = req.body;

  if (!lectures || lectures.length !== 12) {
    return next(new appError(400, 'Each course must have 12 lectures'));
  }

  const storedLectures = [];

  for (const lecture of lectures) {
    lecture.courseId = courseId;
    let ln;
    if (`${lecture.lectureNumber}`.length === 1) {
      ln = `${lecture.lectureNumber}0`;
    } else {
      ln = `${lecture.lectureNumber}`;
    }
    lecture.uniqueLecture = `${courseId}${ln}`;
    const storedLecture = await Lecture.create(lecture);
    storedLectures.push(storedLecture); // Collect stored lectures
  }

  res.status(201).json({
    status: 'success',
    data: {
      size: storedLectures.length,
      storedLectures,
    },
  });
});

exports.findLectureById = catchAsync(async (req, res, next) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findById(lectureId);

  if (!lecture) {
    return next(new appError(404, 'Lecture not found'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      lecture,
    },
  });
});

exports.deleteLectureById = catchAsync(async (req, res, next) => {
  const { lectureId } = req.params;

  const lecture = await Lecture.findByIdAndDelete(lectureId);

  if (!lecture) {
    return next(new appError(404, 'Lecture not found'));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateLectureById = catchAsync(async (req, res, next) => {
  const { lectureId } = req.params;
  const { title, lectureNumber } = req.body;

  if (!title && !lectureNumber) {
    return next(
      new appError(400, 'title and lectureNumber must be provided for updating')
    );
  }

  const lecture = await Lecture.findById(lectureId).select('+uniqueLecture');

  if (!lecture) {
    return next(new appError(404, 'this lecture does not exist'));
  }

  lecture.title = title || lecture.title;
  lecture.lectureNumber = lectureNumber || lecture.lectureNumber;

  let ln =
    `${lectureNumber}`.length === 1 ? `${lectureNumber}0` : `${lectureNumber}`;

  lecture.uniqueLecture = `${lecture.courseId}${ln}`;

  await lecture.save();

  res.status(200).json({
    status: 'success',
    data: {
      lecture,
    },
  });
});

exports.addSingleLecture = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const { lectureNumber, title } = req.body;
  const uniqueLecture = `${courseId}${lectureNumber}`;
  const existedLecture = await Lecture.findOne({ uniqueLecture });

  if (existedLecture) {
    return next(
      new appError(400, 'this lecture has been added for this course before')
    );
  }

  const lecture = await Lecture.create({
    lectureNumber,
    courseId,
    title,
    uniqueLecture,
  });

  return res.status(201).json({
    status: 'success',
    data: {
      lecture,
    },
  });
});
