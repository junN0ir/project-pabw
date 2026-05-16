import express from "express";
import HotelController from "../controllers/hotelController.js";

const router = express.Router();

// GET /hotel/all
router.get("/all", async (req, res) => {
    const result = await HotelController.getAllHotels();
    const statusCode = result.status === "error" ? 404 : 200;
    return res.status(statusCode).json(result);
});

// GET /hotel/:id
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const result = await HotelController.getHotelDescription(id);
    const statusCode = result.status === "error" ? 404 : 200;
    return res.status(statusCode).json(result);
});

// GET /hotel/company/:id
router.get("/company/:id", async (req, res) => {
    const { id } = req.params;
    const result = await HotelController.getHotelByCompany(id);
    const statusCode = result.status === "error" ? 404 : 200;
    return res.status(statusCode).json(result);
});

// POST /hotel/add-description
router.post("/add-description", async (req, res) => {
    const { id_list_hotel, hotel_name, description, facilities, rating } = req.body;

    const result = await HotelController.addHotelDescription({
        id_list_hotel,
        hotel_name,
        description,
        facilities,
        rating
    });

    const statusCode = result.status === "error" ? 400 : 200;
    return res.status(statusCode).json(result);
});

export default router;
