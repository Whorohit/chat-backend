import mongoose, { model, Schema, Types } from "mongoose";

const schema = new Schema({
    content: {
        type: String,
    },
    attachments: [
        {publicid:{
            type: String,
            required: false,
        },
        url: {
            type: String,
            required: false
        }}
    ],
    sender: {
        type: Types.ObjectId,
        ref: "User",
        required: true,
    },
    chat: {
        type: Types.ObjectId,
        ref: "Chat"
    },
    isalert: {
        type: Boolean,
        default: false,
    },
    alerttype: {
        type: String,
    }
}, {
    timestamps: true
})
export const Messages = mongoose.models.Message || model("Message", schema);
