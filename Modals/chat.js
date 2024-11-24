import mongoose, { model, Schema, Types } from "mongoose";

const schema = new Schema({
    name: {
        type: String,
    },
    members: [
        {
            type: Types.ObjectId,
            ref: "User"
        }
    ],
    creator: {
        type: Types.ObjectId,
        ref: "User",
    },
    admins: [
        {
            type: Types.ObjectId,
            ref: "User",

        }
    ],
    groupchat: {
        type: Boolean,
        default: false
    },
    visible: {
        type: Boolean,
        default: false
    },
    avatar: {
        publicid: {
            type: String,
            required: false
        },
        url: {
            type: String,
            required: false,
        }
    },


}, {
    timestamps: true
})
export const Chat = mongoose.models.Message || model("Chat", schema);
