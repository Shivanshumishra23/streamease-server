import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);

  if ([fullName, email, username, password].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully "));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged In Successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user._id) {
    return res.status(404).json({ message: "Unauthorized user is not logged in" });
  }

  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
});


const addInstaStreamkey = asyncHandler(async (req, res) => {
  try {
    const { Instagram } = req.body;
    if (!Instagram) {
      return res.status(400).json({ error: "Instagram Stream key is required" });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.Instagram = Instagram;
    await user.save();

    return res.status(200).json({ message: "Instagram Stream key updated successfully" });
  } catch (error) {
    console.error("Error updating Instagram stream key:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const addYouTubeStreamkey = asyncHandler(async (req, res) => {
  try {
    const { YouTube } = req.body;
    if (!YouTube) {
      return res.status(400).json({ error: "YouTube Stream key is required" });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.YouTube = YouTube;
    await user.save();

    return res.status(200).json({ message: "YouTube Stream key updated successfully" });
  } catch (error) {
    console.error("Error updating YouTube stream key:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


const addFacebookStreamkey = asyncHandler(async (req, res) => {
  try {
    const { Facebook } = req.body;
    if (!Facebook) {
      return res.status(400).json({ error: "Facebook Stream key is required" });
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.Facebook = Facebook;
    await user.save();

    return res.status(200).json({ message: "Facebook Stream key updated successfully" });
  } catch (error) {
    console.error("Error updating Facebook stream key:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


// const getAllStreamkeys = asyncHandler(async (req, res) => {
//   try {
//     // Fetch the user by ID
//     const user = await User.findById(req.user?._id);

//     // Check if the user exists
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Extract the stream keys
//     const { instStreamKey, youtubeStreamKey, facebookStreamKey } = user;

//     // Return the stream keys in the response
//     return res.status(200).json({
//       instStreamKey,
//       youtubeStreamKey,
//       facebookStreamKey,
//     });
//   } catch (error) {
//     console.error("Error fetching stream keys:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });

const getAllStreamkeys = asyncHandler(async (req, res) => {
  try {
    // Fetch the user by ID
    const user = await User.findById(req.user?._id);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract the stream keys
    const { Instagram, YouTube, Facebook } = user;

    // Create a list of platforms with their keys
    const platforms = [];
    if (YouTube) {
      platforms.push({ name: "YouTube", key: YouTube });
    }
    if (Facebook) {
      platforms.push({ name: "Facebook", key: Facebook });
    }
    if (Instagram) {
      platforms.push({ name: "Instagram", key: Instagram });
    }

    // Return the platforms in the response
    return res.status(200).json({ platforms });
  } catch (error) {
    console.error("Error fetching stream keys:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});




export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  addInstaStreamkey,
  addFacebookStreamkey,
  addYouTubeStreamkey,
  getAllStreamkeys
};
