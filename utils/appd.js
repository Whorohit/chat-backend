import express from 'express';
import dotenv from 'dotenv';
import { mongodbsend } from './utils/features.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import { v2 as cloudinary } from 'cloudinary';
import userroute from './Routes/user.js';
import chatroute from './Routes/chat.js';
import { errorMiddleware } from './utils/error.js';
import cors from 'cors';
import { User } from './Modals/user.js';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt'; // Import Passport configuration

dotenv.config({ path: './.env' });

const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

cloudinary.config({
  cloud_name: "draztbm6c",
  api_key: "541128731778475",
  api_secret: "0KplNPzksSJvqXgSono125cbwCc"
});

mongodbsend(process.env.MONGO_URI);

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Change to true if using HTTPS
    httpOnly: true,
    maxAge: 3 * 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cors(corsOptions));
// passport.serializeUser((user, done) => {
//   done(null, user._id);
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     const user = await User.findById(id);
//     if (user) {
//       done(null, user);
//     } else {
//       done(new Error('User not found'), null);
//     }
//   } catch (err) {
//     done(err, null);
//   }
// });

// Local Strategy
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return done(null, false, { message: 'Incorrect email.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// Google Strategy
// passport.use(new GoogleStrategy({
//   clientID: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   callbackURL: '/api/user/google/callback',
// }, async (accessToken, refreshToken, profile, done) => {
//   try {
//     const email = profile.emails[0].value;
//     let user = await User.findOne({ email });

//     if (!user) {
//       // Optionally, create a new user if not found
//       // user = new User({
//       //   email,
//       //   username: profile.displayName,
//       //   // other fields
//       // });
//       // await user.save();
//       return done(null, false, { message: 'User not found' });
//     }

//     return done(null, user);
//   } catch (err) {
//     return done(err);
//   }
// }));

app.use('/api/user', userroute);
app.use('/api/chat', chatroute);

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});
