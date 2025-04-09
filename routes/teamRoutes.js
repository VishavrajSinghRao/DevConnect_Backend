const express = require("express");
const mongoose = require("mongoose");
const Team = require("../models/Team");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

/** ✅ Create Team */
router.post("/create", authMiddleware, async (req, res) => {
    try {
        const { teamName, repoUrl, description, visibility } = req.body;

        if (!teamName) {
            return res.status(400).json({ error: "Team name is required" });
        }

        const existingTeam = await Team.findOne({ name: teamName });
        if (existingTeam) {
            return res.status(400).json({ error: "Team name already exists" });
        }

        // Get user details
        const user = await User.findById(req.user._id);

        const newTeam = new Team({
            name: teamName,
            description: description || "",
            visibility: visibility || "Public",
            members: [
                {
                    userId: user._id,
                    username: user.username,
                    avatarUrl: user.avatar,
                    role: "Admin"
                }
            ],
            owner: user._id,
            repoUrl: repoUrl || "",
        });

        await newTeam.save();

        res.json({ message: "Team created successfully", team: newTeam });
    } catch (error) {
        console.error("🔥 Error creating team:", error);
        res.status(500).json({ error: "Server error" });
    }
});

/** ✅ Join Team */
router.post("/join", authMiddleware, async (req, res) => {
    try {
        const { teamId } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        // Check if user is already a member
        if (team.members.some(member => member.userId.equals(req.user._id))) {
            return res.status(400).json({ error: "You are already a member of this team" });
        }

        const user = await User.findById(req.user._id);

        team.members.push({
            userId: user._id,
            username: user.username,
            avatarUrl: user.avatar,
            role: "Member"
        });

        await team.save();

        res.json({ message: `Joined team ${team.name} successfully`, team });
    } catch (error) {
        console.error("🔥 Error joining team:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// routes/user.js or inside your user controller
router.get("/me", authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      res.json(user);
    } catch (err) {
      console.error("Error getting user:", err);
      res.status(500).json({ error: "Server error" });
    }
  });
  

/** ✅ Leave Team */
router.post("/leave", authMiddleware, async (req, res) => {
    try {
        const { teamId } = req.body;

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        if (!team.members.some(member => member.userId.equals(req.user._id))) {
            return res.status(400).json({ error: "You are not a member of this team" });
        }

        if (team.owner.equals(req.user._id)) {
            return res.status(400).json({ error: "Owners cannot leave their own team" });
        }

        team.members = team.members.filter(member => !member.userId.equals(req.user._id));
        await team.save();

        res.json({ message: `Left team ${team.name} successfully` });
    } catch (error) {
        console.error("🔥 Error leaving team:", error);
        res.status(500).json({ error: "Server error" });
    }
});

/** ✅ Get all teams */
router.get("/", async (req, res) => {
    try {
        const teams = await Team.find()
        .populate("owner", "username avatarUrl")
        .populate("members.userId", "username avatarUrl")
        res.json(teams);
    } catch (error) {
        console.error("🔥 Error fetching teams:", error);
        res.status(500).json({ error: "Server error" });
    }
});

/** ✅ Get specific team with members */
router.get("/team/:teamId", async (req, res) => {
    try {
        const { teamId } = req.params;
        const team = await Team.findById(teamId)
            .populate("owner", "username avatarUrl")
            .populate("members.userId", "username avatarUrl");

        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        res.json(team);
    } catch (error) {
        console.error("🔥 Error fetching team:", error);
        res.status(500).json({ error: "Server error" });
    }
});

/** ✅ Delete Team */
router.delete("/delete/:teamId", authMiddleware, async (req, res) => {
    try {
        const { teamId } = req.params;

        const team = await Team.findById(teamId);

        if (!team) {
            return res.status(404).json({ error: "Team not found" });
        }

        if (!team.owner.equals(req.user._id)) {
            return res.status(403).json({ error: "Only the team owner can delete this team" });
        }

        await Team.findByIdAndDelete(teamId);
        res.json({ message: `Team "${team.name}" deleted successfully` });
    } catch (error) {
        console.error("🔥 Error deleting team:", error);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
