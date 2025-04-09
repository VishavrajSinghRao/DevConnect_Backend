const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    avatar: { type: String,required: true },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    githubToken: { type: String }  
});

module.exports = mongoose.model("User", UserSchema);
