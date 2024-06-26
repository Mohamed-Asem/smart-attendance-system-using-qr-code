const fs = require('fs');
const randomPassword = require('random-password');
const Doctor = require('./../../models/doctorModel');
const Student = require('./../../models/studentModel');
const Attendance = require('./../../models/attendanceModel');
const Lecture = require('./../../models/lectureModel');
const generateUniqueId = require('./../../utils/generateUniqueId');
const generateQrCode = require('./../../utils/qrGenerator');
const catchAsync = require('../../utils/catchAsync');
const appError = require('../../utils/appError');
const encryptData = require('./../../utils/encryptData');
const cloudinary = require('./../../utils/cloud');
const { promisify } = require('util');

exports.addNewDoctor = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;
  if (!name || !email)
    return next(new appError(400, "Enter doctor's name and email"));

  const doctorId = generateUniqueId(5);
  const password = randomPassword(8, '1234567890');
  const notActivated = true;

  const doctor = await Doctor.create({
    name,
    email,
    doctorId,
    password,
    notActivated,
  });

  res.status(201).json({
    status: 'success',
    data: {
      doctor,
    },
  });
});

exports.getAllDoctors = catchAsync(async (req, res, next) => {
  const doctors = await Doctor.find();
  res.status(200).json({
    status: 'success',
    data: {
      doctors,
    },
  });
});

exports.getDoctorById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doctor = await Doctor.findById(id).populate({
    path: 'courses',
    select: 'courseName',
  });
  if (!doctor) {
    return next(new appError(404, 'This doctor does not exist'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      doctor,
    },
  });
});

exports.getDoctorByEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email)
    return next(new appError(400, "Enter doctor's email to get his data"));
  const doctor = await Doctor.findOne({ email }).populate({
    path: 'courses',
    select: 'courseName',
  });

  if (!doctor) return next(new appError(404, 'this doctor does not exist'));

  res.status(200).json({
    status: 'success',
    data: {
      doctor,
    },
  });
});

exports.deleteDoctor = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const doctor = await Doctor.findByIdAndDelete(id);
  if (!doctor) {
    return next(new appError(404, 'this student does not exist'));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateDoctor = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, email } = req.body;
  if (!name || !email) {
    return next(
      new appError(400, "Enter doctor's name and email to be updated")
    );
  }
  const updatedDoctor = await Doctor.findByIdAndUpdate(
    id,
    { name, email },
    {
      new: true,
    }
  );

  if (!updatedDoctor)
    return next(new appError(404, 'this doctor does not exist'));

  res.status(200).json({
    status: 'success',
    data: {
      updatedDoctor,
    },
  });
});

exports.viewProfileForDoctors = catchAsync(async (req, res, next) => {
  // doctor must be authenticated to use this function :
  const doctor = await Doctor.findById(req.user.id).populate({
    path: 'courses',
    select: 'courseName -doctorId',
  });

  const doctorData = {
    name: doctor.name,
    email: doctor.email,
    doctorId: doctor.doctorId,
    role: doctor.role,
    courses: doctor.courses,
    profilePicture: doctor.profilePicture.secure_url,
  };

  res.status(200).json({
    status: 'success',
    data: {
      doctor: doctorData,
    },
  });
});

exports.takeAttendance = catchAsync(async (req, res, next) => {
  const { courseId, lectureId } = req.params;

  // ensure that we did not create attendance records for this lecture before
  const currentLecture = await Lecture.findById(lectureId).select(
    '+attendanceRecorded +lockedAttendance'
  );

  if (!currentLecture) {
    return next(new appError(404, 'this lecture does not exist'));
  }

  // allow students to recording their attendance for this lecture :
  currentLecture.lockedAttendance = false;
  await currentLecture.save({ validateBeforeSave: false });

  if (!currentLecture.attendanceRecorded) {
    // mark the lecture so we do not create attendance records for it again
    currentLecture.attendanceRecorded = true;
    currentLecture.lockedAttendance = false;
    await currentLecture.save({ validateBeforeSave: false });

    const students = await Student.find({ courses: courseId }).select(
      '_id name studentId'
    );

    // create attendance records
    await Promise.all(
      students.map(async student => {
        // Create attendance record
        const attendance = new Attendance({
          studentId: student._id,
          studentCode: student.studentId,
          studentName: student.name,
          lectureId: lectureId,
          lectureNumber: currentLecture.lectureNumber,
          courseId: courseId,
          token: `${courseId}${lectureId}${student._id}`,
          status: 'absent', // Set default status to 'absent'
        });

        // Save attendance record to the database
        await attendance.save();
      })
    );
  }

  // encoding qr code data
  const qrData = encryptData(
    `${courseId},${lectureId}`,
    process.env.QR_SECRETKEY
  );

  // generate qr code to send it back to the doctor
  const qrCode = await generateQrCode(qrData);
  res.status(200).json({
    status: 'success',
    data: {
      qrCode,
    },
  });
});

// endpoint to prevent students to record their attendance after closing qr code by the doctor

exports.closeQr = catchAsync(async (req, res, next) => {
  const { lectureId } = req.params;
  await Lecture.findByIdAndUpdate(lectureId, { lockedAttendance: true });

  res.status(200).json({
    status: 'success',
    message:
      'Registration for student attendance for this lecture has been closed successfully',
  });
});

exports.viewCourseAttendance = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const attendanceRecords = await Attendance.find({ courseId });
  const attendanceData = {};
  attendanceRecords.forEach(record => {
    const { studentId, studentName, lectureNumber, status } = record;
    if (!attendanceData[studentId]) {
      attendanceData[studentId] = { studentName, attendances: [] };
    }
    attendanceData[studentId].attendances.push({ lectureNumber, status });
  });

  // Transform attendanceData into array format for frontend representation
  const attendanceArray = Object.values(attendanceData).map(student => {
    return {
      studentName: student.studentName,
      attendances: student.attendances,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      attendance: attendanceArray,
    },
  });
});

exports.viewLectureAttendance = catchAsync(async (req, res, next) => {
  const { lectureId } = req.params;
  const attendanceRecords = await Attendance.find({ lectureId }).select(
    'studentName status studentCode'
  );

  res.status(200).json({
    success: true,
    data: {
      attendanceRecords,
    },
  });
});

exports.changeStudentAttendanceStatus = catchAsync(async (req, res, next) => {
  const { recordId } = req.params;
  const record = await Attendance.findById(recordId).select(
    'studentName status'
  );
  if (!record) return next(new appError(404, 'this record is not exist'));
  if (record.status === 'absent') {
    record.status = 'present';
    await record.save();
  } else {
    record.status = 'absent';
    await record.save();
  }
  res.status(200).json({
    status: 'success',
    message: `student marked as ${record.status} successfully`,
    data: {
      studentAttendance: record,
    },
  });
});

exports.uploadProfilePicture = catchAsync(async (req, res, next) => {
  const doctorId = req.user.id;

  if (!req.file) {
    return next(
      new appError(400, 'file did not uploaded! .. please try again')
    );
  }
  // 1) upload image to cloudinary
  const { secure_url, public_id } = await cloudinary.uploader.upload(
    req.file.path
  );

  await Doctor.findByIdAndUpdate(doctorId, {
    profilePicture: { secure_url, public_id },
  });

  await promisify(fs.unlink)(req.file.path);

  res.status(200).json({
    status: 'success',
    message: 'image uploaded successfully',
    data: { image: secure_url },
  });
});

exports.updateProfilePicture = catchAsync(async (req, res, next) => {
  const doctorId = req.user.id;

  if (!req.file) {
    return next(
      new appError(400, 'file did not uploaded! .. please try again')
    );
  }

  const doctor = await Doctor.findById(doctorId);

  if (!doctor.profilePicture) {
    return next(
      new appError(
        400,
        'you have not uploaded profile picture yet please go and upload one'
      )
    );
  }

  const { secure_url, public_id } = await cloudinary.uploader.upload(
    req.file.path
  );

  // remove old image from cloudinary
  await cloudinary.uploader.destroy(doctor.profilePicture.public_id);

  doctor.profilePicture = { secure_url, public_id };
  await doctor.save();
  res.status(200).json({
    status: 'success',
    message: 'profile picture updated successfully',
    data: { image: secure_url },
  });
});
