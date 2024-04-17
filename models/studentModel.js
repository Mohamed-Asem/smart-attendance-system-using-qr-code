const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Student must have name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Student must have an email address'],
    lowercase: true,
    unique: [true, 'email must be unique'],
    validate: {
      validator: validator.isEmail,
      message: 'Enter a valid email',
    },
  },
  studentId: {
    type: String,
    unique: true,
  },
  level: {
    type: Number,
    required: [true, 'Student must have level'],
    enum: {
      values: [1, 2, 3, 4],
      message: 'student level must be 1 or 2 or 3 or 4',
    },
  },
  courses: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
    },
  ],
  passedCourses: [
    {
      type: String,
      ref: 'Course', // we cannot populate this fields we will only use them in course enrollment 
    },
  ],
  role: {
    type: String,
    default: 'Student',
    enum: ['Student'],
  },
  password: {
    type: String,
    required: [true, 'Enter your password'],
    minlength: [8, 'password length should not be below 8 characters'],
    select: false,
  },
  passwordResetCode: Number,
  passwordResetCodeExpireIn: Date,
  allowedToResetPassword: Boolean,
  passwordChangedAt: Date,
  notActivated: Boolean,
});

// hashing password

// studentSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) {
//     next();
//   }

//   this.password = await bcrypt.hash(this.password, 12);

//   next();
// });

// check if the user has changed the password after the token issued
studentSchema.methods.checkIfStudentChangedPasswordAfterTokenIssued = function (
  jwttimestamps
) {
  if (this.passwordChangedAt) {
    const time = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwttimestamps < time;
  }
  return false;
};

// generate password reset code for students :
studentSchema.methods.generatePasswordResetCodeForStudent = function () {
  this.passwordResetCode = Math.floor(1000 + Math.random() * 9000);
  this.passwordResetCodeExpireIn = Date.now() + 120 * 1000;

  return this.passwordResetCode;
};

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
