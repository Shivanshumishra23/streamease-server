import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  addInstaStreamkey,
  addYouTubeStreamkey,
  getAllStreamkeys,
  addFacebookStreamkey,

} from "../controllers/user.controller.js";


import { verifyJWT, verifyToken } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(registerUser);

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/update-instaStreamkey").patch(verifyJWT, addInstaStreamkey);
router.route("/update-youtubeStreamkey").patch(verifyJWT, addYouTubeStreamkey);
router.route("/update-facebookStreamkey").patch(verifyJWT, addFacebookStreamkey);
router.route("/getAllStreamkeys").get(verifyJWT, getAllStreamkeys);
router.route("/verify").post(verifyToken)


export default router;
