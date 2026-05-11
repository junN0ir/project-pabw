import express from "express";
import {
  updateHotelDescription,
  updateRoomCategory,
  updateRoomStatus
} from "../controllers/mitraController.js";

const router = express.Router();

// UC14 - Mengubah Deskripsi Hotel
router.put("/mitra/hotels/:id_list_hotel/description", updateHotelDescription);

// UC15 - Mengubah Kategori Kamar
router.put("/mitra/room-categories/:id_detail_kamar", updateRoomCategory);

// UC16 - Mengubah Status Kamar
router.put("/mitra/rooms/:id_list_kamar/status", updateRoomStatus);

export default router;