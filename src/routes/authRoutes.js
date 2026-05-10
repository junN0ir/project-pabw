import express from "express";
import { 
  register, 
  login
} from "../controllers/authController.js";
import { logActivity } from "../services/activityService.js";

const router = express.Router();

router.post("/register", logActivity, register);
router.post("/login", logActivity, login);

export default router;
