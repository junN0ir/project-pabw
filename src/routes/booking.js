import express from "express";
import CheckinController from "../controllers/checkinController.js";

const router = express.Router();

// GET /booking/reservasi?id_customer=1
router.get("/reservasi", async (req, res) => {
    const { id_customer, reservation_number } = req.query;
    
    if (!id_customer) {
        return res.status(400).json({
            status: "error",
            message: "id_customer harus disediakan"
        });
    }

    const result = await CheckinController.getReservationForCheckin(id_customer, reservation_number);
    const statusCode = result.status === "error" ? 404 : 200;
    return res.status(statusCode).json(result);
});

// POST /booking/checkin
router.post("/checkin", async (req, res) => {
    const { id_history, id_customer, id_list_hotel, reservation_number, checkin_time } = req.body;

    if (!id_history || !id_customer || !id_list_hotel) {
        return res.status(400).json({
            status: "error",
            message: "id_history, id_customer, dan id_list_hotel harus disediakan"
        });
    }

    const result = await CheckinController.performCheckin({
        id_history,
        id_customer,
        id_list_hotel,
        reservation_number,
        checkin_time
    });

    const statusCode = result.status === "error" ? 400 : 200;
    return res.status(statusCode).json(result);
});

// GET /booking/checkin-history?id_customer=1
router.get("/checkin-history", async (req, res) => {
    const { id_customer } = req.query;

    if (!id_customer) {
        return res.status(400).json({
            status: "error",
            message: "id_customer harus disediakan"
        });
    }

    const result = await CheckinController.getCheckinHistory(id_customer);
    const statusCode = result.status === "error" ? 404 : 200;
    return res.status(statusCode).json(result);
});

export default router;
