// import dotenv from "dotenv";
// dotenv.config({});
// import connectDB from "./db/index.js";
// import { app } from "./app.js";

// import http from "http";
// import { Server as SocketIO } from "socket.io";
// import { spawn } from "child_process";
// import bodyParser from "body-parser";
// import cors from "cors";

// // Middleware to parse JSON bodies
// app.use(bodyParser.json());

// // Use CORS middleware
// const server = http.createServer(app);
// const io = new SocketIO(server, {
//   cors: {
//     origin:`http://localhost:3001`, // React app's origin
//     // origin: "https://streamease-ten.vercel.app",
//     methods: ["GET", "POST"],
//   },
// });

// let ffmpegProcesses = {};

// const createFfmpegOptions = (platform, streamKey) => {
//   let rtmpUrl;
//   if (platform === "YouTube") {
//     rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;
//   } else if (platform === "Facebook") {
//     rtmpUrl = `rtmps://live-api-s.facebook.com:443/rtmp/${streamKey}`;
//   } else if (platform === "Instagram") {
//     rtmpUrl = `rtmps://edgetee-upload-ccu1-1.xx.fbcdn.net:443/rtmp/${streamKey}`;
//   }

//   return [
//     "-i",
//     "-",
//     "-c:v",
//     "libx264",
//     "-preset",
//     "ultrafast",
//     "-tune",
//     "zerolatency",
//     "-r",
//     `${25}`,
//     "-g",
//     `${25 * 2}`,
//     "-keyint_min",
//     25,
//     "-crf",
//     "25",
//     "-pix_fmt",
//     "yuv420p",
//     "-sc_threshold",
//     "0",
//     "-profile:v",
//     "main",
//     "-level",
//     "3.1",
//     "-c:a",
//     "aac",
//     "-b:a",
//     "128k",
//     "-ar",
//     128000 / 4,
//     "-f",
//     "flv",
//     rtmpUrl,
//   ];
// };

// const createFfmpegProcess = (platform, streamKey) => {
//   const options = createFfmpegOptions(platform, streamKey);
//   const ffmpegProcess = spawn("ffmpeg", options);

//   ffmpegProcess.stdout.on("data", (data) => {
//     console.log(`ffmpeg ${platform} stdout: ${data}`);
//   });

//   ffmpegProcess.stderr.on("data", (data) => {
//     console.error(`ffmpeg ${platform} stderr: ${data}`);
//   });

//   // Handle error event on stdin stream
//   ffmpegProcess.stdin.on("error", (err) => {
//     console.error(`ffmpeg ${platform} stdin error: ${err}`);
//     delete ffmpegProcesses[platform];
//   });

//   ffmpegProcess.on("close", (code) => {
//     console.log(`ffmpeg ${platform} process exited with code ${code}`);
//     delete ffmpegProcesses[platform];
//   });

//   return ffmpegProcess;
// };

// app.post("/start-stream", (req, res) => {
//   const { platform, streamKeys } = req.body;

//   if (!platform || !streamKeys) {
//     return res
//       .status(400)
//       .json({ error: "Platform and stream keys are required" });
//   }

//   if (platform.includes("YouTube") && streamKeys.youtubeKey) {
//     if (!ffmpegProcesses["YouTube"]) {
//       ffmpegProcesses["YouTube"] = createFfmpegProcess(
//         "YouTube",
//         streamKeys.youtubeKey
//       );
//     }
//   }

//   if (platform.includes("Facebook") && streamKeys.facebookKey) {
//     if (!ffmpegProcesses["Facebook"]) {
//       ffmpegProcesses["Facebook"] = createFfmpegProcess(
//         "Facebook",
//         streamKeys.facebookKey
//       );
//     }
//   }

//   if (platform.includes("Instagram") && streamKeys.instagramKey) {
//     if (!ffmpegProcesses["Instagram"]) {
//       ffmpegProcesses["Instagram"] = createFfmpegProcess(
//         "Instagram",
//         streamKeys.instagramKey
//       );
//     }
//   }

//   res.json({ message: `Streaming started on ${platform}` });
// });

// app.post("/stop-stream", (req, res) => {
//   const { platform } = req.body;

//   if (!platform) {
//     return res.status(400).json({ error: "Platform is required" });
//   }

//   if (platform.includes("YouTube")) {
//     if (ffmpegProcesses["YouTube"]) {
//       ffmpegProcesses["YouTube"].stdin.end();
//       ffmpegProcesses["YouTube"].kill("SIGINT");
//       delete ffmpegProcesses["YouTube"];
//     }
//   }

//   if (platform.includes("Facebook")) {
//     if (ffmpegProcesses["Facebook"]) {
//       ffmpegProcesses["Facebook"].stdin.end();
//       ffmpegProcesses["Facebook"].kill("SIGINT");
//       delete ffmpegProcesses["Facebook"];
//     }
//   }

//   if (platform.includes("Instagram")) {
//     if (ffmpegProcesses["Instagram"]) {
//       ffmpegProcesses["Instagram"].stdin.end();
//       ffmpegProcesses["Instagram"].kill("SIGINT");
//       delete ffmpegProcesses["Instagram"];
//     }
//   }

//   res.json({ message: `Streaming stopped on ${platform}` });
// });

// io.on("connection", (socket) => {
//   console.log("Socket Connected", socket.id);

//   socket.on("binarystream", (stream) => {
//     Object.values(ffmpegProcesses).forEach((ffmpegProcess) => {
//       ffmpegProcess.stdin.write(stream, (err) => {
//         if (err) {
//           console.error("ffmpeg write error:", err);
//         }
//       });
//     });
//   });
// });

// const PORT = process.env.PORT || 8000;

// connectDB()
//   .then(() => {
//     server.listen(PORT, () => {
//       console.log(`Server listening on ${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.log("MONGODB connection failed:", err);
//   });

import dotenv from "dotenv";
dotenv.config({});
import connectDB from "./db/index.js";
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
    origin:"http://localhost:3000", // React app's origin
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

// io.use((socket, next)=>{
//   cookieParser()(socket.request, socket.request.res , (err)=>{
//          if(err) return next(err);
//          const token = socket.request.cookies.accessToken;

//          if (!token) {
//           // console.log("No token provided. Disconnecting socket.");
//           return next(new Error("No token provided"));
//         }
//         const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
//   })
// })

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

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGODB connection failed:", err);
  });

// Auth middleware

