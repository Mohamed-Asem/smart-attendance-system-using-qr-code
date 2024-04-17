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

  const doctor = await Doctor.findById(id);
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
  const doctor = await Doctor.findOne({ email }).select('-passwordChangedAt');
  if (!doctor) return next(404, 'this doctor does not exist');

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
  const updatedDoctor = await Doctor.findByIdAndUpdate(id, req.body, {
    new: true,
  });

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
  const doctor = await Doctor.findById(req.user.id).select(
    'name email role photo doctorId -_id'
  );

  res.status(200).json({
    status: 'success',
    data: {
      doctor,
    },
  });
});

exports.takeAttendance = catchAsync(async (req, res, next) => {
  const { courseId, lectureId } = req.params;

  // ensure that we did not create attendance records for this lecture before
  const currentLecture = await Lecture.findById(lectureId).select(
    '+attendanceRecorded'
  );

  if (!currentLecture.attendanceRecorded) {
    // mark the lecture so we do not create attendance records for it again
    currentLecture.attendanceRecorded = true;
    await currentLecture.save({ validateBeforeSave: false });

    const students = await Student.find({ courses: courseId }).select(
      '_id name'
    );
    // create attendance records
    await Promise.all(
      students.map(async student => {
        // Create attendance record
        const attendance = new Attendance({
          studentId: student._id,
          studentName: student.name,
          lecture: lectureId,
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
