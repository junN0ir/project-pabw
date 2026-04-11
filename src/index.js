import express from 'express';
import dotenv from 'dotenv';
import authRouter from '../routes/auth.js';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Welcome to the Hotel Room Booking API");
});

app.use( authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});