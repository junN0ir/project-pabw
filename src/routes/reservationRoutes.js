import express from "express";
import {
  getCustomerReservationHistory,
  getReservationDetail,
  getReservationStats,
  getMitraReservationHistory,
  getAllReservations
} from "../controllers/reservationController.js";

const router = express.Router();

// UC8 - Melihat Riwayat Reservasi (berdasarkan customer)
router.get("/customer/:id_user/history", getCustomerReservationHistory);

// Detail Reservasi
router.get("/customer/:id_user/detail/:id_history", getReservationDetail);

// Statistik Reservasi
router.get("/customer/:id_user/stats", getReservationStats);

// UC13 - Melihat Reservasi Tiap Hotel dan UC19 - Melihat Customer yang Melakukan Reservasi
router.get("/mitra/:id_company_profile/history", getMitraReservationHistory);

// Reservation routes - lihat semua
router.get("/reservations", getAllReservations);

export default router;
