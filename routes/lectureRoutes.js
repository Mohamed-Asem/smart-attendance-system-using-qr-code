const express = require('express');
const lectureControllers = require('./../controllers/lectureController');
const auth = require('./../controllers/auth');
const router = express.Router();

// add new lecture
router
  .route('/')
  .post(
    auth.protect,
    auth.restrictTo('Admin'),
    lectureControllers.addNewLecture
  );

module.exports = router;
