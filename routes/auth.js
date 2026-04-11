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

router.post("/kamar", async (req, res) => {
    const result = await AuthController.tambah_kamar(req.body);
    const statusCode = result.status === "error" ? 500 : 201;
    return res.status(statusCode).json(result);
});

router.post("/login", async (req, res) => {
    const result = await AuthController.login(req.body);
    const statusCode = result.status === "error" ? 401 : 200;
    return res.status(statusCode).json(result);
});

router.post("/logout", async (req, res) => {
    const result = await AuthController.logout(req.body);
    const statusCode = result.status === "error" ? (result.statusCode || 400) : 200;
    return res.status(statusCode).json(result);
});

router.get("/hotel", async (req, res) => {
    const result = await AuthController.get_hotel();
    const statusCode = result.status === "error" ? 404 : 200;
    return res.status(statusCode).json(result);
});

router.get("/session/customer/active", async (req, res) => {
    const result = await AuthController.get_all_active_customer_sessions();
    const statusCode = result.status === "error" ? (result.statusCode || 500) : 200;
    return res.status(statusCode).json(result);
});

router.get("/session/customer/all", async (req, res) => {
    const result = await AuthController.get_all_customer_sessions();
    const statusCode = result.status === "error" ? (result.statusCode || 500) : 200;
    return res.status(statusCode).json(result);
});

router.post("/session/customer", async (req, res) => {
    const result = await AuthController.get_customer_session(req.body);
    const statusCode = result.status === "error" ? (result.statusCode || 500) : 200;
    return res.status(statusCode).json(result);
});

export default router;