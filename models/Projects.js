const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    description: { type: String },
    repoUrl: { type: String, required: true },
});

module.exports = mongoose.model("Project", ProjectSchema);
