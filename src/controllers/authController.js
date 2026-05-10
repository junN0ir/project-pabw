import db from "../config/db.js";
import { logActivity } from "../services/activityService.js";

// pengganti trigger register
export const register = async (req, res) => {
  try {
    const { name, email, password, phone_number } = req.body;

    // Validasi wajib
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Nama lengkap wajib diisi." });
    }
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password wajib diisi." });
    }
    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Email wajib diisi." });
    }

    // Normalisasi email
    const emailNormalized = email.toLowerCase().trim();

    // Email unik - cek di tabel user
    const [existing] = await db.query(
      `SELECT id_user FROM user WHERE email = ?`,
      [emailNormalized]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    // Insert ke tabel user dengan role customer
    const [result] = await db.query(
      `INSERT INTO user (name, email, password, phone_number, role) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), emailNormalized, password, phone_number || "", "customer"]
    );

    const userId = result.insertId;

    await logActivity({
      userId,
      userType: "CUSTOMER",
      activityType: "REGISTER",
      details: {
        email: emailNormalized,
        name: name.trim(),
        phone_number: phone_number || ""
      }
    });

    res.json({
      message: "Register berhasil",
      data: {
        id: userId,
        nama: name.trim(),
        email: emailNormalized,
        role: "customer",
        phone_number: phone_number || ""
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// pengganti trigger login (support identifier: email atau mitra ID)
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validasi input
    if (!identifier || identifier.trim() === "") {
      return res.status(400).json({ message: "Email atau Mitra ID wajib diisi." });
    }
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password wajib diisi." });
    }

    // Cek apakah input adalah angka (ID Mitra)
    const isNumeric = /^[0-9]+$/.test(identifier);

    let user, userType;

    if (isNumeric) {
      // LOGIN SEBAGAI MITRA
      const id_company_profile = parseInt(identifier, 10);
      const [mitraRows] = await db.query(
        `SELECT * FROM company_profile WHERE id_company_profile = ?`,
        [id_company_profile]
      );

      if (mitraRows.length === 0) {
        return res.status(401).json({ message: "Mitra tidak terdaftar." });
      }

      const mitra = mitraRows[0];

      if (mitra.password !== password) {
        return res.status(401).json({ message: "Password salah." });
      }

      user = {
        id: mitra.id_company_profile,
        nama: mitra.company_name,
        role: "mitra",
        email: mitra.email,
        alamat: mitra.address,
        phone_number: mitra.phone_number
      };
      userType = "MITRA";

    } else {
      // LOGIN SEBAGAI CUSTOMER
      const emailNormalized = identifier.toLowerCase().trim();

      const [customerRows] = await db.query(
        `SELECT id_user, name, email, password, phone_number, role FROM user WHERE email = ? AND role = 'customer'`,
        [emailNormalized]
      );

      if (customerRows.length === 0) {
        return res.status(401).json({ message: "Email tidak terdaftar atau bukan customer." });
      }

      const customer = customerRows[0];

      if (customer.password !== password) {
        return res.status(401).json({ message: "Password salah." });
      }

      user = {
        id: customer.id_user,
        nama: customer.name,
        role: "customer",
        email: customer.email,
        phone_number: customer.phone_number
      };
      userType = "CUSTOMER";
    }

    // Cek apakah sudah ada session aktif
    const [existingSession] = await db.query(
      `SELECT id_login, last_activity FROM session_login 
       WHERE id_user = ? AND status = 'active'
       ORDER BY login_time DESC LIMIT 1`,
      [user.id]
    );

    if (existingSession.length > 0) {
      const lastActivity = new Date(existingSession[0].last_activity);
      const now = new Date();
      const diffMinutes = (now - lastActivity) / 1000 / 60;

      if (diffMinutes < 5) {
        // Session masih aktif dan belum expired
        return res.status(403).json({
          message: "Akun ini sedang login di perangkat lain. Silakan logout terlebih dahulu."
        });
      } else {
        // Session sudah expired (lebih dari 5 menit tidak ada aktivitas), auto logout
        await db.query(
          `UPDATE session_login 
           SET status = 'inactive', logout_time = NOW() 
           WHERE id_login = ?`,
          [existingSession[0].id_login]
        );
      }
    }

    // Simpan session login baru
    await db.query(
      `INSERT INTO session_login (id_user, user_type, status, login_time, last_activity, logout_time)
       VALUES (?, ?, 'active', NOW(), NOW(), NULL)`,
      [user.id, userType]
    );

    res.json({
      message: "Login berhasil",
      data: user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
