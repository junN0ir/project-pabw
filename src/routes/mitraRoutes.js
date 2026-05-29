import express from "express";
import {
  updateHotelDescription,
  updateRoomCategory,
  updateRoomStatus,
  addMitra,
  deleteMitra,
  getRevenue
} from "../controllers/mitraController.js";
import { getRoomAvailability } from "../controllers/roomController.js";

const router = express.Router();

// UC11 Menambahkan Mitra
router.post("/mitra", addMitra);

// UC12 Menghapus Mitra
router.delete("/mitra/:id_company_profile", deleteMitra);

// UC17 Melihat Pendapatan
router.get("/mitra/:id_company_profile/revenue", getRevenue);

// UC18 Melihat Ketersediaan Kamar
router.get("/mitra/:id_company_profile/availability", getRoomAvailability);

// UC14 Mengubah Deskripsi Hotel
router.put("/mitra/hotels/:id_list_hotel/description", updateHotelDescription);

// UC15 Mengubah Kategori Kamar
router.put("/mitra/room-categories/:id_detail_kamar", updateRoomCategory);

// UC16 Mengubah Status Kamar
router.put("/mitra/rooms/:id_list_kamar/status", updateRoomStatus);

export default router;