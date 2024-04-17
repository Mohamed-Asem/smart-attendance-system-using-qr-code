const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Student',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    courseId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: true,
    },
    lecture: {
      type: mongoose.Schema.ObjectId,
      ref: 'Lecture',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['present', 'absent'],
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
