import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();




// Use CORS middleware
const corsOptions = {
  origin:`http://localhost:3000` , // Adjust this to match your frontend's origin
  // origin: 'https://streamease-ten.vercel.app',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));



app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes import

import userRouter from "./routes/user.routes.js";


app.get("/", (req, res) => {
  res.send("Server was listening");
});

//routes declaration
app.use("/api/v1/users", userRouter);

export { app };
