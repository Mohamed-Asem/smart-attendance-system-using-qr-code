const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Lecture must have a title'],
    },
    courseId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
    },
    lectureNumber: {
      type: Number,
      required: [true, 'Lecture must have a number'],
      min: [1, 'lecture number must be between 1 and 12'],
      max: [12, 'lecture number must be between 1 and 12'],
    },
    uniqueLecture: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    attendanceRecorded: {
      type: Boolean,
      select: false,
    },
    lockedAttendance: {
      type: Boolean,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Lecture = mongoose.model('Lecture', lectureSchema);
module.exports = Lecture;
