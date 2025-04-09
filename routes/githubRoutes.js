const express = require("express");
const axios = require("axios");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.get("/commits", authMiddleware, async (req, res) => {
    try {
        const { repoUrl } = req.query;

        if (!repoUrl) {
            return res.status(400).json({ error: "Repository URL is required" });
        }

        const repoPath = repoUrl.replace("https://github.com/", "");
        
        const response = await axios.get(
            `https://api.github.com/repos/${repoPath}/commits`,
            { headers: { Authorization: `Bearer YOUR_GITHUB_ACCESS_TOKEN` } }
        );

        res.json(response.data);
    } catch (error) {
        console.error("🔥 Error fetching commits:", error);
        res.status(500).json({ error: "Failed to fetch commits" });
    }
});

module.exports = router;
