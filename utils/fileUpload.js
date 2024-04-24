const multer = require('multer');
const appError = require('./appError');

function fileUploads({ folder }) {
  const storage = multer.diskStorage({
    destination: `uploads/${folder}`,
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });

  // we only accept json file format

  const fileFilter = (req, file, cb) => {
    if (file.mimetype !== 'application/json') {
      return cb(
        new appError(400, 'Invalid format!, File must be in json format'),
        false
      );
    }

    return cb(null, true);
  };
  const multerUploads = multer({ storage, fileFilter });
  return multerUploads;
}

module.exports = fileUploads;
