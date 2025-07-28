# Social Media App

A full-featured Social Media Backend API built with Node.js and Express, supporting modern authentication methods, secure user data management, and seamless media upload functionalities. Designed to power dynamic social applications with robust user experiences.

## Features

### User Authentication
- Supports login and registration via Google OAuth 2.0 or traditional email/password.
- Authentication tokens issued using JWT (JSON Web Tokens).
- Passwords are hashed securely using bcrypt.

### Profile Management
- Users can create and manage their profiles.
- Email verification and password recovery features are supported via Nodemailer.

### Media Uploads
- Users can upload profile pictures and media posts.
- File handling implemented with Multer.
- Uploaded content is stored and delivered efficiently using Cloudinary.

### Security & Validation
- Input validation handled with Joi.
- Environment variables managed securely using dotenv.
- Enhanced API security using Helmet for HTTP headers and CORS for cross-origin resource sharing control.

## Tech Stack
| Technology | Usage |
|------------|-------|
| Node.js | Server-side runtime |
| Express.js | Backend web framework |
| MongoDB |	NoSQL database for user and media data |
| JWT | Secure token-based authentication |
| Google OAuth | Third-party login with Google |
| bcrypt | Secure password hashing |
| Nodemailer | Email service for verification and recovery |
| Multer | Handling multipart/form-data for file uploads |
| Cloudinary | Media storage and delivery |
| Joi | Request validation |
| dotenv | Manage environment variables |
| Helmet | Set secure HTTP headers |
| CORS | Configure cross-origin access |

