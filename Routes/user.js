import express from 'express'
import passport from 'passport';
import { acceptrequest, Friendlist, getallnotification, login, logout, register, removenotification, sendrequest, serachuser, updatepassword, updateuserinfo, viewmyprofile, viewprofile } from '../controllers/user.js'
import { sendtoken } from '../utils/features.js'
import authenticateJWT from '../middleware/auth.js';
import { multersingle } from '../middleware/multer.js';
import { User } from '../Modals/user.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
const app = express.Router()


app.post("/login", login)
// app.post('/login', passport.authenticate('local', { session: true }), (req, res) => {
//   console.log(req.user);

//   res.json({ success: true,user:req.user, message: 'Logged in successfully' });
// });
app.post('/register', register)


app.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// app.get('/google/callback',
//   passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
//   async (req, res) => {
//     // Generate and send JWT token
//     const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '3d' }); // JWT with 3 days expiration

//     // Set the JWT token in a cookie
//     res.json({
//       message: 'Authentication successful',
//       token: token,
//     });
//     // Redirect to frontend URL
//     res.redirect(`${process.env.FRONTEND_URL}`);
//   }
// );
app.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  async (req, res) => {
    try {
      // Generate the JWT token
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '3d' });

      // Redirect the user to the frontend with the token
      res.redirect(`http://localhost:3000/google/callback?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error.message);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
);


// app.get('/google/callback', 
//   passport.authenticate('google', { session: false, failureRedirect: 'http://localhost:3000/login' }), 
//   (req, res) => {
//     res.redirect('http://localhost:3000');
//   }
// );



app.get('/protected', authenticateJWT, (req, res) => {
  console.log('Cookies:', req.cookies);
  res.json({ message: 'This is a protected route', user: req.user });
});
app.use(authenticateJWT);
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.clearCookie('token'); // Clear the JWT cookie
    res.status(200).json({ message: 'Logged out successfully' });

  });
});
// app.get('/logout',logout);
app.put("/editinfo", multersingle, updateuserinfo)
app.put("/changepassword", multersingle, updatepassword)
app.get("/search", serachuser)
app.get("/friendlist", Friendlist)
app.post("/sendrequest", sendrequest)
app.delete("/removenotifications", removenotification)
app.post("/acceptrequest", acceptrequest)
app.get("/getallnotification", getallnotification)
app.get("/viewprofile/:id", viewprofile)
app.get("/myprofile", viewmyprofile)







export default app