import express from "express";
import AuthController from "../controller/authController.js";

const router = express.Router();

router.get("/history", async (req, res) => {
    const result = await AuthController.user_booking();
    const statusCode = result.status === "error" ? 404 : 200;
    return res.status(statusCode).json(result);
});

router.post("/register", async (req, res) => {
    const result = await AuthController.register(req.body);
    const statusCode = result.status === "error" ? 500 : 201;
    return res.status(statusCode).json(result);
});


export default router;