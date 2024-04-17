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
    },
    attendanceRecorded: {
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
