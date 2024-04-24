const fs = require('fs').promises;
const { promisify } = require('util');
const randomPassword = require('random-password');
const Admin = require('./../../models/adminModel');
const Doctor = require('./../../models/doctorModel');
const Student = require('./../../models/studentModel');
const Course = require('./../../models/courseModel');
const catchAsync = require('../../utils/catchAsync');
const appError = require('../../utils/appError');
const generateId = require('./../../utils/generateUniqueId');
const cloudinary = require('./../../utils/cloud');

exports.addNewAdmin = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return next(new appError(400, 'please enter name, email, and password'));
  }
  const admin = await Admin.create({ name, email, password });
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

// exports.uploadDoctorsData = catchAsync(async (req, res, next) => {
//   if (!req.file) return next(new appError(400, 'file must be uploaded'));

//   const fileContent = await fs.readFile(req.file.path, 'utf-8');
//   const doctors = JSON.parse(fileContent);

//   // check if all required fields provided for all doctors
//   const completeDoctors = [];
//   const incompleteDoctors = [];

//   doctors.forEach((doctor, index) => {
//     if (doctor.name && doctor.email) {
//       completeDoctors.push(doctor);
//     } else {
//       doctor.doctorIndex = index + 1;
//       incompleteDoctors.push(doctor);
//     }
//   });

//   completeDoctors.forEach(doctor => {
//     doctor.password = randomPassword(8, '1234567890');
//     doctor.doctorId = generateId(5);
//     doctor.notActivated = true;
//   });

//   const storedDoctors = await Doctor.insertMany(completeDoctors);

//   console.log(storedDoctors);
//   // remove file from file system
//   await fs.unlink(req.file.path);
//   // handle message
//   let message;
//   if (incompleteDoctors.length > 0) {
//     message =
//       'Some doctors records were incomplete and not added to the database. Please review the following records and ensure all required fields are provided';
//   } else {
//     message = 'All doctors records were successfully added to the database';
//   }

//   res.status(200).json({
//     status: 'success',
//     message,
//     data: {
//       incompleteDoctors,
//       completeDoctors: storedDoctors,
//     },
//   });
// });

exports.uploadDoctorsData = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new appError(400, 'file must be uploaded'));

  const fileContent = await fs.readFile(req.file.path, 'utf-8');
  const doctors = JSON.parse(fileContent);

  // check if all required fields provided for all doctors
  const completeDoctors = [];
  const incompleteDoctors = [];

  doctors.forEach((doctor, index) => {
    if (doctor.name && doctor.email) {
      doctor.password = randomPassword(8, '1234567890');
      doctor.doctorId = generateId(5);
      // doctor.password = '12345678';
      doctor.notActivated = true;
      completeDoctors.push(doctor);
    } else {
      doctor.doctorIndex = index + 1;
      incompleteDoctors.push(doctor);
    }
  });

  const storedDoctor = await Doctor.insertMany(completeDoctors);

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
      completeDoctors: storedDoctor,
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

  if (student.passedCourses.includes(courseCode)) {
    return next(new appError('you have already enrolled in this course'));
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
    'name email role profilePicture -_id'
  );

  res.status(200).json({
    status: 'success',
    data: {
      admin,
    },
  });
});

// upload profile picture

// exports.uploadProfilePicture = catchAsync(async (req, res, next) => {
//   const adminId = req.user.id;

//   // 1) upload image to cloudinary
//   const { secure_url, public_id } = await cloudinary.uploader.upload(
//     req.file.path
//   );

//   // 2) store image in the DB
//   await Admin.findByIdAndUpdate(adminId, {
//     profilePicture: { secure_url, public_id },
//   });

//   await promisify(fs.unlink)(req.file.path);

//   res.status(200).json({
//     status: 'success',
//     message: 'image uploaded successfully',
//     data: { image: secure_url },
//   });
// });

// update profile picture :

// exports.updateProfilePicture = catchAsync(async (req, res, next) => {
//   const adminId = req.user.id;

//   const admin = await Admin.findById(adminId);

//   const { secure_url, public_id } = await cloudinary.uploader.upload(
//     req.file.path
//   );

//   // remove old image from cloudinary
//   await cloudinary.uploader.destroy(admin.profilePicture.public_id);
//   await promisify(fs.unlink)(req.file.path);

//   admin.profilePicture = { secure_url, public_id };
//   await admin.save();
//   res.status(200).json({
//     status: 'success',
//     message: 'profile picture updated successfully',
//     data: { image: secure_url },
//   });
// });
