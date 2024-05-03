const express = require('express');
const adminController = require('./../controllers/admins/adminController');
const adminAuth = require('./../controllers/admins/adminAuth');
const auth = require('./../controllers/auth');
const fileUpload = require('../utils/fileUpload');
const router = express.Router();
const cloudFileUploads = require('./../utils/multerCloud');

router.post('/login', adminAuth.adminLogin);

// these routes for forget password functionalities

// 1) forget password request
router.post('/forgotPassword', adminAuth.forgetPassword);

// 2) confirm password reset code

router.post(
  '/confirmPasswordResetCodeForAdmins',
  adminAuth.confirmPasswordResetCode
);

// 3) password reset
router.post('/passwordResetForAdmins', adminAuth.resetPassword);

// 4) resend password reset confirmation code
router.post(
  '/resendPasswordResetCodeForAdmins',
  adminAuth.resendPasswordResetCode
);

//  -_____ these routes related to change password functionalities _______-

//  change password

router.post(
  '/changePasswordForAdmins',
  auth.protect,
  auth.restrictTo('Admin'),
  adminAuth.changePassword
);

router.get(
  '/logout',
  auth.protect,
  auth.restrictTo('Admin'),
  adminAuth.adminLogout
);

router
  .route('/')
  .post(adminController.addNewAdmin)
  .get(adminController.getAllAdmins);

// router.route('/:id').get(adminController.getAdminById);

// upload data of students and doctors and courses :

router.post(
  '/uploadStudentData',
  auth.protect,
  auth.restrictTo('Admin'),
  fileUpload({ folder: 'studentsData' }).single('studentsData'),
  adminController.uploadStudentData
);

router.post(
  '/uploadDoctorsData',
  auth.protect,
  auth.restrictTo('Admin'),
  fileUpload({ folder: 'DoctorsData' }).single('DoctorsData'),
  adminController.uploadDoctorsData
);

router.post(
  '/enroll',
  auth.protect,
  auth.restrictTo('Admin'),
  adminController.enroll
);

router.get(
  '/viewProfileForAdmin',
  auth.protect,
  auth.restrictTo('Admin'),
  adminController.viewProfileForAdmin
);

router.post(
  '/uploadProfilePicture',
  auth.protect,
  auth.restrictTo('Admin'),
  cloudFileUploads().single('adminProfilePicture'),
  adminController.uploadProfilePicture
);

router.patch(
  '/updateProfilePicture',
  auth.protect,
  auth.restrictTo('Admin'),
  cloudFileUploads().single('adminProfilePicture'),
  adminController.updateProfilePicture
);

module.exports = router;
