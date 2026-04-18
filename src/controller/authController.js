import prisma from "../config/prisma.js";
import { logActivity } from "../services/activityService.js";

// pengganti trigger register
export const register = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    const user = await prisma.Customer.create({
      data: {
        name,
        email,
        password,
        phoneNumber
      }
    });

    await logActivity({
      userId: user.id,
      userType: "CUSTOMER",
      activityType: "REGISTER",
      details: {
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber
      }
    });

    res.json({
      message: "Register berhasil",
      data: user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// pengganti trigger login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.Customer.findUnique({
      where: { email }
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    await logActivity({
      userId: user.id,
      userType: "CUSTOMER",
      activityType: "LOGIN",
      details: {
        email: user.email,
        name: user.name
      }
    });

    res.json({
      message: "Login berhasil",
      data: user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
