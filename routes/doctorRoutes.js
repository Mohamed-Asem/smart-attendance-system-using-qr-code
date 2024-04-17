const express = require('express');
const doctorController = require('./../controllers/doctor/doctorController');
const doctorAuth = require('./../controllers/doctor/doctorAuth');
const adminAuth = require('./../controllers/admins/adminAuth');
const auth = require('./../controllers/auth');

const router = express.Router();

router.post('/login', doctorAuth.doctorLogin);

// these routes for forget password functionalities

// 1) forget password request
router.post('/forgotPassword', doctorAuth.forgetPassword);

// 2) confirm password reset code

router.post(
  '/confirmPasswordResetCodeForDoctors',
  doctorAuth.confirmPasswordResetCode
);

// 3) password reset
router.post('/passwordResetForDoctors', doctorAuth.resetPassword);

// 4) resend password reset confirmation code
router.post(
  '/resendPasswordResetCodeForDoctors',
  doctorAuth.resendPasswordResetCode
);

// 3) change password

router.post(
  '/changePasswordForDoctors',
  auth.protect,
  auth.restrictTo('Doctor'),
  doctorAuth.changePassword
);

router.get(
  '/logout',
  auth.protect,
  auth.restrictTo('Doctor'),
  doctorAuth.doctorsLogout
);

router.get(
  '/viewProfileForDoctors',
  auth.protect,
  auth.restrictTo('Doctor'),
  doctorController.viewProfileForDoctors
);

router.get(
  '/takeAttendance/:courseId/:lectureId',
  auth.protect,
  auth.restrictTo('Doctor'),
  doctorController.takeAttendance
);

router
  .route('/')
  .get(auth.protect, auth.restrictTo('Admin'), doctorController.getAllDoctors)
  .post(auth.protect, auth.restrictTo('Admin'), doctorController.addNewDoctor);

router
  .route('/:id')
  .delete(auth.protect, auth.restrictTo('Admin'), doctorController.deleteDoctor)
  .get(
    auth.protect,
    auth.restrictTo('Doctor', 'Admin'),
    doctorController.getDoctorById
  )
  .patch(auth.protect, auth.restrictTo('Admin'), doctorController.updateDoctor);

router.post(
  '/getDoctorByEmail',
  auth.protect,
  auth.restrictTo('Admin'),
  doctorController.getDoctorByEmail
);

module.exports = router;
