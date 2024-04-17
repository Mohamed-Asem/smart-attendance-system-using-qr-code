const mongoose = require('mongoose');
const validator = require('validator');
// const bcrypt = require('bcryptjs');
const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student must have name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'provide your email address'],
      lowercase: true,
      unique: [true, 'email must be unique'],
      validate: {
        validator: validator.isEmail,
        message: 'Enter a valid email',
      },
    },
    doctorId: {
      type: String,
      required: [true, 'doctor must have unique ID'],
    },
    photo: String,
    role: {
      type: String,
      default: 'Doctor',
      enum: ['Doctor'],
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
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// hashing password
// doctorSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) {
//     next();
//   }

//   this.password = await bcrypt.hash(this.password, 12);

//   next();
// });

//check if the doctor has changed his password after token has issued
doctorSchema.methods.checkIfDoctorChangedPasswordAfterTokenIssued = function (
  jwttimestamps
) {
  if (this.passwordChangedAt) {
    const time = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwttimestamps < time;
  }
  return false;
};

// generate password reset code for students :
doctorSchema.methods.generatePasswordResetCodeForDoctors = function () {
  this.passwordResetCode = Math.floor(1000 + Math.random() * 9000);
  this.passwordResetCodeExpireIn = Date.now() + 120 * 1000;

  return this.passwordResetCode;
};

// virtual populate to get courses of doctor:

doctorSchema.virtual('courses', {
  ref: 'Course',
  foreignField: 'doctorId',
  localField: '_id',
});

const Doctor = mongoose.model('Doctor', doctorSchema);
module.exports = Doctor;
