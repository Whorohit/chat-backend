import mongoose from "mongoose";
import { v2 as cloudinary } from 'cloudinary'
import { v4 as uuid } from 'uuid'
export const mongodbsend = () => {
    const uri=process.env.MONGO_URI
    console.log(uri); 
    mongoose.connect(uri, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        socketTimeoutMS: 1000000,

    })
        .then(() => console.log('MongoDB connected...'))
        .catch(err => console.log(err));
}

export const getBase64 = (file) =>
    `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

// utils/features.js
import jwt from 'jsonwebtoken';

export const sendtoken = (res, user, code, message) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.status(code).cookie('token', token, {
        maxAge: 3 * 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        secure: false,
        samesite: "none"
    }).json({
        success: true,
        message,
        user,
    });
};

// export const sendtoken = (res, user, code, message) => {
//     // Create the JWT token
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET,{ expiresIn: '3d' });
  
//     // Send the token in the response body (not in cookies)
//     res.status(code).json({
//       success: true,
//       message,
//       user,
//       token, // Send the token here
//     });
//   };
  

export const uploadFilesToCloudinary = async (files = []) => {
    const uploadPromises = files.map((file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
                getBase64(file),
                {
                    resource_type: "auto",
                    public_id: uuid(),
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
        });
    });

    try {
        const results = await Promise.all(uploadPromises);

        const formattedResults = results.map((result) => ({
            public_id: result.public_id,
            url: result.secure_url,
        }));

        return formattedResults;
    } catch (err) {
        console.log(err);
        throw new Error("Error uploading files to cloudinary", err);
    }
};

export const cookieoptions =
{
    maxAge: 1 * 24 * 60 * 60 * 1000,
    samesite: "none",
    httpOnly: true,
    secure: true
}

export const getothermember = (members = [], user) => {
    return members.filter(member => member._id.toString() !== user);
};