import mongoose, { model, Schema } from "mongoose";
import { hash } from 'bcrypt'

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
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
    bio: {
        type: String,
        default: "Hii i am using  chatapp"
    },
    phone: {
        type: String,
        min: 10,
        max: 10,
        select: false,
    },
    website: {
        type: String,
        select: false,
    },
    birthdate: {
        type: Date,
        select: false,
    },
    address: {
        type: String,
        select: false,
    }

}, {
    timestamps: true
})
schema.pre("save", async function (next) {
    if (!this.isModified("password")) { return next() }
    this.password = await hash(this.password, 10)

})
export const User = mongoose.models.User || model("User", schema)