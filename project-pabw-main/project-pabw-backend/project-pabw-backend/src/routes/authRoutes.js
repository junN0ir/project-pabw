import express from "express";
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  forgotPassword
} from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", login);
router.post("/logout", requireAuth, logout);
router.post("/forgot-password", forgotPassword);

export default router;