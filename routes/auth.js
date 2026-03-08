import express from "express";
import AuthController from "../controller/authController.js";

const router = express.Router();

router.get("/history", async (req, res) => {
    const result = await AuthController.user_booking();
    const statusCode = result.status === "error" ? 404 : 200;
    return res.status(statusCode).json(result);
});

export default router;