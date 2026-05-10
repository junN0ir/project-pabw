import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Working");
});

app.use(authRoutes);
app.use(sessionRoutes);
app.use(reservationRoutes);
app.use(roomRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
