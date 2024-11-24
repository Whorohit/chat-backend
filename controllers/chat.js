import { emitEvent } from "../helper/help.js";
import { Archived } from "../Modals/Archived.js";
import { Call } from "../Modals/Call.js";
import { Chat } from "../Modals/chat.js";
import { Messages } from "../Modals/message.js";
import { User } from "../Modals/user.js";
import { getothermember, uploadFilesToCloudinary } from "../utils/features.js";
import { ErrorHandler } from "../utils/utils.js";
import { v4 as uuid } from 'uuid'

export const creategrpchat = async (req, res, next) => {
    try {
        const { name, member } = req.body;
        // console.log(name, member);
        // console.log(Array.isArray(member));

        const file = req.file;
        if (!file) {
            return next(new ErrorHandler("please upload file ", 400))
        }
        if (!Array.isArray(member) || member.length === 0 || member.length <= 1) {
            return next(new ErrorHandler("Members should be  bggg a non-empty array", 400));
        }
        // console.log(6);

        const results = await uploadFilesToCloudinary([file])
        const avatar = {
            public_id: results[0].public_id,
            url: results[0].url
        }
        // console.log(req.user);
        const admin = req.user._id.toString();
        const members = [...member, admin];
        // Convert req.user._id to string
        // console.log(members);
        // console.log(avatar);

        // console.count(4)
        const Group = await Chat.create({
            name,
            members,
            admins: [admin],
            visible: true,
            groupchat: true,
            creator: admin,
            avatar,

        })


        if (!Group) {
            return next(new ErrorHandler("something went wrong ", 400))
        }
        emitEvent(req, 'GROUP_CREATED', members, {
            groupName: name,
            creator: req.user.name,
            groupId: Group._id,
        });

        // Create and save alert message in the database for persistence
        const alertMessage = await Messages.create({
            content: `You have been added to the group "${name}".`,
            sender: admin,
            chat: Group._id,
            isalert: true,
            alerttype: 'GROUP_CREATED',
        });

        // Emit the alert message to all members' sockets
        emitEvent(req, 'NEW_MESSAGE_ALERT', members, {
            chatId: Group._id,
            message: alertMessage,
        });


        return res.status(200).json({
            success: true,
            message: "Group Created successfully"
        })



    } catch (error) {
        console.log(error);
        next(error)
    }
}

export const getmychats = async (req, res, next) => {
    try {
        const user = req.user._id.toString();
        const [mychat, archived] = await Promise.all([Chat.find({
            members: user
        }).populate("members",
            "username avatar"
        ),
        Archived.find({ user })
        ])
        const chatIds = mychat.map(chat => chat._id);
        const lastMessages = await Messages.aggregate([
            { $match: { chat: { $in: chatIds } } },
            { $sort: { createdAt: -1 } }, // Sort messages by createdAt in descending order
            {
                $group: {
                    _id: "$chat",
                    lastMessage: { $first: "$$ROOT" } // Get the first message for each chat (most recent one)
                }
            }
        ]);
        const lastMessagesMap = new Map();
        lastMessages.forEach(({ _id, lastMessage }) => {
            lastMessagesMap.set(_id.toString(), lastMessage);
        });

        const transfromedachived = archived.length >= 1 ? archived[0] : {}


        const transfromed = mychat.map(({ _id, groupchat, members, creator, name, admin, visible, avatar }, index) => {


            const othermember = getothermember(members, user);
            const lastMessage = lastMessagesMap.get(_id.toString());
            return {
                _id,
                name: groupchat ? name : othermember[0]?.username,
                avatar: groupchat ? avatar?.url : othermember[0]?.avatar?.url,
                visible,
                groupchat,
                admin,
                creator,
                members: members.reduce((prev, curr) => {
                    if (curr._id.toString() !== user.toString()) {
                        prev.push(curr._id);
                    }
                    return prev;
                }, []),
                lastMessage: lastMessage
                    ? {
                        content: lastMessage.content,
                        sender: lastMessage.sender,
                        createdAt: lastMessage.createdAt,
                        attachments: lastMessage.attachments
                    }
                    : null



            }
        })


        return res.status(200).json({
            chats: transfromed,
            archived: transfromedachived,
            success: true
        })


    } catch (error) {
        next(error)
    }
}
export const getmygroupsbyme = async (req, res, next) => {
    try {
        const user = req.user._id;

        const groups = await Chat.find({
            members: user,
            groupchat: true,
            admins: user,
        }).populate("members", "username avatar")

        const transfromedgrups = groups.map((chat) => {
            const chatObj = chat.toObject();
            return {
                ...chatObj,
                avatar: chatObj.avatar?.url

            }
        })

        return res.status(200).json({
            chats: transfromedgrups,
            success: true,
        })
    } catch (error) {
        next(error)
    }
}
export const editgroupsdetails = async (req, res, next) => {
    try {
        const user = req.user._id;
        const { chatid, name } = req.body;
        console.log(chatid);

        const file = req.file;
        let avatar;
        if (file) {
            const results = await uploadFilesToCloudinary([file]);
            avatar = {
                public_id: results[0].public_id,
                url: results[0].url
            };
        }


        const chat = await Chat.findOne({
            _id: chatid,
            members: user
        });


        if (!chat) {
            return next(new ErrorHandler("No group exists", 400));
        }
        const verifychat = chat.toObject()
        console.log(verifychat);
        if (!verifychat.groupchat)
            return next(new ErrorHandler("This is not a group chat", 400));

        if (name) chat.name = name;
        if (avatar) chat.avatar = avatar;

        await chat.save();
        return res.status(200).json({
            success: true,
            message: "chat updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const addmember = async (req, res, next) => {
    try {
        const user = req.user._id.toString();
        const { newmembers, chatid } = req.body;
        const chat = await Chat.findOne({
            admins: user,
            _id: chatid
        })
        if (!chat) { return next(new ErrorHandler("No group exists", 400)); }

        const { groupchat, members } = chat;
        // console.log(newmembers);
        if (!groupchat)
            return next(new ErrorHandler("This is not a group chat", 400));
        const allnewmemberpromise = newmembers.map((i) => User.findById(i, "username"));
        const allNewMembers = await Promise.all(allnewmemberpromise);
        const uniqueMembers = allNewMembers
            .filter((i) => !members.includes(i._id.toString())).map((i) => i._id.toString())

        chat.members.push(...uniqueMembers);
        await chat.save();
        const alertMessage = await Messages.create({
            content: `New Member Joined  `,
            sender: user,
            chat: chat,
            isalert: true,
            alerttype: 'GROUP_CREATED',
        });
        emitEvent(req, 'NEW_MESSAGE_ALERT', members, {
            chat: chatid,

        });

        emitEvent(req, 'NEW_MESSAGE', members, {
            chat: chatid,
            message: alertMessage
        });

        return res.json({
            message: "member added successfully",
            success: true
        })
    } catch (error) {
        next(error)
    }
}
export const modifyadmins = async (req, res, next) => {
    try {
        const user = req.user._id.toString();

        const { userid, chatid, add } = req.body;
        const chat = await Chat.findOne({
            admins: user,
            _id: chatid
        })
        if (!chat) { return next(new ErrorHandler("No group exists", 400)); }
        const { groupchat, members, admins } = chat;
        if (!groupchat)
            return next(new ErrorHandler("This is not a group chat", 400));
        if (add) {
            if (admins.map(id => id.toString()).includes(userid.toString())) {
                return next(new ErrorHandler("Already the part of Admin group", 400));
            }
            chat.admins.push(userid)
            await chat.save();
            return res.json({
                message: "Added in Admin Group",
                success: true
            })
        }
        if (!admins.map(id => id.toString()).includes(userid.toString())) {
            return next(new ErrorHandler("Not the part of Admin group", 400));
        }
        chat.admins = admins.filter(id => id.toString() !== userid.toString())
        await chat.save();
        return res.json({
            message: "Removed from  Admin Group",
            success: true
        })


    } catch (error) {
        next(error)
    }
}
export const removemember = async (req, res, next) => {
    try {
        const user = req.user._id.toString();
        const { userid, chatid } = req.body;
        console.log(userid, chatid);


        const [chat, removinguser] = await Promise.all([
            Chat.findById(chatid),
            User.findById(userid)
        ])
        const isAdmin = chat.admins.map((i) => i.toString());

        if (!isAdmin.includes(user)) {

            return next(new ErrorHandler("You are not allowed to perform this action", 404));
        }


        if (!chat) {
            return next(new ErrorHandler("chat does not exits", 404))
        }
        if (!userid) {
            return next(new ErrorHandler("user does not exits", 404))
        }
        if (!chat.groupchat) {
            return next(new ErrorHandler(" this is not group chat", 404))
        }
        if (chat.members.length <= 3) {
            return next(new ErrorHandler("minimum limit reaches", 404))
        }
        if (isAdmin.includes(userid)) {
            chat.admins = chat.admins.filter((member) => {

                return member.toString() !== userid.toString()
            })
        }
        chat.members = chat.members.filter((member) => {

            return member.toString() !== userid.toString()
        })
        await chat.save();

        const alertMessage = await Messages.create({
            content: `removed   ${removinguser.username}  `,
            sender: user,
            chat: chat,
            isalert: true,
            alerttype: 'GROUP_CREATED',
        });

        emitEvent(req, 'NEW_MESSAGE', chat.members, {
            chat: chatid,
            message: alertMessage
        });

        emitEvent(req, 'NEW_MESSAGE_ALERT', chat.members, {
            chat: chatid,
        });



        return res.json({
            message: "member remove successfully",
            success: true
        })

    } catch (error) {
        next(error)
    }
}

export const leavegroup = async (req, res, next) => {
    try {
        const chatid = req.params.id;
        console.log(chatid);
        const user = req.user._id.toString();
        const chat = await Chat.findById(chatid)

        if (!chat) {
            return next(new ErrorHandler("chat does not exists"));

        }
        if (!chat.members.map((i) => i.toString()).includes(user))
            return next(new ErrorHandler("you are not part of chat", 404))
        if (chat.members.length <= 3) {
            return next(new ErrorHandler("minimum limit reaches", 404))
        }
        const remainigmembers = chat.members.filter((member) => {
            return user.toString() !== member.toString();

        })
        chat.members = remainigmembers;
        if (chat.admins.map((i) => i.toString()).includes(user) && chat.admins.length < 2) {
            // console.log(chat.admins);
            chat.admins.pop(user)
            // console.log(chat.admins);
            chat.admins.push(remainigmembers[0])
            // console.log(chat.admins);
        }
        // const [userinfo] = await Promise.all([
        //     User.findById(req.user),
        //     Chat.save()

        // ])
        await chat.save();
        const [userinfo, newchat] = await Promise.all([User.findById(user), chat.save()])
        const alertMessage = await Messages.create({
            content: `${userinfo.username} leaves the Group `,
            sender: user,
            chat: chat,
            isalert: true,
            alerttype: 'GROUP_CREATED',
        });

        emitEvent(req, 'NEW_MESSAGE', chat.members, {
            chat: chatid,
            message: alertMessage
        });

        emitEvent(req, 'NEW_MESSAGE_ALERT', chat.members, {
            chat: chatid,
        });
        return res.json({
            message: "member remove successfully",
            success: true
        })



    } catch (error) {
        next(error)
    }
}

export const sendattachment = async (req, res, next) => {
    try {
        const { chatId } = req.body;
        // console.log(req.body);

        const userid = req.user._id.toString();
        // console.log(chatId);

        const [user, chat] = await Promise.all([User.findById(userid), Chat.findById(chatId)])
        // console.log(user,chat);

        if (!chat) {
            return next(new ErrorHandler('chat not  found ', 404))
        }
        if (!chat.visible) {
            chat.visible = true;
            await chat.save(); // Update the chat in the database
        }

        const files = req.files || [];
        console.log(req.file);

        console.log(files);
        if (files.length < 1) {
            return next(new ErrorHandler(' attachemnt is empty ', 404))
        }
        if (files.length > 5) {
            return next(new ErrorHandler(' attachemnt is  very large  amount  maximum -5 file', 404))
        }
        const attachements = await uploadFilesToCloudinary(files)
        console.log(attachements);


        const messagefordb = {
            content: "",
            attachments: attachements,
            chat: chatId,
            sender: userid,
        }
        const messageforRealtime = {
            attachments: attachements,
            content: "",
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name
            },
            chat: chatId,
            createdAt: new Date().toISOString()
        }

        emitEvent(req, 'NEW_MESSAGE', chat.members, {
            chat: chatId,
            message: messageforRealtime
        });
        emitEvent(req, 'NEW_MESSAGE_ALERT', chat.members, {
            chat: chatId,

        })



        const message = await Messages.create(messagefordb);
        if (!message) {
            return next(new ErrorHandler(' something went wrong', 404))
        }
        return res.status(200).json({
            message,
            success: true
        })

    } catch (error) {
        next(error);
    }
}

export const getmessages = async (req, res, next) => {
    try {
        const chatid = req.params.id
        const { limit = 20, page = 1 } = req.body;
        const [message, totalmessage] = await Promise.all([Messages.find({ chat: chatid }).sort({ createdAt: -1 }).
            skip((page - 1) * limit).
            limit(limit).
            populate("sender", "username avatar")
            .lean(),
        Messages.countDocuments({ chat: chatid })])
        const totalpages = Math.ceil(totalmessage / limit) || 0;
        return res.status(200).json({
            success: true,
            messages: message.reverse(),
            totalpages

        })



    } catch (error) {
        next(error)
    }
}
export const getchatinfo = async (req, res, next) => {
    try {
        const chatid = req.params.id;
        const userid = req.user._id.toString();
        const populateadmins = req.query.populate === 'true';
        if (!chatid) {
            return next(new ErrorHandler("Please provide chatid", 404));
        }
        let chat;

        if (populateadmins) {
            chat = await Chat.findById(chatid).populate("members", "username avatar").populate('admins', 'username avatar')
                .populate("creator", "username avatar");
            if (!chat) {
                return next(new ErrorHandler("Chat not found", 404));
            }
            const chatObject = chat.toObject();
            const othermember = getothermember(chatObject.members, userid)
            chatObject.members = othermember.map((member) => ({
                _id: member._id,
                username: member.username,  // Ensure this matches your schema field
                avatar: member.avatar?.url || null  // Handle null or undefined avatar
            }));
            if (chatObject.groupchat == false) {

                // const othermember = getothermember(chatObject.members, userid)
                chatObject.name = othermember[0].username;
                chatObject.avatar = othermember[0]?.avatar;
            }

            chatObject.admins = chatObject.admins.map((member) => ({
                _id: member._id,
                username: member.username,  // Ensure this matches your schema field
                avatar: member.avatar?.url || null  // Handle null or undefined avatar
            }));
            chatObject.avatar = chatObject.avatar?.url || null;

            return res.status(200).json({
                message: chatObject,
                success: true
            });

        }

        chat = await Chat.findById(chatid).populate("members", "username avatar");
        if (!chat) {
            return next(new ErrorHandler("Chat not found", 404));
        }
        const chatObject = chat.toObject();
        chatObject.members = chatObject.members.map((member) => ({
            _id: member._id,
            username: member.username,  // Ensure this matches your schema field
            avatar: member.avatar?.url || null  // Handle null or undefined avatar
        }));
        if (chatObject.groupchat == false) {

            const othermember = getothermember(chatObject.members, userid)
            chatObject.name = othermember[0].username;
            chatObject.avatar = othermember[0]?.avatar;
        }

        // Return the modified chat object in the response
        return res.status(200).json({
            message: chatObject,
            success: true
        });


    } catch (error) {
        next(error);
    }
};

export const getallcall = async (req, res, next) => {
    try {
        const userid = req.user._id.toString();
        const call = await Call.find({
            $or: [
                {
                    from: userid,

                },
                {
                    to: userid,

                },
            ]

        }).populate("from", "username avatar").populate("to", "username avatar").sort({
            createdAt: -1
        })
        console.log(call.length);

        const modifedcalls = call.map((data) => {
            const { _id, chat, Calltype, from, to, status, callerStatus, receiverStatus, startTime, endTime, createdAt, } = data
            const caller = from._id.toString() === userid ? to : from;
            const calllength = endTime - startTime;
            let responsetype;
            let response;
            if (from._id.toString() === userid) {
                responsetype = from._id.toString() === userid && status === "missed" ? "Not Answerd" : "Answerd";
                response = "outgoing";
            }
            else {
                responsetype = to._id.toString() === userid && status === "missed" ? "Missed" : "Answerd"
                response = "incoming";
            }
            return {
                _id,
                chat,
                Calltype,
                caller,
                calllength,
                startTime,
                endTime,
                responsetype,
                response,
            }



        })
        return res.status(200).json({
            success: true,
            calllength: call.length,
            calls: modifedcalls

        })



    } catch (error) {
        next(error);
    }
}
