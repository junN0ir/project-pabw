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
router.get("/sessions/user/:id_user", getSessionByUserId);

// Reservation routes - berdasarkan customer
router.get("/customer/:id_user/history", getCustomerReservationHistory);
router.get("/customer/:id_user/detail/:id_history", getReservationDetail);
router.get("/customer/:id_user/stats", getReservationStats);

// Reservation routes - berdasarkan mitra
router.get("/mitra/:id_company_profile/history", getMitraReservationHistory);

// Reservation routes - lihat semua
router.get("/reservations", getAllReservations);

// Room routes
router.post("/rooms", createRoom);

export default router;
