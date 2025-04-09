const mongoose = require("mongoose");

const SuggestionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    suggestion: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Suggestion", SuggestionSchema);
