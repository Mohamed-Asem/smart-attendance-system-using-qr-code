const mongoose = require('mongoose');

const blackListTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
});

const BlackListToken = mongoose.model('BlackListToken', blackListTokenSchema);
module.exports = BlackListToken;
