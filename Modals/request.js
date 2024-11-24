import mongoose, { model, Schema, Types } from "mongoose";

const schema = new Schema({
    type: {
        type: String,
    },
    message: {
        type: String,
    },
    user: {
        type: Types.ObjectId,
        ref: "User",
        // required: true,
    },
    sender: {
        type: Types.ObjectId,
        ref: "User",
        // required: true,
    },
    receiver: {
        type: Types.ObjectId,
        ref: "User",
        // required: true,
    }
}, {
    timestamps: true
})
export const Request = mongoose.models.Request || model("Request", schema);

//notification
//rejected
//accepted
//request