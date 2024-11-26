import express from 'express';
import dotenv from 'dotenv';
import { mongodbsend } from './utils/features.js';
import cookieParser from 'cookie-parser';
import { createServer } from 'http'
import session from 'express-session';
import passport from 'passport';
import { v4 as uuid } from 'uuid'
import { v2 as cloudinary } from 'cloudinary';
import userroute from './Routes/user.js';
import chatroute from './Routes/chat.js';
import { errorMiddleware } from './utils/error.js';
import { Server } from "socket.io";
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import cors from 'cors';
import { User } from './Modals/user.js';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt'; // Import Passport configuration
import { createArchived, createFakeFriends, createmessages, createSampleChat, createUser } from './helper/fake.js';
import { SocketAthenticater } from './middleware/auth.js';
import { Friend } from './Modals/friends.js';
import { NEW_MESSAGE_ALERT, NEW_MESSAGES, START_TYPING } from './constant/event.js';
import { Messages } from './Modals/message.js';
import { getSockets } from './helper/help.js';
import { Chat } from './Modals/chat.js';
import { Call } from './Modals/Call.js';
import { Request } from './Modals/request.js';
const app = express();
const port = process.env.PORT || 5000;
dotenv.config({ path: './.env' });
export const onlineusers = new Map();
export const callusers = new Map();
const corsOptions = {
  origin: 'http://localhost:3000', // Dynamically allow any site
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // Allow credentials
};

const server = createServer(app);
cloudinary.config({
  cloud_name: "draztbm6c",
  api_key: "541128731778475",
  api_secret: "0KplNPzksSJvqXgSono125cbwCc"
});

mongodbsend(process.env.MONGO_URI);




app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(corsOptions));


app.use(session({
  secret: process.env.SESSION_SECRET ,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Change to true if using HTTPS
    httpOnly: true,
    sameSite: 'none',
    maxAge: 3 * 24 * 60 * 60 * 1000 // 1 day
  }
}));


const io = new Server(server, {
  cors: corsOptions
})
app.set("io", io)
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (user) {
      done(null, user);
    } else {
      done(new Error('User not found'), null);
    }
  } catch (err) {
    done(err, null);
  }
});

const opts = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      console.log(req.cookie);
      return req.cookies.token; // Extract JWT from cookies
    }
  ]),
  secretOrKey: process.env.JWT_SECRET, // JWT secret key
};

passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
  try {
    const user = await User.findById(jwt_payload.id);
    console.log(user);
    console.log(jwt_payload);


    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  } catch (err) {
    done(err, false);
  }
}));
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
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/user/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = await User.findOne({ email });

    if (!user) {
      // Optionally, create a new user if not found
      // user = new User({
      //   email,
      //   username: profile.displayName,
      //   // other fields
      // });
      // await user.save();
      return done(null, false, { message: 'User not found' });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

app.use('/api/user', userroute);
app.use('/api/chat', chatroute);
app.get("/", (req, res) => res.send("Express on  bro  Vercel"))


io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res || {}, async (err) => {
    await SocketAthenticater(err, socket, next);
  });
});
io.on("connection", async (socket) => {
  const user = socket.user

  // userSocketIDs.set(user._id.toString(), socket.id)
  onlineusers.set(user._id.toString(), socket.id);
  try {
    const userfriends = await Friend.find({
      friends: user._id
    })
    const allfriends = userfriends.flatMap((chat) => chat.friends).flat().filter((friend) => friend._id.toString() !== user._id.toString())
    for (const friend of allfriends) {
      const friendId = friend._id.toString();
      if (onlineusers.has(friendId)) {
        const friendSocketId = onlineusers.get(friendId);
        io.to(friendSocketId).emit('friendOnline', { friendId: user._id.toString() });
      }
    }
    const onlineFriends = allfriends.filter(friend => onlineusers.has(friend._id.toString()));
    socket.emit('onlineFriendsList', onlineFriends.map(f => f._id.toString()));

  } catch (error) {
    console.log(error);

  }

  socket.on("NEW_MESSAGE", async ({ chatId, messages, members }) => {
    console.log(chatId, messages, members);


    const messageforRealtime = {
      content: messages,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name
      },
      chat: chatId,
      createdAt: new Date().toISOString()
    }
    console.log("emtting");
    const messageForDB = {
      content: messages,
      sender: user._id,
      chat: chatId,
    }
    const chat = await Chat.findById(chatId)
    if (!chat) {
      console.error("Chat not found");
      return;
    }
    if (!chat.visible) {
      chat.visible = true;
      await chat.save(); // Update the chat in the database
    }



    const memberssockets = getSockets(members);

    console.log(memberssockets);



    io.to(memberssockets).emit("NEW_MESSAGE", {
      chat: chatId,
      message: messageforRealtime
    })
    io.to(memberssockets).emit("NEW_MESSAGE_ALERT", {
      chatId,

    })
    try {
      await Messages.create(messageForDB);
    } catch (error) {
      throw new Error(error);
    }



  })
  socket.on("START_TYPING", async ({ members, chatId }) => {
    const memberssockets = getSockets(members);
    io.to(memberssockets).emit("START_TYPING", { chatId });
  });

  socket.on("STOP_TYPING", async ({ members, chatId }) => {
    const membersSockets = getSockets(members);
    io.to(membersSockets).emit("STOP_TYPING", { chatId, });
  });
  socket.on('offer', async (data) => {
    // console.log(data, "offer");
    try {

      const { id, from, to, members, isVideo } = data
      // console.log(data);
      const allMembers = [];


      if (callusers.size !== 0) {
        callusers.forEach(value => {
          allMembers.push(...value.members);// Spread operator to push all values in the 'member' array
        });
      }

      const Calltype = isVideo == true || null ? "Video" : "Voice"
      const call = await Call.create({
        chat: id,
        from: from._id,
        to: to._id,
        Calltype
      })

      const membersSockets = getSockets([to._id]);
      if (allMembers.includes(to._id)) {
        console.log("ghhhh")
        const member = getSockets([from._id]);



        call.status = "missed"; // Or "rejected" if you prefer
        call.receiverStatus = "missed";
        call.callerStatus = "ended";
        call.endTime = call.startTime;

        if (member) {
          io.to(member).emit('busy', "Busy"); // Use io.to for explicit targeting
          // Or use socket.emit if you want to directly emit to the same socket instance
          // socket.emit('busy', "Busy");
        } else {
          console.error("Sender socket not found for 'from._id'");
        }

        socket.to(membersSockets).emit('REQUEST', "Missed Call")

        const [callreq, notireq] = await Promise.all([
          call.save(), Request.create(
            {
              user: to._id,
              sender: from._id,
              type: "call",
            }
          )
        ])

      }
      else {
        socket.to(membersSockets).emit('offer', { offer: data.offer, from: from, to: to, id, callid: call._id, isVideo });
        callusers.set(id, { id, members: [from._id, to._id] });
        console.log(callusers);

      }





    } catch (error) {
      console.log(error);

    }

  });

  socket.on('answer', async (data) => {
    try {
      const { answer, id, from, to, callid } = data;




      // call.status = "answered";
      // call.receiverStatus = "answered";
      // await call.save();

      const membersSockets = getSockets([to._id]);

      socket.to(membersSockets).emit('answer', { answer: answer, id, from, to, callid });
      const call = await Call.findById(callid)
      console.log(call);
      call.status = "answered";
      call.receiverStatus = "answered";
      await call.save();
      // callusers.set(id, { id, members: [from._id, to._id] });

    } catch (error) {
      console.log(error);

    }

  });
  socket.on('ice-candidate', (data) => {

    const { candidate, id, from, to, members } = data
    // console.log(data);

    const membersSockets = getSockets([to._id]);
    // console.log("br")

    socket.to(membersSockets).emit('ice-candidate', { candidate, from, to, members, id });
    // console.log("rrr");

  });
  socket.on('rejectcall', async (data) => {
    try {
      const { from, to, chatId, callid, } = data
      const membersSockets = getSockets([from._id]);
      socket.to(membersSockets).emit('rejectcall')
      const call = await Call.findById(callid)
      call.status = "answered"; // Or "rejected" if you prefer
      call.receiverStatus = "answered";
      call.callerStatus = "ended";
      call.endTime = call.startTime;
      callusers.delete(chatId)
      console.log(1);
      console.log(callusers.get(chatId));
      await call.save();

      console.log(callusers);

    } catch (error) {
      console.log(error);

    }
  })

  socket.on('end-call', async (data) => {
    try {
      const { callid, chatId, from, to, callresponse } = data
      console.log(chatId);

      const membersSockets = getSockets([to._id]);
      socket.to(membersSockets).emit('end-call');

      callusers.delete(chatId)


      if (callresponse) {
        const call = await Call.findById(callid)
        call.status = "answered"; // Or "rejected" if you prefer
        call.receiverStatus = "answered";
        call.callerStatus = "ended";
        call.endTime = new Date();
        callusers.delete(chatId)
        console.log(callusers);
        await call.save();

      }
      else {
        const call = await Call.findOne({
          chat: chatId
        })
        call.status = "missed";
        callusers.delete(chatId) // Or "rejected" if you prefer
        call.receiverStatus = "missed";
        call.callerStatus = "ended";
        call.endTime = call.startTime;
        socket.to(membersSockets).emit('REQUEST', "Missed Call")
        await Request.create(
          {
            user: to._id,
            sender: from._id,
            type: "call",
          }
        )
        await call.save();
      }
      console.log(callusers);


    } catch (error) {
      console.log(error);

    }
  });



  socket.on("disconnect", async () => {

    onlineusers.delete(user._id.toString());
    try {
      const userfriends = await Friend.find({
        friends: user._id
      })
      const allfriends = userfriends.flatMap((chat) => chat.friends).flat().filter((friend) => friend._id.toString() !== user._id.toString())
      for (const friend of allfriends) {
        const friendId = friend._id.toString();
        if (onlineusers.has(friendId)) {
          const friendSocketId = onlineusers.get(friendId);
          io.to(friendSocketId).emit('friendOffline', { friendId: user._id.toString() });
        }
      }

    } catch (error) {
      console.log(error);

    }
  })


});


app.use(errorMiddleware);
// createUser(30);
// createFakeFriends("66e1e9b2c0b640f76159f11a",5)
// createSampleChat(10)
// createArchived('66e1e8cb8bc61be28617b01c');
// createmessages(5000);
// server.listen(port, () => {
//   console.log(`Server is running at ${port}`);
// });

export default server; 
