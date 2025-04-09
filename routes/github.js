const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();
require("dotenv").config();



router.get("/trending-issues", async (req, res) => {
    const { tech } = req.query;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        console.log("❌ No Authorization header received");
        return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    try {
      
        const token = authHeader.split(" ")[1];
        const userData = JSON.parse(atob(token.split(".")[1]));

        if (!userData.githubToken) {
            return res.status(401).json({ error: "GitHub token not found in session" });
        }

        const response = await axios.get(
            `https://api.github.com/search/issues?q=label:${tech}+state:open&sort=created&order=desc&per_page=10`,
            {
                headers: {
                    Authorization: `Bearer ${userData.githubToken}`,
                    "User-Agent": "DevConnect-App",
                },
            }
        );

        console.log("✅ GitHub Issues Response:", response.data);
        res.json(response.data.items);
    } catch (error) {
        console.error("🔥 GitHub API Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch trending issues" });
    }
});

module.exports = router;
