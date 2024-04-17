const Lecture = require('./../models/lectureModel');
const catchAsync = require('./../utils/catchAsync');
const appError = require('./../utils/appError');

exports.addNewLecture = catchAsync(async (req, res, next) => {
  const { title, lectureNumber, courseId } = req.body;
  const lecture = await Lecture.create({ title, lectureNumber, courseId });
  res.status(201).json({
    status: 'success',
    data: {
      lecture,
    },
  });
});
