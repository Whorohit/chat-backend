import mongoose, { model, Schema, Types } from "mongoose";

const schema = new Schema({
    chat:
    {
        type: Types.ObjectId,
        ref: "Chat"
    },
    Calltype:{
        type: String,
        enum: ["Voice", "Video"],
        default: "Video"
    },
    startTime:
    {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    from: {
        type: Types.ObjectId,
        ref: "User"
    },
    to: {
        type: Types.ObjectId,
        ref: "User"
    },
    status: {
        type: String,
        enum: ["initiated", "answered", "missed"],
        default: "initiated"
    },
    callerStatus: {
        type: String,
        enum: ["initiated", "ended"],
        default: "initiated"
    },
    receiverStatus: {
        type: String,
        enum: ["ringing", "answered", "missed"],
        default: "ringing"
    },


}, {
    timestamps: true
})
export const Call = mongoose.models.Call || model("Call", schema);
