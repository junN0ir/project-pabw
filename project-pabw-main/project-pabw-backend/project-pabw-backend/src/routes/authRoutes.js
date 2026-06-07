import express from "express";
import {
  register,
  login,
  forgotPassword
} from "../controllers/authController.js";

const router = express.Router();

// UC1 Registrasi dan UC2 Melakukan Autentifikasi
router.post("/register", register);

// UC10 Login dan UC2 Melakukan Autentifikasi
router.post("/login", login);

// UC5 Lupa Password
router.post("/forgot-password", forgotPassword);

export default router;