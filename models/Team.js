const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String, default: "" }, // 🔹 Short team description
        members: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                username: { type: String, required: true },
                avatarUrl: { type: String}, 
                role: { type: String, enum: ["Member", "Admin"], default: "Member" } // 🔹 Role in team
            }
        ],
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        repoUrl: { type: String, default: "" }, // ✅ GitHub repo link
        visibility: { type: String, enum: ["Public", "Private"], default: "Public" }, // 🔹 Team visibility
    },
    { timestamps: true } // ✅ Adds createdAt and updatedAt fields
);

module.exports = mongoose.model("Team", TeamSchema);
