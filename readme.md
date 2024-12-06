# Smart and Automated Attendance System - Backend

This is the backend service for the **Smart and Automated Attendance System**. The system automates attendance tracking for college students using QR codes. The backend is built using the **Express.js** framework and **MongoDB** as the database.

---

## Features

- **User Authentication**: Secure login for admins, doctors, and students.
- **Doctor Functionalities**:
  - View assigned courses and their lectures.
  - Generate and display QR codes for attendance.
  - View attendance for individual lectures or the entire course.
  - Manually mark attendance for students in case of issues.
- **Admin Functionalities**:
  - Perform CRUD operations for managing doctors, students, and courses.
- **Student Functionalities**:
  - Register attendance by scanning QR codes via a mobile app.
  - Attendance restricted to:
    - Valid QR code display period.
    - College's geographical scope.
- **Security**:
  - Time-bound QR code validity.
  - Geofencing to prevent attendance fraud.
- **Database Management**:
  - Efficient handling of course, lecture, and attendance data using MongoDB.

---

## Tech Stack

- **Backend Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JSON Web Tokens (JWT)
- **Environment Configuration**: Dotenv

---
