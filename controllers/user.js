import { ErrorHandler } from '../utils/utils.js';
import { cookieoptions, sendtoken, uploadFilesToCloudinary } from '../utils/features.js';
import passport from 'passport';
import { User } from '../Modals/user.js';
import { Friend } from '../Modals/friends.js';
import bcrypt from 'bcrypt';
import { Request } from '../Modals/request.js';
import { Chat } from '../Modals/chat.js';
import { emitEvent } from '../helper/help.js';

export const login = (req, res, next) => {
  try {
    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err || !user) {
        return next(new ErrorHandler(info.message, 404))


      }
      sendtoken(res, user, 200, "User login")
    })
      (req, res, next);

  } catch (error) {
    console.log(error);
    return next(error)
  }
}
export const register = async (req, res, next) => {
  try {
    const { name, email, password, username, bio } = req.body;
    console.log(name, email, password, username, bio);


    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ErrorHandler('Email already in use', 400));
    }

    const newUser = new User({ name, email, password, username, bio });
    await newUser.save();

    sendtoken(res, newUser, 201, 'User registered successfully');

  } catch (error) {

    return next(error)
  }

}

export const logout = async (req, res, next) => {
  try {
    return res.status(200).cookie("token", "", { ...cookieoptions, maxAge: 0 }).json({
      message: "Logout successfully",
      success: true
    })

  } catch (error) {
    next(error)
  }
}

export const updateuserinfo = async (req, res, next) => {
  try {
    const { username, name, bio, website, phone, birthdate, address } = req.body;
    console.log(username, name, bio, website, phone, birthdate, address);

    const userid = req.user._id.toString();
    const user = await User.findById(userid);
    const file = req.file
    let avatar;

    if (file) {
      const results = await uploadFilesToCloudinary([file]);
      avatar = {
        public_id: results[0].public_id,
        url: results[0].url
      };
    }


    if (username) {
      user.username = username
    }
    if (bio) user.bio = bio;

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (birthdate) user.birthdate = birthdate;
    if (website) user.website = website;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    // await user.save();

    const [u, friend] = await Promise.all([
      user.save(),
      Friend.find({
        friends: userid
      }).select("friends")
    ])
    const allfriends = friend.flatMap((chat) => chat.friends).flat().filter((friend) => friend._id.toString() !== userid).map((i) => i._id)
    console.log(allfriends);

    const messageallfreinds = allfriends.map((item) => {
      return Request.create({
        user: item,
        sender: userid,
        type: "notification",
      })
    })
    await Promise.all(messageallfreinds);
    emitEvent(req, 'REQUEST', allfriends, "send  Notification")



    return res.status(200).json({
      message: "userinfo updated successfully",
      success: true
    })







  } catch (error) {
    next(error)
  }
}

export const updatepassword = async (req, res, next) => {
  try {
    const { oldpassword, newpassword } = req.body;
    console.log(req.body);
    // console.log(req);


    console.log(oldpassword, newpassword);

    const userid = req.user._id.toString();
    let user = await User.findById(userid).select("+password");

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    console.count(3)

    const isMatch = await bcrypt.compare(oldpassword, user.password)
    if (!isMatch) {
      return next(new ErrorHandler("enter the correct  old password", 404));
    }
    user.password = newpassword;
    console.count(5)
    await user.save({ validateModifiedOnly: true });
    console.count(5)
    return res.status(200).json({
      message: "password has been updated",
      success: true,


    })


  } catch (error) {
    console.log(error);

    next(error)
  }


}

export const serachuser = async (req, res, next) => {
  try {
    const { name = "" } = req.query;
    const userid = req.user._id.toString();
    const allfriends = await Friend.find({
      friends: userid
    });
    const alluserformchat = allfriends.flatMap((chat) => chat.friends).flat().filter((id) => { return id.toString() !== userid.toString() });
    const alluser = await User.find({
      username: {
        $regex: name, $options: "i",
      }
    }).select("-password")
    const transformuser = alluser.map(({ _id, avatar, username, name }) => {
      const isFriend = alluserformchat.some(friendId => friendId.toString() === _id.toString());
      return {
        _id,
        isfriend: isFriend,
        avatar: avatar?.url,
        name,
        username,
      }
    })
    return res.status(200).json({
      success: true,
      users: transformuser,
    })

  } catch (error) {
    next(error)
  }
}

export const Friendlist = async (req, res, next) => {
  try {
    const userid = req.user._id.toString();
    const [allfriends, friendcount] = await Promise.all([Friend.find({
      friends: userid
    }).select("friends").populate("friends", "username name avatar"), Friend.countDocuments({ friends: userid })])
    const alluserformchat = allfriends.flatMap((chat) => chat.friends).flat().filter((friend) => friend._id.toString() !== userid).map(({
      _id,
      username,
      avatar
    }) => {
      return {
        _id,
        username,
        avatar: avatar?.url
      }
    })
    const friendIds = alluserformchat.map((friend) => friend._id);

    // Query the Chat model to find chats that include these friends
    const chatsWithFriends = await Chat.find({
      groupchat: false,
      members: { $in: friendIds, $in: userid.toString() },
    }).select("_id members");


    const friends = alluserformchat.map((friend) => {
      // Find the chats that include this friend as a member
      const friendChatIds = chatsWithFriends
        .filter((chat) => chat.members.some((memberId) => memberId.toString() === friend._id.toString()))
        .map((chat) => chat._id);

      return {
        ...friend,
        chatIds: friendChatIds, // Include the chat IDs where this friend is a member
      };
    });



    return res.status(200).json({
      success: true,
      alluserformchat: friends,
      friendcount,

    })
  } catch (error) {
    next(error)
  }
}


export const sendrequest = async (req, res, next) => {
  try {
    const { reqid } = req.body;
    const userid = req.user._id.toString();

    const request = await Request.findOne({
      $or: [
        {
          sender: userid,
          receiver: reqid
        },
        {
          sender: reqid,
          receiver: userid
        },
      ]

    })

    if (request) {
      return next(new ErrorHandler("request send already", 400))
    }
    emitEvent(req, 'REQUEST', [reqid], "New Friend Request");
    await Request.create({
      sender: userid,
      receiver: reqid,
      user: reqid,
      type: "request",

    })

    return res.status(200).json({
      success: true,
      message: "send request successfully"

    })

  } catch (error) {
    next(error)
  }
}

export const acceptrequest = async (req, res, next) => {
  try {
    const { requestid, accept } = req.body;
    console.log(req.body);

    if (accept == null) {
      return next(new ErrorHandler(" please provide the request "))
    }
    console.count(2)
    const request = await Request.findById(requestid).populate("sender").populate("receiver");
    console.log(request);
    let sender = request.sender._id;
    let receiver = request.receiver._id;
    const members = [request.sender._id, request.receiver._id];
    console.count(2)
    if (!request) {
      return next(new ErrorHandler("not  request found", 404));

    }
    if (request.receiver._id.toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("not authorized to do  this", 404))
    }
    console.count(2)
    if (!accept) {
      console.count(2)
      await request.deleteOne();
      emitEvent(req, 'REQUEST', [sender], "Request Rejected");
      await Request.create(
        {
          user: sender,
          sender: receiver,
          type: "rejected",


        }
      )
      return res.status(200).json({
        message: "request  rejected",
        success: true
      })
    }
    else {
      await request.deleteOne();
      const [friend, chat] = await Promise.all([Friend.create({
        friends: members
      }), Chat.create({
        visible: false,
        groupchat: false,
        members
      }


      )])
      emitEvent(req, 'REQUEST', [sender], "Request Accepted");
      await Request.create(
        {
          user: sender,
          sender: receiver,
          type: "accepted",


        }
      )


    }
    return res.status(200).json({
      success: true,
      message: "Friend Request Accepted",
      senderId: request.sender._id,
    });



  } catch (error) {
    next(error)
  }
}

export const removenotification = async (req, res,next) => {
  try {
    const { notificatonid, } = req.body;
    const notification = await Request.findById(notificatonid)
    if (!notification) {
      return next(new ErrorHandler("not  request found", 404));

    }
    await notification.deleteOne();
    return res.status(200).json({
      message: "Delete successfully",
      success: true
    })




  } catch (error) {
    next(error)
  }
}
export const getallnotification = async (req, res, next) => {
  try {
    const userid = req.user._id.toString();
    const request = await Request.find(
      {
        user: userid
      }
    ).populate("sender", "username name avatar").sort({
      createdAt: -1
    })
    const transformrequest = request.map(({ _id, sender, type, createdAt }) => {


      return {
        _id,
        type,
        createdAt,
        sender: {
          _id: sender._id,
          username: sender.username,
          name: sender.name,
          avatar: sender?.avatar?.url
        }

      }
    })
    return res.status(200).json({
      request: transformrequest,
      success: true
    })
  } catch (error) {
    next(error)
  }
}

export const viewprofile = async (req, res, next) => {
  try {

    const userid = req.user._id.toString();
    const id = req.params.id;
    console.log(id);

    if (!id) {
      return next(new ErrorHandler(" please provide userid"))
    }
    // const [] = Promise.all([

    // ])
    const viewuser = await User.findById(id).select("-password -email");

    return res.status(200).json({
      user: {
        _id: viewuser?._id,
        bio: viewuser?.bio,
        avatar: viewuser?.avatar?.url,
        username: viewuser?.username,
        name: viewuser?.name
      }
    })


  } catch (error) {
    next(error)
  }
}
export const viewmyprofile = async (req, res, next) => {
  try {

    const userid = req.user._id.toString();



    // const [] = Promise.all([

    // ])
    const user = await User.findById(userid).select("+email +website +phone +address +birthdate");
    const viewuser = user.toObject();
    return res.status(200).json({
      user: {
        ...viewuser,
        _id: viewuser?._id,
        bio: viewuser?.bio,
        avatar: viewuser?.avatar?.url,
        username: viewuser?.username,
        name: viewuser?.name,
        email: viewuser?.email,
        website: viewuser?.website,
        phone: viewuser?.phone,
        address: viewuser?.address,
        birthdate: viewuser?.birthdate // Include birthdate
      }
    });


  } catch (error) {
    next(error)
  }
}