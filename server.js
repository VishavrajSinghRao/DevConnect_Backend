const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config();
const githubRoutes = require("./routes/github");
const collaboration = require("./routes/collaboration");
const http = require("http");
const socketIo = require("socket.io");

const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server,{

    cors: {
        origin: "FRONTEND_URL",
        methods: ["GET","POST"]
    }
});

io.on("connection", (socket) => {
    console.log("✅ New client connected");

    socket.on("joinRoom", ({teamId}) =>{
        socket.join({teamId});
    });

    socket.on("disconnect", () => {
        console.log("❌ Client disconnected");
      });
    });


const MONGO_URI = process.env.MONGO_URI;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

const COHERE_API_KEY = process.env.COHERE_API_KEY;

console.log("MONGO_URI:",MONGO_URI);



const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 30000, 
            socketTimeoutMS: 60000, 
        });
        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error.message);
        process.exit(1);
    }
};
connectDB();



const User = require("./models/User");
const Project = require("./models/Projects");
const Suggestion = require("./models/Suggestion");



app.use("/api", githubRoutes);
const teamRoutes = require("./routes/teamRoutes");
const github = require("./routes/githubRoutes");
app.use("/api/git",github);
app.use("/api/teams", teamRoutes);
app.use("/api/collaboration",collaboration);



// app.use((req, res, next) => {
//     console.log(`📌 Incoming Request: ${req.method} ${req.url}`);
//     next();
// });



app.get("/auth/github", (req, res) => {
    const forceLogin = req.query.force_login ? "&prompt=consent" : "";
    const githubAuthURL = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user${forceLogin}`;
    console.log("🔄 Redirecting to:", githubAuthURL);
    res.redirect(githubAuthURL);
});


app.get("/auth/github/callback", async (req, res) => {
    const { code } = req.query;
    console.log("🔹 Received Authorization Code:", code);

    if (!code) return res.status(400).json({ error: "Authorization code not provided!" });

    try {
        const { data } = await axios.post("https://github.com/login/oauth/access_token", {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
        }, { headers: { Accept: "application/json" } });

        const githubAccessToken = data.access_token || new URLSearchParams(data).get("access_token");
        console.log("github acccess token aa gya h", githubAccessToken);

        if (!githubAccessToken) {
            return res.status(400).json({ error: "Failed to get GitHub access token" });
        }

        const { data: githubUser } = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${githubAccessToken}` },
        });

        let user = await User.findOne({ githubId: githubUser.id });

        if (!user) {
            user = new User({
                githubId: githubUser.id,
                username: githubUser.login,
                avatar: githubUser.avatar_url,
                githubToken: githubAccessToken, 
                followers: [],
                following: [],
            });

        await user.save();
        console.log("✅ New User Saved:", user);
        }
        

        const jwtToken = jwt.sign(
            { id: user.githubId, username: user.username, avatar: user.avatar, githubToken: githubAccessToken },
            JWT_SECRET, { expiresIn: "7d" }
        );
        console.log("jwt token received",jwtToken);
        res.redirect(`${FRONTEND_URL}/dashboard?token=${jwtToken}`);

    } catch (error) {
        res.status(500).json({ error: "GitHub authentication failed" });
    }
});




app.post("/auth/github/pat", async (req, res) => {
    const { githubToken } = req.body;

    if (!githubToken) return res.status(400).json({ error: "GitHub Token is required!" });

    try {
        const { data: githubUser } = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${githubToken}` },
        });

        const jwtToken = jwt.sign(
            { githubId: githubUser.id, username: githubUser.login, avatar: githubUser.avatar_url, githubToken },
            JWT_SECRET, { expiresIn: "7d" }
        );

        res.json({ token: jwtToken, user: githubUser });

    } catch (error) {
        res.status(401).json({ error: "Invalid GitHub Token!" });
    }
});

/** ✅ Route 4: Fetch User's GitHub Repositories */
app.get("/api/github/repos", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: "Unauthorized: No token provided" });

    try {
        const token = authHeader.split(" ")[1];
        const userData = JSON.parse(atob(token.split(".")[1]));

        if (!userData.githubToken) {
            return res.status(401).json({ error: "GitHub token not found in session" });
        }

        const { data: repos } = await axios.get("https://api.github.com/user/repos", {
            headers: { Authorization: `Bearer ${userData.githubToken}` },
        });

        res.json(repos);

    } catch (error) {
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
});

/** ✅ Route 5: AI Career Suggestions & Open Source Projects */
app.post("/api/ai-suggestions", async (req, res) => {
    const { githubUsername } = req.body;

    if (!githubUsername) return res.status(400).json({ error: "GitHub username is required!" });

    try {
        const { data: repos } = await axios.get(`https://api.github.com/users/${githubUsername}/repos`);
        const userSkills = [...new Set(repos.map(repo => repo.language).filter(Boolean))];

        if (userSkills.length === 0) {
            return res.status(400).json({ error: "No programming languages detected in repositories." });
        }

        const aiPrompt = `I am a developer skilled in ${userSkills.join(", ")}. Suggest a suitable career path.`;

        const { data: aiResponse } = await axios.post(
            "https://api.cohere.ai/v1/generate",
            { model: "command", prompt: aiPrompt, max_tokens: 100, temperature: 0.8 },
            { headers: { Authorization: `Bearer ${COHERE_API_KEY}`, "Content-Type": "application/json" } }
        );

        const { data: trendingRepos } = await axios.get(
            "https://api.github.com/search/repositories?q=stars:>5000&sort=stars&order=desc&per_page=10"
        );

        const openSourceProjects = trendingRepos.items.map(repo => ({
            name: repo.name,
            owner: repo.owner.login,
            stars: repo.stargazers_count,
            url: repo.html_url,
        }));

        res.json({ careerSuggestion: aiResponse.generations[0].text, openSourceProjects });

    } catch (error) {
        res.status(500).json({ error: "Failed to generate AI suggestions & fetch projects" });
    }
});

app.get("/api/user/profile", async (req, res) => {

    if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ error: "Database not connected" });
}
  

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log("❌ No auth header provided!");
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];
        console.log("🔑 Received Token:", token);

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("🔍 Decoded User:", decoded);

        const user = await User.findOne({ githubId: String(decoded.id) }).lean();
        console.log("🔍 User Found:", user);

        if (!user) {
            console.log("❌ User not found in database!");
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ username: user.username, avatar: user.avatar });

    } catch (error) {
        console.error("🔥 Server Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});


app.post("/api/follow", async (req, res) => {
    const { userId, targetUserId } = req.body;

    try {
        const user = await User.findOne({ githubId: userId });
        const targetUser = await User.findOne({ githubId: targetUserId });

        if (!user || !targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const isFollowing = user.following.includes(targetUserId);

        if (isFollowing) {
            // Unfollow logic
            user.following = user.following.filter(id => id !== targetUserId);
            targetUser.followers = targetUser.followers.filter(id => id !== userId);
            await user.save();
            await targetUser.save();
            return res.json({ message: `Unfollowed ${targetUser.username}` });
        } else {
            // Follow logic
            user.following.push(targetUserId);
            targetUser.followers.push(userId);
            await user.save();
            await targetUser.save();
            return res.json({ message: `Now following ${targetUser.username}` });
        }
    } catch (error) {
        console.error("Follow/Unfollow Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/api/user/:githubId", async (req, res) => {
    try {
        const user = await User.findOne({ githubId: req.params.githubId });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            username: user.username,
            avatar: user.avatar,
            followers: user.followers,
            following: user.following,
        });
    } catch (error) {
        console.error("Fetch User Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});





/** ✅ Start Server */
const PORT = 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
