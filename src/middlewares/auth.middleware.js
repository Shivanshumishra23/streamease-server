import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { response } from "express";

// export const verifyJWT = asyncHandler(async (req, res, next) => {
//   try {
//     const token =
//       req.cookies?.accessToken ||
//       req.header("Authorization")?.replace("Bearer ", "");

//     // console.log(token);
//     if (!token) {
//       // throw new ApiError(401, "Unauthorized request")
//       return res.status(401).json({ message: "Unauthorized request" });
//     }

//     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//     const user = await User.findById(decodedToken?._id).select(
//       "-password -refreshToken"
//     );

//     if (!user) {
    
//       return res.status(401).json({ message: "Invalid Access Token" });
//     }

//     req.user = user;
//     // console.log(req.user);
//     next();
//   } catch (error) {
//     // throw new ApiError(401, error?.message || "Invalid access token");
//     return res.status(401).json({ message :error?.message || "Invalid access token" });
//   }
// });

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // console.log("Token:", token); // Log token to check its presence

    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // console.log("Decoded Token:", decodedToken); // Log decoded token

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      console.log("No user found");
      return res.status(401).json({ message: "Invalid Access Token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(401).json({ message: error?.message || "Invalid access token" });
  }
});

export const verifyToken = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log(req.header("Authorization"));
    if (!token) {
      // throw new ApiError(401, "Unauthorized request")
      return res.status(401).json({ message: "Unauthorized request" });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (decodedToken) {
      return res.status(200).json({ message: "Verified" });
    }
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
    
      return res.status(401).json({ message: "Invalid Access Token" });
    }

    req.user = user;
    // next();
    return res.status(401).json({ message: "Invalid token" });
  } catch (error) {
    // throw new ApiError(401, error?.message || "Invalid access token");
    return res.status(401).json({ message :"Invalid access token" });
  }
});

