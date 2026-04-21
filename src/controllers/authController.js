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

// GET session login berdasarkan userId
export const getSessionByUserId = async (req, res) => {
  try {
    const { id_user } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM session_login WHERE id_user = ? AND status = 'active' ORDER BY login_time DESC LIMIT 1`,
      [parseInt(id_user)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Session login tidak ditemukan untuk user ini." });
    }

    res.json({
      message: "Data session login berhasil diambil",
      data: rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET active sessions
export const getActiveSessions = async (req, res) => {
  try {
    const { user_type, limit = 20, offset = 0 } = req.query;

    let where = "WHERE status = 'active'";
    const params = [];

    if (user_type) {
      where += " AND user_type = ?";
      params.push(user_type.toLowerCase());
    }

    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);

    const [sessions] = await db.query(
      `SELECT * FROM session_login ${where} ORDER BY last_activity DESC LIMIT ? OFFSET ?`,
      [...params, limitVal, offsetVal]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM session_login ${where}`,
      params
    );

    res.json({
      message: "Data active session login berhasil diambil",
      data: sessions,
      pagination: {
        total,
        limit: limitVal,
        offset: offsetVal
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET semua session history
export const getAllSessionsHistory = async (req, res) => {
  try {
    const { user_type, limit = 20, offset = 0 } = req.query;

    let where = "WHERE 1=1";
    const params = [];

    if (user_type) {
      where += " AND user_type = ?";
      params.push(user_type.toLowerCase());
    }

    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);

    // Gunakan db.query() agar LIMIT & OFFSET tidak error
    const [sessions] = await db.query(
      `SELECT * FROM session_login ${where} ORDER BY login_time DESC LIMIT ? OFFSET ?`,
      [...params, limitVal, offsetVal]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM session_login ${where}`,
      params
    );

    res.json({
      message: "Data semua session login berhasil diambil",
      data: sessions,
      pagination: {
        total,
        limit: limitVal,
        offset: offsetVal
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET histori reservasi customer
export const getCustomerReservationHistory = async (req, res) => {
  try {
    const { id_user } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    if (!id_user) {
      return res.status(400).json({ message: "Customer ID wajib diisi." });
    }

    // Cek customer ada atau tidak
    const [customerRows] = await db.query(
      `SELECT id_user FROM user WHERE id_user = ?`,
      [parseInt(id_user)]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({ message: "Customer tidak ditemukan." });
    }

    let where = "WHERE hp.id_user = ?";
    const params = [parseInt(id_user)];

    if (status) {
      where += " AND hp.status = ?";
      params.push(status.toLowerCase());
    }

    const [reservations] = await db.query(
      `SELECT 
        hp.id_history, hp.purchase_date, hp.checkin_time, hp.checkout_time, hp.amount, hp.status,
        lk.room_number,
        lh.hotel_name, lh.location,
        dk.type_room, dk.capacity,
        cp.company_name
      FROM history_purchase hp
      JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
      JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
      JOIN detail_kamar dk ON lk.id_detail_kamar = dk.id_detail_kamar
      JOIN company_profile cp ON hp.id_company_profile = cp.id_company_profile
      ${where}
      ORDER BY hp.purchase_date DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM history_purchase hp ${where}`,
      params
    );

    res.json({
      message: "Histori reservasi berhasil diambil",
      data: reservations.map(r => ({
        id_history: r.id_history,
        purchase_date: r.purchase_date,
        checkin_time: r.checkin_time,
        checkout_time: r.checkout_time,
        amount: r.amount,
        status: r.status,
        room_number: r.room_number,
        hotel_name: r.hotel_name,
        roomType: r.type_room,
        capacity: r.capacity,
        hotel_location: r.location,
        company_name: r.company_name
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET detail reservasi spesifik
export const getReservationDetail = async (req, res) => {
  try {
    const { id_user, id_history } = req.params;

    if (!id_user || !id_history) {
      return res.status(400).json({ message: "Customer ID dan History ID wajib diisi." });
    }

    const [rows] = await db.query(
      `SELECT 
        hp.id_history,hp.id_user, hp.purchase_date, hp.checkin_time, hp.checkout_time, hp.amount, hp.status,
        c.id_user AS id_user, c.name AS customerName, c.email AS customerEmail, c.phone_number AS customerPhone,
        lk.id_list_kamar, lk.room_number, lk.price AS roomPrice,
        dk.type_room, dk.facility, dk.capacity,
        lh.id_list_hotel, lh.hotel_name, lh.location AS hotel_location, lh.contact_person, lh.contact_email, lh.contact_phone,
        cp.id_company_profile, cp.company_name, cp.email AS company_email, cp.address AS company_address, cp.phone_number AS companyPhone
      FROM history_purchase hp
      JOIN user c ON hp.id_user = c.id_user
      JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
      JOIN detail_kamar dk ON lk.id_detail_kamar = dk.id_detail_kamar
      JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
      JOIN company_profile cp ON hp.id_company_profile = cp.id_company_profile
      WHERE hp.id_history = ? AND hp.id_user = ?`,
      [parseInt(id_history), parseInt(id_user)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reservasi tidak ditemukan." });
    }

    const r = rows[0];

    res.json({
      message: "Detail reservasi berhasil diambil",
      data: {
        id_history: r.id_history,
        purchase_date: r.purchase_date,
        checkin_time: r.checkin_time,
        checkout_time: r.checkout_time,
        amount: r.amount,
        status: r.status,
        customer: {
          id_user: r.id_user,
          nama: r.customerName,
          email: r.customerEmail,
          nomor_telepon: r.customerPhone
        },
        room: {
          id_list_kamar: r.id_list_kamar,
          number: r.room_number,
          type: r.type_room,
          facility: r.facility,
          capacity: r.capacity,
          price: r.roomPrice
        },
        hotel: {
          id_list_hotel: r.id_list_hotel,
          nama: r.hotel_name,
          location: r.hotel_location,
          contact_person: r.contact_person,
          contact_email: r.contact_email,
          contact_phone: r.contact_phone
        },
        company: {
          id_company_profile: r.id_company_profile,
          nama: r.company_name,
          email: r.company_email,
          alamat: r.company_address,
          nomor_telepon: r.companyPhone
        }
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ringkasan statistik reservasi customer
export const getReservationStats = async (req, res) => {
  try {
    const { id_user } = req.params;

    if (!id_user) {
      return res.status(400).json({ message: "ID User wajib diisi." });
    }

    const [customerRows] = await db.query(
      `SELECT id_user FROM user WHERE id_user = ?`,
      [parseInt(id_user)]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    const [[stats]] = await db.query(
      `SELECT
        COUNT(*) AS totalReservasi,
        COALESCE(SUM(amount), 0) AS totalBiaya,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
      FROM history_purchase
      WHERE id_user = ?`,
      [parseInt(id_user)]
    );

    res.json({
      message: "Statistik reservasi berhasil diambil",
      data: {
        totalReservasi: stats.totalReservasi,
        totalBiaya: parseFloat(stats.totalBiaya),
        confirmed: stats.confirmed,
        cancelled: stats.cancelled
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET histori reservasi berdasarkan mitra/company
export const getMitraReservationHistory = async (req, res) => {
  try {
    const { id_company_profile } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    if (!id_company_profile) {
      return res.status(400).json({ message: "ID Company Profile wajib diisi." });
    }

    const [mitraRows] = await db.query(
      `SELECT id_company_profile FROM company_profile WHERE id_company_profile = ?`,
      [parseInt(id_company_profile)]
    );

    if (mitraRows.length === 0) {
      return res.status(404).json({ message: "Mitra tidak ditemukan." });
    }

    let where = "WHERE hp.id_company_profile = ?";
    const params = [parseInt(id_company_profile)];

    if (status) {
      where += " AND hp.status = ?";
      params.push(status.toUpperCase());
    }

    const [reservations] = await db.query(
      `SELECT 
        hp.id_history, hp.id_history, hp.purchase_date, hp.checkin_time, hp.checkout_time, hp.amount, hp.status,
        lk.room_number,
        lh.hotel_name, lh.location AS hotel_location,
        dk.type_room, dk.capacity,
        c.name AS customerName, c.email AS customerEmail
      FROM history_purchase hp
      JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
      JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
      JOIN detail_kamar dk ON lk.id_detail_kamar = dk.id_detail_kamar
      JOIN user c ON hp.id_user = c.id_user
      ${where}
      ORDER BY hp.purchase_date DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM history_purchase hp ${where}`,
      params
    );

    res.json({
      message: "Histori reservasi mitra berhasil diambil",
      data: reservations.map(r => ({
        id_history: r.id_history,
        purchase_date: r.purchase_date,
        checkin_time: r.checkin_time,
        checkout_time: r.checkout_time,
        amount: r.amount,
        status: r.status,
        room_number: r.room_number,
        hotel_name: r.hotel_name,
        roomType: r.type_room,
        capacity: r.capacity,
        hotel_location: r.hotel_location,
        customerName: r.customerName,
        customerEmail: r.customerEmail
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET semua reservasi (untuk admin)
export const getAllReservations = async (req, res) => {
  try {
    const { status, id_user, id_company_profile, limit = 10, offset = 0 } = req.query;

    let where = "WHERE 1=1";
    const params = [];

    if (status) {
      where += " AND hp.status = ?";
      params.push(status.toUpperCase());
    }
    if (id_user) {
      where += " AND hp.id_user = ?";
      params.push(parseInt(id_user));
    }
    if (id_company_profile) {
      where += " AND hp.id_company_profile = ?";
      params.push(parseInt(id_company_profile));
    }

    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);

    const [reservations] = await db.query(
      `SELECT 
        hp.id_history, hp.purchase_date, hp.checkin_time, hp.checkout_time, hp.amount, hp.status,
        lk.room_number,
        lh.hotel_name, lh.location AS hotel_location,
        dk.type_room,
        c.name AS user_name, c.email AS user_email,
        cp.company_name AS mitra_name, cp.email AS mitra_email
      FROM history_purchase hp
      JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
      JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
      JOIN detail_kamar dk ON lk.id_detail_kamar = dk.id_detail_kamar
      JOIN user c ON hp.id_user = c.id_user
      JOIN company_profile cp ON hp.id_company_profile = cp.id_company_profile
      ${where}
      ORDER BY hp.purchase_date DESC LIMIT ? OFFSET ?`,
      [...params, limitVal, offsetVal]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM history_purchase hp ${where}`,
      params
    );

    res.json({
      message: "Semua reservasi berhasil diambil",
      data: reservations.map(r => ({
        id_history: r.id_history,
        purchase_date: r.purchase_date,
        checkin_time: r.checkin_time,
        checkout_time: r.checkout_time,
        amount: r.amount,
        status: r.status,
        room_number: r.room_number,
        hotel_name: r.hotel_name,
        type_room: r.type_room,
        hotel_location: r.hotel_location,
        user_name: r.user_name,
        user_email: r.user_email,
        mitra_name: r.mitra_name,
        mitra_email: r.mitra_email
      })),
      pagination: {
        total,
        limit: limitVal,
        offset: offsetVal
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE kamar baru
export const createRoom = async (req, res) => {
  try {
    // PERBAIKAN: Ganti id_detail menjadi id_detail_kamar
    const { room_number, price, id_list_hotel, id_detail_kamar, status } = req.body;

    if (!room_number || room_number.trim() === "") {
      return res.status(400).json({ message: "Nomor kamar wajib diisi." });
    }

    if (!price || parseFloat(price) <= 0) {
      return res.status(400).json({ message: "Harga harus lebih besar dari 0." });
    }

    // PERBAIKAN: Ganti id_detail menjadi id_detail_kamar
    if (!id_detail_kamar) {
      return res.status(400).json({ message: "Detail ID wajib diisi." });
    }

    if (!id_list_hotel) {
      return res.status(400).json({ message: "Hotel ID wajib diisi." });
    }

    const [hotelRows] = await db.query(
      `SELECT id_list_hotel FROM list_hotel WHERE id_list_hotel = ?`,
      [parseInt(id_list_hotel)]
    );

    if (hotelRows.length === 0) {
      return res.status(404).json({ message: "Hotel tidak ditemukan." });
    }

    // PERBAIKAN: Ganti id_detail menjadi id_detail_kamar
    const [detailRows] = await db.query(
      `SELECT id_detail_kamar FROM detail_kamar WHERE id_detail_kamar = ?`,
      [parseInt(id_detail_kamar)]
    );

    if (detailRows.length === 0) {
      return res.status(404).json({ message: "Detail kamar tidak ditemukan." });
    }

    const [existingRoom] = await db.query(
      `SELECT id_list_kamar FROM list_kamar WHERE room_number = ? AND id_list_hotel = ?`,
      [room_number.trim(), parseInt(id_list_hotel)]
    );

    if (existingRoom.length > 0) {
      return res.status(409).json({ message: "Nomor kamar sudah ada di hotel ini." });
    }

    const roomStatus = status ? status.toUpperCase() : "AVAILABLE";

    const [result] = await db.query(
      `INSERT INTO list_kamar (id_list_hotel, id_detail_kamar, room_number, price, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [parseInt(id_list_hotel), parseInt(id_detail_kamar), room_number.trim(), parseFloat(price), roomStatus]
    );

    const [newRoom] = await db.query(
      `SELECT k.id_list_kamar, k.room_number, k.price, k.status, lh.hotel_name, dk.type_room, dk.description,dk.facility, dk.capacity 
       FROM list_kamar k
       JOIN list_hotel lh ON k.id_list_hotel = lh.id_list_hotel
       JOIN detail_kamar dk ON k.id_detail_kamar = dk.id_detail_kamar
       WHERE k.id_list_kamar = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: "Kamar berhasil ditambahkan",
      data: newRoom[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
