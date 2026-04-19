import express from "express";
import { 
  register, 
  login,
  getAllSessionsHistory,
  getActiveSessions,
  getSessionByUserId,
  getCustomerReservationHistory,
  getReservationDetail,
  getReservationStats,
  getMitraReservationHistory,
  getAllReservations,
  createRoom
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Session login routes
router.get("/sessions", getAllSessionsHistory);
router.get("/sessions/active", getActiveSessions);
router.get("/sessions/user/:userId", getSessionByUserId);

// Reservation routes - berdasarkan customer
router.get("/customer/:customerId/history", getCustomerReservationHistory);
router.get("/customer/:customerId/detail/:reservationId", getReservationDetail);
router.get("/customer/:customerId/stats", getReservationStats);

// Reservation routes - berdasarkan mitra
router.get("/mitra/:mitraId/history", getMitraReservationHistory);

// Reservation routes - lihat semua
router.get("/reservations", getAllReservations);

// Room routes
router.post("/rooms", createRoom);

export default router;
