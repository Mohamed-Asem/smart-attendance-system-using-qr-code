const mongoose = require('mongoose');
const dotenv = require('dotenv');

// handling uncaught exceptions :

process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION 🙂 .. shutting down the server 🫡');
  console.log(err.name, err.message, err);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

mongoose
  .connect('mongodb://127.0.0.1:27017/qrAttendence')
  .then(() => console.log('DB connected successfully'));

const server = app.listen(process.env.PORT, () => {
  console.log(`server now listen on port ${process.env.PORT}`);
});

process.on('unhandledRejection', err => {
  console.log('Unhandled Rejection 🙂 .. shutting down the server 🫡');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
