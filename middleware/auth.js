import passport from 'passport';
import { User } from '../Modals/user.js';
import jwt from 'jsonwebtoken';
import { ErrorHandler } from '../utils/utils.js';


// const authenticateJWT = (req, res, next) => {
//   passport.authenticate('jwt', { session: false }, (err, user, info) => {
//     console.log(user);

//     if (err) {
//       return next(err);
//     }
//     if (!user) {
//       return res.status(401).json({ message: 'Unauthorized', err });
//     }
//     req.user = user;
//     next();
//   })(req, res, next);
// };

const authenticateJWT = (req, res, next) => {
  // Extract the token from the Authorization header
  const token = req.headers['authorization']?.split(' ')[1]; // 'Bearer <token>'

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized, no token provided' });
  }

  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized', err });
    }

    // Attach the user to the request object
    req.user = user;
    next();
  })(req, res, next);
};



// export const SocketAthenticater = async (err, socket, next) => {
//   // console.log(socket);

//   try {
//     if (err) return next(err);


//     // Extract token from the socket's cookies
//     const token = socket.request.cookies?.token;
//     if (!token) {
//       return next(new ErrorHandler("Please login", 401));
//     }

//     // Verify JWT token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);


//     // Find user by decoded ID, excluding password
//     const user = await User.findById(decoded.id).select('-password');
//     if (!user) {
//       return next(new ErrorHandler("No user found", 401));
//     }

//     // Attach the user to the socket for use in other parts of the app
//     socket.user = user;
//     next();

//   } catch (error) {
//     console.error("Socket Authentication Error:", error);
//     return next(new ErrorHandler("Authentication failed, please login again", 401));
//   }
// };
export const SocketAthenticater = async (err, socket, next) => {
  try {
    if (err) return next(err);

    // Extract token from the socket handshake (query or auth depending on how it was sent)
    const token = socket.handshake.query.token || socket.handshake.auth.token; // Check both 'query' and 'auth' for the token
    if (!token) {
      return next(new ErrorHandler("Please login", 401));
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by decoded ID, excluding password
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new ErrorHandler("No user found", 401));
    }

    // Attach the user to the socket for use in other parts of the app
    socket.user = user;
    next();

  } catch (error) {
    console.error("Socket Authentication Error:", error);
    return next(new ErrorHandler("Authentication failed, please login again", 401));
  }
};
// export const authenticateJWT = (req, res, next) => {
//   if (req.isAuthenticated()) {
//     return next();
//   } else {
//     res.status(401).json({ message: 'Unauthorized' });
//   }
// };



export default authenticateJWT;