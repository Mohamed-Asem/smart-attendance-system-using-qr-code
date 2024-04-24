const express = require('express');
const courseController = require('./../controllers/courseController');
const auth = require('./../controllers/auth');
const router = express.Router({ mergeParams: true });

// get all courses of specific doctor :
router.get(
  '/getDoctorCourses',
  auth.protect,
  auth.restrictTo('Doctor'),
  courseController.getDoctorCourses
);

router
  .route('/')
  .get(auth.protect, auth.restrictTo('Admin'), courseController.getAllCourses)
  .post(auth.protect, auth.restrictTo('Admin'), courseController.addNewCourse)
  .delete(
    auth.protect,
    auth.restrictTo('Admin'),
    courseController.deleteCourseByCourseCode
  );

router
  .route('/:id')
  .get(
    auth.protect,
    auth.restrictTo('Admin', 'Doctor'),
    courseController.getCourseById
  )
  .delete(
    auth.protect,
    auth.restrictTo('Admin'),
    courseController.deleteCourseById
  )
  .patch(auth.protect, auth.restrictTo('Admin'), courseController.updateCourse);

router.post(
  '/getCourseByCourseCode',
  auth.protect,
  courseController.getCourseByCourseCode
);

router.post(
  '/addCourseLectures/:courseId',
  auth.protect,
  auth.restrictTo('Admin'),
  courseController.addCourseLectures
);

router.get(
  '/getCourseLectures/:lectureId',
  auth.protect,
  auth.restrictTo('Admin', 'Doctor'),
  courseController.findLectureById
);
router.delete(
  '/deleteCourseLectures/:lectureId',
  auth.protect,
  auth.restrictTo('Admin'),
  courseController.deleteLectureById
);

router.patch(
  '/updateCourseLectures/:lectureId',
  auth.protect,
  auth.restrictTo('Admin'),
  courseController.updateLectureById
);

router.post(
  '/addSingleLecture/:courseId',
  auth.protect,
  auth.restrictTo('Admin'),
  courseController.addSingleLecture
);
module.exports = router;
