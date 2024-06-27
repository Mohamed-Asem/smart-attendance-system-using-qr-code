const randomPassword = require('random-password');
const Student = require('../../models/studentModel');
const Attendance = require('./../../models/attendanceModel');
const Lecture = require('./../../models/lectureModel');
const Course = require('./../../models/courseModel');
const catchAsync = require('../../utils/catchAsync');
const appError = require('../../utils/appError');
const generateUniqueId = require('./../../utils/generateUniqueId');
const decryptData = require('./../../utils/decryptData');

exports.addNewStudent = catchAsync(async (req, res, next) => {
  const { name, email, level, passedCourses, courses } = req.body;
  if (!name || !email || !level || !passedCourses || !courses) {
    return next(
      new appError(
        400,
        "Enter student's name, email, level, passedCourses and courses"
      )
    );
  }

  const password = randomPassword(8, '1234567890');
  const studentId = generateUniqueId(5);
  const notActivated = true;
  const student = await Student.create({
    name,
    email,
    level,
    password,
    studentId,
    notActivated,
    passedCourses,
    courses,
  });

  let courseNamesArray = [];

  if (courses.length > 0) {
    const courseNames = await Course.find({ _id: { $in: courses } }).select(
      'courseName'
    );

    courseNamesArray = courseNames.map(course => course.courseName);
  }

  res.status(201).json({
    status: 'success',
    data: {
      student: {
        ...student.toObject(),
        courses: courseNamesArray,
      },
    },
  });
});

exports.getAllStudents = catchAsync(async (req, res, next) => {
  const students = await Student.find();
  res.status(200).json({
    status: 'success',
    data: {
      students,
    },
  });
});

exports.getStudentById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const student = await Student.findById(id).populate({
    path: 'courses',
    select: 'courseName courseCode',
  });

  if (!student) {
    return next(new appError(404, 'this student does not exist'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      student,
    },
  });
});

exports.getStudentByEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email)
    return next(
      new appError(400, "Enter student's email address to get his data")
    );

  const student = await Student.findOne({ email }).populate({
    path: 'courses',
    select: 'courseName courseCode',
  });

  if (!student) return next(new appError(404, 'this student does not exist'));

  res.status(200).json({
    status: 'success',
    data: {
      student,
    },
  });
});

exports.updateStudent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, level, passedCourses } = req.body;
  if (!name || !email || !level || !passedCourses) {
    return next(
      new appError(
        400,
        'please enter name, email, level, and passedCourses of student to be updated '
      )
    );
  }

  const student = await Student.findByIdAndUpdate(
    id,
    { name, email, level, passedCourses },
    { new: true }
  );
  if (!student) return next(new appError(404, 'this student does not exist'));
  res.status(200).json({
    status: 'success',
    data: {
      updatedStudent: student,
    },
  });
});

exports.deleteStudent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const student = await Student.findByIdAndDelete(id);
  if (!student) {
    return next(new appError(404, 'this student does not exist'));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.viewProfile = catchAsync(async (req, res, next) => {
  // student must be authenticated to use this function :
  const student = await Student.findById(req.user.id)
    .select('name email role courses -_id')
    .populate({ path: 'courses', select: 'courseName -_id' });

  res.status(200).json({
    status: 'success',
    data: {
      student,
    },
  });
});

exports.scan = catchAsync(async (req, res, next) => {
  // student must be authenticated :
  const studentId = req.user.id;
  const { qrCode } = req.body;
  if (!qrCode) {
    return next(new appError(400, 'qrCode missed please scan again!'));
  }

  const qrData = decryptData(qrCode, process.env.QR_SECRETKEY);

  // make sure that lecture qr is still opened

  const lecture = await Lecture.findById(qrData.split(',').at(1)).select(
    '+lockedAttendance'
  );

  if (lecture.lockedAttendance) {
    return next(
      new appError(
        400,
        'You are not allowed to record this attendance for this lecture'
      )
    );
  }

  const token = `${qrData.split(',').join('')}${studentId}`;

  const studentAttendanceRecord = await Attendance.findOne({ token });

  if (!studentAttendanceRecord) {
    return next(
      new appError(
        403,
        'You are not allowed to register your attendance in this lecture!'
      )
    );
  }

  if (studentAttendanceRecord.status === 'present') {
    return next(
      new appError(
        400,
        'You have already registered your attendance for this lecture'
      )
    );
  }

  // if every thing is ok then mark student as present
  studentAttendanceRecord.status = 'present';
  await studentAttendanceRecord.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'student attendance recorded successfully',
  });
});
