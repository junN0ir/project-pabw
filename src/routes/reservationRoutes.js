import express from "express";
import {
  getCustomerReservationHistory,
  getReservationDetail,
  getReservationStats,
  getMitraReservationHistory,
  getAllReservations
} from "../controllers/reservationController.js";

const router = express.Router();

// Reservation routes - berdasarkan customer
router.get("/customer/:id_user/history", getCustomerReservationHistory);
router.get("/customer/:id_user/detail/:id_history", getReservationDetail);
router.get("/customer/:id_user/stats", getReservationStats);

// Reservation routes - berdasarkan mitra
router.get("/mitra/:id_company_profile/history", getMitraReservationHistory);

// Reservation routes - lihat semua
router.get("/reservations", getAllReservations);

export default router;
