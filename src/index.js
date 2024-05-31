import dotenv from 'dotenv';
dotenv.config({});
import connectDB from './db/index.js';
import { app } from './app.js';

import http from 'http';
import { Server as SocketIO } from 'socket.io';
import { spawn } from 'child_process';
import bodyParser from 'body-parser';
import cors from 'cors';

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Use CORS middleware
const server = http.createServer(app);
const io = new SocketIO(server, {
    cors: {
        origin: 'http://localhost:3001', // React app's origin
        methods: ['GET', 'POST']
    }
});

let ffmpegProcesses = {};

const createFfmpegOptions = (platform, streamKey) => {
    let rtmpUrl;
    if (platform === 'YouTube') {
        rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;
    } else if (platform === 'Facebook') {
        rtmpUrl = `rtmps://live-api-s.facebook.com:443/rtmp/${streamKey}`;
    } else if (platform === 'Instagram') {
        rtmpUrl = `rtmps://edgetee-upload-ccu1-1.xx.fbcdn.net:443/rtmp/${streamKey}`;
    }

    return [
        '-i',
        '-',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-r', `${25}`,
        '-g', `${25 * 2}`,
        '-keyint_min', 25,
        '-crf', '25',
        '-pix_fmt', 'yuv420p',
        '-sc_threshold', '0',
        '-profile:v', 'main',
        '-level', '3.1',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', 128000 / 4,
        '-f', 'flv',
        rtmpUrl
    ];
};

const createFfmpegProcess = (platform, streamKey) => {
    const options = createFfmpegOptions(platform, streamKey);
    const ffmpegProcess = spawn('ffmpeg', options);

    ffmpegProcess.stdout.on('data', (data) => {
        console.log(`ffmpeg ${platform} stdout: ${data}`);
    });

    ffmpegProcess.stderr.on('data', (data) => {
        console.error(`ffmpeg ${platform} stderr: ${data}`);
    });

    // Handle error event on stdin stream
    ffmpegProcess.stdin.on('error', (err) => {
        console.error(`ffmpeg ${platform} stdin error: ${err}`);
        delete ffmpegProcesses[platform];
    });

    ffmpegProcess.on('close', (code) => {
        console.log(`ffmpeg ${platform} process exited with code ${code}`);
        delete ffmpegProcesses[platform];
    });

    return ffmpegProcess;
};

app.post('/start-stream', (req, res) => {
    const { platform, streamKeys } = req.body;

    if (!platform || !streamKeys) {
        return res.status(400).json({ error: 'Platform and stream keys are required' });
    }

    if (platform.includes('YouTube') && streamKeys.youtubeKey) {
        if (!ffmpegProcesses['YouTube']) {
            ffmpegProcesses['YouTube'] = createFfmpegProcess('YouTube', streamKeys.youtubeKey);
        }
    }

    if (platform.includes('Facebook') && streamKeys.facebookKey) {
        if (!ffmpegProcesses['Facebook']) {
            ffmpegProcesses['Facebook'] = createFfmpegProcess('Facebook', streamKeys.facebookKey);
        }
    }

    if (platform.includes('Instagram') && streamKeys.instagramKey) {
        if (!ffmpegProcesses['Instagram']) {
            ffmpegProcesses['Instagram'] = createFfmpegProcess('Instagram', streamKeys.instagramKey);
        }
    }

    res.json({ message: `Streaming started on ${platform}` });
});

app.post('/stop-stream', (req, res) => {
    const { platform } = req.body;

    if (!platform) {
        return res.status(400).json({ error: 'Platform is required' });
    }

    if (platform.includes('YouTube')) {
        if (ffmpegProcesses['YouTube']) {
            ffmpegProcesses['YouTube'].stdin.end();
            ffmpegProcesses['YouTube'].kill('SIGINT');
            delete ffmpegProcesses['YouTube'];
        }
    }

    if (platform.includes('Facebook')) {
        if (ffmpegProcesses['Facebook']) {
            ffmpegProcesses['Facebook'].stdin.end();
            ffmpegProcesses['Facebook'].kill('SIGINT');
            delete ffmpegProcesses['Facebook'];
        }
    }

    if (platform.includes('Instagram')) {
        if (ffmpegProcesses['Instagram']) {
            ffmpegProcesses['Instagram'].stdin.end();
            ffmpegProcesses['Instagram'].kill('SIGINT');
            delete ffmpegProcesses['Instagram'];
        }
    }

    res.json({ message: `Streaming stopped on ${platform}` });
});

io.on('connection', socket => {
    console.log('Socket Connected', socket.id);

    socket.on('binarystream', stream => {
        Object.values(ffmpegProcesses).forEach((ffmpegProcess) => {
            ffmpegProcess.stdin.write(stream, (err) => {
                if (err) {
                    console.error('ffmpeg write error:', err);
                }
            });
        });
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
