const multer = require('multer');

function cloudFileUploads() {
  const storage = multer.diskStorage({});

  const fileFilter = (req, file, cb) => {
    if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpeg') {
      return cb(new appError(400, 'image must be in png or jpg format'), false);
    }

    return cb(null, true);
  };

  const multerUploads = multer({ storage, fileFilter });
  return multerUploads;
}

module.exports = cloudFileUploads;
