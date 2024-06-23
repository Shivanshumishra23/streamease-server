import { app } from "./app.js";

import http from "http";
import { Server as SocketIO } from "socket.io";
import { spawn } from "child_process";
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
// import asyncHandler from "express-async-handler"; // Ensure you have this
// import User from "./models/User.js"; // Ensure correct path to your User model
import { verifyJWT,verifyToken } from "./middlewares/auth.middleware.js";
import { User } from "./models/user.model.js";
import cookieParser from "cookie-parser";
// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Use CORS middleware
app.use(cors());

const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin:"http://localhost:3001", // React app's origin
    // origin: 'https://streamease-ten.vercel.app',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
});

// Manage ffmpeg processes per user
let userFfmpegProcesses = {};

// Create ffmpeg options based on platform and streamKey
const createFfmpegOptions = (platform, streamKey) => {
  let rtmpUrl;
  if (platform === "YouTube") {
    rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;
  } else if (platform === "Facebook") {
    rtmpUrl = `rtmps://live-api-s.facebook.com:443/rtmp/${streamKey}`;
  } else if (platform === "Instagram") {
    rtmpUrl = `rtmps://edgetee-upload-ccu1-1.xx.fbcdn.net:443/rtmp/${streamKey}`;
  }

  return [
    "-i",
    "-",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-r",
    `${25}`,
    "-g",
    `${25 * 2}`,
    "-keyint_min",
    25,
    "-crf",
    "25",
    "-pix_fmt",
    "yuv420p",
    "-sc_threshold",
    "0",
    "-profile:v",
    "main",
    "-level",
    "3.1",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    128000 / 4,
    "-f",
    "flv",
    rtmpUrl,
  ];
};

// Create and manage ffmpeg process per user and platform
const createFfmpegProcess = (userId, platform, streamKey) => {
  const options = createFfmpegOptions(platform, streamKey);
  const ffmpegProcess = spawn("ffmpeg", options);

  ffmpegProcess.stdout.on("data", (data) => {
    console.log(`ffmpeg ${platform} stdout: ${data}`);
  });

  ffmpegProcess.stderr.on("data", (data) => {
    console.error(`ffmpeg ${platform} stderr: ${data}`);
  });

  ffmpegProcess.stdin.on("error", (err) => {
    console.error(`ffmpeg ${platform} stdin error: ${err}`);
    delete userFfmpegProcesses[userId][platform];
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`ffmpeg ${platform} process exited with code ${code}`);
    delete userFfmpegProcesses[userId][platform];
  });

  return ffmpegProcess;
};


app.post("/api/v1/users/start-stream", verifyJWT, (req, res) => {
  const { platform, streamKeys } = req.body;
  const userId = req.user._id;
  console.log(`Streaming start on ${userId}`);

  if (!platform || !streamKeys) {
    return res.status(400).json({ error: "Platform and stream keys are required" });
  }

  if (!userFfmpegProcesses[userId]) {
    userFfmpegProcesses[userId] = {};
  }

  if (platform.includes("YouTube") && streamKeys.youtubeKey) {
    if (!userFfmpegProcesses[userId]["YouTube"]) {
      userFfmpegProcesses[userId]["YouTube"] = createFfmpegProcess(userId, "YouTube", streamKeys.youtubeKey);
    }
  }

  if (platform.includes("Facebook") && streamKeys.facebookKey) {
    if (!userFfmpegProcesses[userId]["Facebook"]) {
      userFfmpegProcesses[userId]["Facebook"] = createFfmpegProcess(userId, "Facebook", streamKeys.facebookKey);
    }
  }

  if (platform.includes("Instagram") && streamKeys.instagramKey) {
    if (!userFfmpegProcesses[userId]["Instagram"]) {
      userFfmpegProcesses[userId]["Instagram"] = createFfmpegProcess(userId, "Instagram", streamKeys.instagramKey);
    }
  }

  res.json({ message: `Streaming started on ${platform}` });
});


app.post("/api/v1/users/stop-stream", verifyJWT, (req, res) => {
  const { platform } = req.body;
  const userId = req.user._id;
  console.log(`Streaming stopped on ${userId}`);

  if (!platform) {
    return res.status(400).json({ error: "Platform is required" });
  }

  if (platform.includes("YouTube")) {
    if (userFfmpegProcesses[userId] && userFfmpegProcesses[userId]["YouTube"]) {
      userFfmpegProcesses[userId]["YouTube"].stdin.end();
      userFfmpegProcesses[userId]["YouTube"].kill("SIGINT");
      delete userFfmpegProcesses[userId]["YouTube"];
    }
  }

  if (platform.includes("Facebook")) {
    if (userFfmpegProcesses[userId] && userFfmpegProcesses[userId]["Facebook"]) {
      userFfmpegProcesses[userId]["Facebook"].stdin.end();
      userFfmpegProcesses[userId]["Facebook"].kill("SIGINT");
      delete userFfmpegProcesses[userId]["Facebook"];
    }
  }

  if (platform.includes("Instagram")) {
    if (userFfmpegProcesses[userId] && userFfmpegProcesses[userId]["Instagram"]) {
      userFfmpegProcesses[userId]["Instagram"].stdin.end();
      userFfmpegProcesses[userId]["Instagram"].kill("SIGINT");
      delete userFfmpegProcesses[userId]["Instagram"];
    }
  }

  res.json({ message: `Streaming stopped on ${platform}` });
});

io.on("connection", (socket) => {
  console.log("Socket Connected", socket.id);

  const token = socket.handshake.query.token;
  if (!token) {
    console.log("No token provided. Disconnecting socket.");
    return socket.disconnect(true);
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    socket.userId = decodedToken._id;
    console.log(`socket userId: ${socket.userId}`);
  } catch (err) {
    console.error("Token verification failed. Disconnecting socket.");
    return socket.disconnect(true);
  }
  // console.log(`socket userId: ${socket.userId}`);

  socket.on("binarystream", (stream) => {
    console.log(`Received stream data for user ${socket.userId}`);
    if (userFfmpegProcesses[socket.userId]) {
      Object.values(userFfmpegProcesses[socket.userId]).forEach((ffmpegProcess) => {
        console.log(`Writing stream data to ffmpeg process for ${socket.userId} on platform`);
        ffmpegProcess.stdin.write(stream, (err) => {
          if (err) {
            console.error("ffmpeg write error:", err);
          }
        });
      });
    } else {
      console.error(`No ffmpeg processes found for user ${socket.userId}`);
    }
  });
});


export {server}