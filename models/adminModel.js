const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
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
  profilePicture: { secure_url: String, public_id: String },
  role: {
    type: String,
    default: 'Admin',
    enum: ['Admin'],
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
});

// hashing password
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

adminSchema.methods.generatePasswordResetCodeForAdmins = function () {
  this.passwordResetCode = Math.floor(1000 + Math.random() * 9000);
  this.passwordResetCodeExpireIn = Date.now() + 120 * 1000;

  return this.passwordResetCode;
};

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
