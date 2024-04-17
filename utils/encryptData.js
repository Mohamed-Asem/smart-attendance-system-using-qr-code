const crypto = require('crypto');

const encryptData = (data, secretKey) => {
  const cipher = crypto.createCipher('aes-256-cbc', secretKey);
  let encryptedData = cipher.update(data, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  return encryptedData;
};

module.exports = encryptData;
