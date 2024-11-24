import mongoose, { model, Schema, Types } from "mongoose";

const schema = new Schema({
    friends:[{
         type:Types.ObjectId,
         ref:"User",
         required:true,

    }],
},{
    timestamps:true
})
export const Friend= mongoose.models.Friend ||model("Friend",schema)