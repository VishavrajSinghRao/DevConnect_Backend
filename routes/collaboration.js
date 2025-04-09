const express = require("express");
const mongoose = require("mongoose");  // ✅ Import mongoose
const CollaborationRequest = require("../models/CollaborationRequest");
const User = require("../models/User");
const router = express.Router();

router.get("/user/username/:username", async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ id: user._id, username: user.username });
    } catch (error) {
        console.error("🔥 Error fetching user:", error);
        res.status(500).json({ error: "Server error" });
    }
});




router.post('/collaborate', async (req, res) => {
    let { issueUrl, senderId, receiverId, message } = req.body;

    try {
        console.log("🔹 Incoming Request:", req.body);

       
        const senderUser = await User.findOne({ githubId: senderId }); 
        if (!senderUser) {
            console.log("❌ Sender not found in database:", senderId);
            return res.status(400).json({ error: "Sender user not found in database" });
        }

        senderId = senderUser._id; 

     
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            console.log("❌ Invalid receiverId:", receiverId);
            return res.status(400).json({ error: "Invalid receiverId format." });
        }

        receiverId = new mongoose.Types.ObjectId(receiverId);

        
        const request = new CollaborationRequest({
            issueUrl,
            senderId, 
            receiverId,
            message,
            status: "pending", 
        });

        await request.save();
        console.log("✅ Collaboration request saved:", request);

        res.json({ success: true, message: "Collaboration request sent!" });
    } catch (error) {
        console.error("🔥 Backend Error:", error);
        res.status(500).json({ error: "Failed to send request" });
    }
});







router.post("/collaboration/respond", async(req,res)=>{
    const {requestId,status} = req.body;

    try {
        const request = await CollaborationRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: "Request not found" });

        request.status = status;
        await request.save();
        res.json({ success: true, message: `Request ${status}!` });
    } catch (error) {
        res.status(500).json({ error: "Failed to update request" });
    }
});

module.exports = router;
