const studentController = require('./../controllers/student/studentController');
const studentAuth = require('./../controllers/student/studentAuth');
const auth = require('./../controllers/auth');
const express = require('express');

const router = express.Router();

router.post('/login', studentAuth.studentLogin);

// these 3 routes related to forget password functionality
// 1) forget password:
router.post('/forgotPassword', studentAuth.forgetPassword);

// 2) confirm password reset code
router.post(
  '/confirmPasswordResetCodeForStudents',
  studentAuth.confirmPasswordResetCode
);

// 3) reset password
router.post('/resetPassword', studentAuth.resetPassword);

// 4) resend password reset code
router.post('/resendPasswordResetCode', studentAuth.resendPasswordResetCode);

// these 4 routes related to change password functionality:

//1) change password request
// router.get(
//   '/requestToChangePassword',
//   studentAuth.protect,
//   studentAuth.restrictTo('Student'),
//   studentAuth.requestToChangePassword
// );

// 2) confirm change password code

// router.post(
//   '/changePasswordConfirm',
//   studentAuth.protect,
//   studentAuth.restrictTo('Student'),
//   studentAuth.confirmPasswordChangeCode
// );

// 3) change password:

router.post(
  '/changePassword',
  auth.protect,
  auth.restrictTo('Student'),
  studentAuth.changePassword
);

// 4) resend change password code

// router.get(
//   '/resendChangePasswordCode',
//   studentAuth.protect,
//   studentAuth.restrictTo('Student'),
//   studentAuth.resendChangePasswordCode
// );

// logout
router.get(
  '/logout',
  auth.protect,
  auth.restrictTo('Student'),
  studentAuth.studentsLogout
);

router.get(
  '/viewProfile',
  auth.protect,
  auth.restrictTo('Student'),
  studentController.viewProfile
);

router.post(
  '/scanQr',
  auth.protect,
  auth.restrictTo('Student'),
  studentController.scan
);

//////////////////////////// will be used by Admins only ////////////////////////////

router
  .route('/')
  .post(auth.protect, auth.restrictTo('Admin'), studentController.addNewStudent)
  .get(
    auth.protect,
    auth.restrictTo('Admin'),
    studentController.getAllStudents
  );

router
  .route('/:id')
  .get(auth.protect, auth.restrictTo('Admin'), studentController.getStudentById)
  .delete(
    auth.protect,
    auth.restrictTo('Admin'),
    studentController.deleteStudent
  )
  .patch(
    auth.protect,
    auth.restrictTo('Admin'),
    studentController.updateStudent
  );

//get student by email address
router.post(
  '/getStudentByEmail',
  auth.protect,
  auth.restrictTo('Admin'),
  studentController.getStudentByEmail
);

module.exports = router;
