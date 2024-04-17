const QrCode = require('qrcode');

async function generateQrCode(qrData) {
  const qrCode = QrCode.toDataURL(qrData);
  return qrCode;
}

module.exports = generateQrCode;
