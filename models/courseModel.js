const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    courseName: {
      type: String,
      required: true,
    },
    courseCode: {
      type: String,
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Doctor',
    },
    prerequisites: [String],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// virtual populate to get course with all lectures
courseSchema.virtual('lectures', {
  ref: 'Lecture',
  foreignField: 'courseId',
  localField: '_id',
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
