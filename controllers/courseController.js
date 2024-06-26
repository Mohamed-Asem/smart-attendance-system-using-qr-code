const appError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Course = require('../models/courseModel');
const Lecture = require('./../models/lectureModel');
const Doctor = require('./../models/doctorModel');

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

  // adding doctor name to the response :
  const { name: doctorName } = await Doctor.findById(doctorId).select(
    'name -_id'
  );

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
      doctorName,
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
  await Lecture.deleteMany({ courseId: id });
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

// These controllers related to Lecture resource 

exports.addCourseLectures = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const { lectures } = req.body;

  if (!lectures || lectures.length !== 12) {
    return next(new appError(400, 'Each course must have 12 lectures'));
  }

  const storedLectures = [];

  for (const lecture of lectures) {
    lecture.courseId = courseId;
    lecture.uniqueLecture = `${courseId}${lecture.lectureNumber}`;
    const existedLecture = await Lecture.findOne({
      uniqueLecture: lecture.uniqueLecture,
    });

    if (existedLecture) {
      return next(
        new appError(400, 'this lecture has been stored for this course before')
      );
    }
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

  lecture.uniqueLecture = `${lecture.courseId}${lecture.lectureNumber}`;

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

  // make sure the sure does not has more than 21 lectures :
  const courseLectures = await Lecture.find({ courseId });

  if (courseLectures.length === 12) {
    return next(
      new appError(400, 'The course should contain only 12 lectures')
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
