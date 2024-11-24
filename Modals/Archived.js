import mongoose, { model, Schema,Types } from "mongoose";
import { hash } from 'bcrypt'

const schema = new Schema({
    user: {
        type: Types.ObjectId,
        ref: "User"
    },
    archived: [
        {
            type: Types.ObjectId,
            ref: "User"
        }
    ],
    family:
    [
        {
            type: Types.ObjectId,
            ref: "User"
        }
    ],
    blocked:
    [
        {
            type: Types.ObjectId,
            ref: "User"
        }
    ],


}, {
    timestamps: true
})

export const Archived = mongoose.models.Archived || model("Archived", schema)