const mongoose = require("mongoose");

const CollaborationRequestSchema = new mongoose.Schema({

    issueUrl: { type: String, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("CollaborationRequest", CollaborationRequestSchema);
