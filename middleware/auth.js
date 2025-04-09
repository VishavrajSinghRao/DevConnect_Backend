const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

module.exports = async (req, res, next) => {
    try {
        console.log("Authorization Header:", req.header("Authorization"));

        const token = req.header("Authorization");
        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        const tokenValue = token.split(" ")[1];
        console.log("token value yeh h ",tokenValue);
        let decoded;
        try {
            decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
        }

        console.log("Decoded Token:", decoded);

        req.user = await User.findOne({ githubId: decoded.id }).select("-password");
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized: User not found" });
        }

        console.log("✅ Authenticated User:", req.user.username);
        next();
    } catch (error) {
        console.error("🔥 JWT Auth Error:", error);
        res.status(500).json({ error: "Internal server error in authentication" });
    }
};


