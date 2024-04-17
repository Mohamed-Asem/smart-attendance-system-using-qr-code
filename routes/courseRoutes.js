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

module.exports = router;

/*

1) add new course 

2) get course by id 

3) update course content 

4) 


*/
