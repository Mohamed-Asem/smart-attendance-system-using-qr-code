const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const randomPassword = require('random-password');
const Admin = require('./../../models/adminModel');
const Doctor = require('./../../models/doctorModel');
const Student = require('./../../models/studentModel');
const Course = require('./../../models/courseModel');
const catchAsync = require('../../utils/catchAsync');
const appError = require('../../utils/appError');
const generateId = require('./../../utils/generateUniqueId');

// function generateUniqueId(length) {
//   let id = '';
//   for (let i = 0; i < length; i++) {
//     id += Math.floor(math.random() * 10);
//   }
//   return id;
// }

exports.addNewAdmin = catchAsync(async (req, res, next) => {
  const admin = await Admin.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      admin,
    },
  });
});

exports.getAllAdmins = catchAsync(async (req, res, next) => {
  const admins = await Admin.find();
  res.status(200).json({
    status: 'success',
    data: {
      users: admins,
    },
  });
});

exports.getAdminById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const admin = await Admin.findById(id);
  if (!admin) {
    return next(new appError(404, 'this it does not exist'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      admin,
    },
  });
});

// upload students data :

exports.uploadStudentData = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new appError(400, 'No file uploaded!'));
  }

  const fileContent = await fs.readFile(req.file.path, 'utf-8');
  const students = JSON.parse(fileContent);

  const completeStudents = [];
  const incompleteStudents = [];

  // Check if all required fields are provided
  students.forEach((student, index) => {
    if (student.name && student.level && student.email) {
      completeStudents.push(student);
    } else {
      student.studentIndex = index + 1;
      incompleteStudents.push(student);
    }
  });

  // add ids and initial passwords for complete students data
  completeStudents.forEach(student => {
    student.studentId = generateId(5);
    student.password = randomPassword(8, '1234567890');
    student.notActivated = true;
  });

  const storedStudents = await Student.insertMany(completeStudents);

  // remove file from file system:
  await fs.unlink(req.file.path);

  // handle message if we have incompleteStudents or not
  let message;
  if (incompleteStudents.length > 0) {
    message =
      'Some student records were incomplete and not added to the database. Please review the following records and ensure all required fields are provided';
  } else {
    message = 'All student records were successfully added to the database';
  }

  return res.status(200).json({
    status: 'success',
    message,
    data: {
      incompleteStudents,
      completeStudents: storedStudents,
    },
  });
});

// upload doctors data :

exports.uploadDoctorsData = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new appError(400, 'file must be uploaded'));

  const fileContent = await fs.readFile(req.file.path, 'utf-8');
  const doctors = JSON.parse(fileContent);

  // check if all required fields provided for all doctors
  const completeDoctors = [];
  const incompleteDoctors = [];

  doctors.forEach((doctor, index) => {
    if (doctor.name && doctor.email) {
      completeDoctors.push(doctor);
    } else {
      doctor.doctorIndex = index + 1;
      incompleteDoctors.push(doctor);
    }
  });

  completeDoctors.forEach(doctor => {
    doctor.password = randomPassword(8, '1234567890');
    doctor.doctorId = generateId(5);
    doctor.notActivated = true;
  });

  const storedDoctors = await Doctor.insertMany(completeDoctors);
  // remove file from file system
  await fs.unlink(req.file.path);
  // handle message
  let message;
  if (incompleteDoctors.length > 0) {
    message =
      'Some doctors records were incomplete and not added to the database. Please review the following records and ensure all required fields are provided';
  } else {
    message = 'All doctors records were successfully added to the database';
  }

  res.status(200).json({
    status: 'success',
    message,
    data: {
      incompleteDoctors,
      completeDoctors: storedDoctors,
    },
  });
});

exports.enroll = catchAsync(async (req, res, next) => {
  const { courseCode, studentId } = req.body;
  const student = await Student.findOne({ studentId });
  const course = await Course.findOne({ courseCode });

  if (!student) {
    return next(new appError(404, 'this student does not exist'));
  }

  if (!course) {
    return next(new appError(404, 'this course does not exist'));
  }

  const prerequisitesMet = course.prerequisites.every(prerequisite =>
    student.passedCourses.includes(prerequisite)
  );

  if (!prerequisitesMet) {
    return next(
      new appError(400, 'Student does not meet prerequisites for this course')
    );
  }

  // enroll student in the course :
  student.courses.push(course._id);
  await student.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Student enrolled in course successfully',
    data: { student },
  });
});

exports.viewProfileForAdmin = catchAsync(async (req, res, next) => {
  // admin must be authenticated to use this function :
  const admin = await Admin.findById(req.user.id).select(
    'name email role photo -_id'
  );

  res.status(200).json({
    status: 'success',
    data: {
      admin,
    },
  });
});
