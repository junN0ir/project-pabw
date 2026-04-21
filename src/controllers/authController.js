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
    const [existing] = await db.execute(
      `SELECT id_user FROM user WHERE email = ?`,
      [emailNormalized]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    // Insert ke tabel user dengan role customer
    const [result] = await db.execute(
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
      const mitraId = parseInt(identifier, 10);
      const [mitraRows] = await db.execute(
        `SELECT * FROM company_profile WHERE id_company_profile = ?`,
        [mitraId]
      );

      if (mitraRows.length === 0) {
        return res.status(401).json({ message: "Mitra tidak terdaftar." });
      }

      const mitra = mitraRows[0];

      // Validasi password
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

      const [customerRows] = await db.execute(
        `SELECT id_user, name, email, password, phone_number, role FROM user WHERE email = ? AND role = 'customer'`,
        [emailNormalized]
      );

      if (customerRows.length === 0) {
        return res.status(401).json({ message: "Email tidak terdaftar atau bukan customer." });
      }

      const customer = customerRows[0];

      // Validasi password
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

    await logActivity({
      userId: user.id,
      userType,
      activityType: "LOGIN",
      details: {
        email: user.email,
        nama: user.nama,
        role: user.role
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

// GET session login berdasarkan userId
export const getSessionByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.execute(
      `SELECT * FROM session_login WHERE id_user = ? AND status = 'active' ORDER BY login_time DESC LIMIT 1`,
      [parseInt(userId)]
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
    const { user_type, limit = 10, offset = 0 } = req.query;

    let where = "WHERE status = 'active'";
    const params = [];

    if (user_type) {
      where += " AND user_type = ?";
      params.push(user_type.toLowerCase());
    }

    const [sessions] = await db.execute(
      `SELECT * FROM session_login ${where} ORDER BY last_activity DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM session_login ${where}`,
      params
    );

    res.json({
      message: "Data active session login berhasil diambil",
      data: sessions,
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

// GET semua session history
export const getAllSessionsHistory = async (req, res) => {
  try {
    const { user_type, limit = 10, offset = 0 } = req.query;

    let where = "WHERE 1=1";
    const params = [];

    if (user_type) {
      where += " AND user_type = ?";
      params.push(user_type.toLowerCase());
    }

    const [sessions] = await db.execute(
      `SELECT * FROM session_login ${where} ORDER BY login_time DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM session_login ${where}`,
      params
    );

    res.json({
      message: "Data semua session login berhasil diambil",
      data: sessions,
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

// GET histori reservasi customer
export const getCustomerReservationHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID wajib diisi." });
    }

    // Cek customer ada atau tidak
    const [customerRows] = await db.execute(
      `SELECT id_customer FROM customer WHERE id_customer = ?`,
      [parseInt(customerId)]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({ message: "Customer tidak ditemukan." });
    }

    let where = "WHERE hp.id_customer = ?";
    const params = [parseInt(customerId)];

    if (status) {
      where += " AND hp.status = ?";
      params.push(status.toLowerCase());
    }

    const [reservations] = await db.execute(
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

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM history_purchase hp ${where}`,
      params
    );

    res.json({
      message: "Histori reservasi berhasil diambil",
      data: reservations.map(r => ({
        id: r.id_history,
        purchaseDate: r.purchase_date,
        checkinTime: r.checkin_time,
        checkoutTime: r.checkout_time,
        amount: r.amount,
        status: r.status,
        roomNumber: r.room_number,
        hotelName: r.hotel_name,
        roomType: r.type_room,
        capacity: r.capacity,
        hotelLocation: r.location,
        companyName: r.company_name
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
    const { customerId, reservationId } = req.params;

    if (!customerId || !reservationId) {
      return res.status(400).json({ message: "Customer ID dan Reservation ID wajib diisi." });
    }

    const [rows] = await db.execute(
      `SELECT 
        hp.id, hp.purchaseDate, hp.checkinTime, hp.checkoutTime, hp.amount, hp.status,
        c.id AS customerId, c.name AS customerName, c.email AS customerEmail, c.phoneNumber AS customerPhone,
        lk.roomNumber, lk.price AS roomPrice,
        dk.typeRoom, dk.facility, dk.capacity,
        lh.hotelName, lh.location AS hotelLocation, lh.contactPerson, lh.contactEmail, lh.contactPhone,
        cp.companyName, cp.email AS companyEmail, cp.address AS companyAddress, cp.phoneNumber AS companyPhone
      FROM HistoryPurchase hp
      JOIN Customer c ON hp.customerId = c.id
      JOIN ListKamar lk ON hp.roomId = lk.id
      JOIN DetailKamar dk ON lk.detailId = dk.id
      JOIN ListHotel lh ON lk.hotelId = lh.id
      JOIN CompanyProfile cp ON hp.companyId = cp.id
      WHERE hp.id = ? AND hp.customerId = ?`,
      [parseInt(reservationId), parseInt(customerId)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Reservasi tidak ditemukan." });
    }

    const r = rows[0];

    res.json({
      message: "Detail reservasi berhasil diambil",
      data: {
        id: r.id,
        purchaseDate: r.purchaseDate,
        checkinTime: r.checkinTime,
        checkoutTime: r.checkoutTime,
        amount: r.amount,
        status: r.status,
        customer: {
          id: r.customerId,
          nama: r.customerName,
          email: r.customerEmail,
          nomor_telepon: r.customerPhone
        },
        room: {
          number: r.roomNumber,
          type: r.typeRoom,
          facility: r.facility,
          capacity: r.capacity,
          price: r.roomPrice
        },
        hotel: {
          nama: r.hotelName,
          location: r.hotelLocation,
          contactPerson: r.contactPerson,
          contactEmail: r.contactEmail,
          contactPhone: r.contactPhone
        },
        company: {
          nama: r.companyName,
          email: r.companyEmail,
          alamat: r.companyAddress,
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
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID wajib diisi." });
    }

    const [customerRows] = await db.execute(
      `SELECT id FROM Customer WHERE id = ?`,
      [parseInt(customerId)]
    );

    if (customerRows.length === 0) {
      return res.status(404).json({ message: "Customer tidak ditemukan." });
    }

    const [[stats]] = await db.execute(
      `SELECT
        COUNT(*) AS totalReservasi,
        COALESCE(SUM(amount), 0) AS totalBiaya,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
      FROM HistoryPurchase
      WHERE customerId = ?`,
      [parseInt(customerId)]
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
    const { mitraId } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    if (!mitraId) {
      return res.status(400).json({ message: "Mitra ID wajib diisi." });
    }

    const [mitraRows] = await db.execute(
      `SELECT id FROM CompanyProfile WHERE id = ?`,
      [parseInt(mitraId)]
    );

    if (mitraRows.length === 0) {
      return res.status(404).json({ message: "Mitra tidak ditemukan." });
    }

    let where = "WHERE hp.companyId = ?";
    const params = [parseInt(mitraId)];

    if (status) {
      where += " AND hp.status = ?";
      params.push(status.toUpperCase());
    }

    const [reservations] = await db.execute(
      `SELECT 
        hp.id, hp.purchaseDate, hp.checkinTime, hp.checkoutTime, hp.amount, hp.status,
        lk.roomNumber,
        lh.hotelName, lh.location AS hotelLocation,
        dk.typeRoom, dk.capacity,
        c.name AS customerName, c.email AS customerEmail
      FROM HistoryPurchase hp
      JOIN ListKamar lk ON hp.roomId = lk.id
      JOIN ListHotel lh ON lk.hotelId = lh.id
      JOIN DetailKamar dk ON lk.detailId = dk.id
      JOIN Customer c ON hp.customerId = c.id
      ${where}
      ORDER BY hp.purchaseDate DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM HistoryPurchase hp ${where}`,
      params
    );

    res.json({
      message: "Histori reservasi mitra berhasil diambil",
      data: reservations.map(r => ({
        id: r.id,
        purchaseDate: r.purchaseDate,
        checkinTime: r.checkinTime,
        checkoutTime: r.checkoutTime,
        amount: r.amount,
        status: r.status,
        roomNumber: r.roomNumber,
        hotelName: r.hotelName,
        roomType: r.typeRoom,
        capacity: r.capacity,
        hotelLocation: r.hotelLocation,
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
    const { status, customerId, mitraId, limit = 10, offset = 0 } = req.query;

    let where = "WHERE 1=1";
    const params = [];

    if (status) {
      where += " AND hp.status = ?";
      params.push(status.toUpperCase());
    }
    if (customerId) {
      where += " AND hp.customerId = ?";
      params.push(parseInt(customerId));
    }
    if (mitraId) {
      where += " AND hp.companyId = ?";
      params.push(parseInt(mitraId));
    }

    const [reservations] = await db.execute(
      `SELECT 
        hp.id, hp.purchaseDate, hp.checkinTime, hp.checkoutTime, hp.amount, hp.status,
        lk.roomNumber,
        lh.hotelName, lh.location AS hotelLocation,
        dk.typeRoom,
        c.name AS customerName, c.email AS customerEmail,
        cp.companyName AS mitraName, cp.email AS mitraEmail
      FROM HistoryPurchase hp
      JOIN ListKamar lk ON hp.roomId = lk.id
      JOIN ListHotel lh ON lk.hotelId = lh.id
      JOIN DetailKamar dk ON lk.detailId = dk.id
      JOIN Customer c ON hp.customerId = c.id
      JOIN CompanyProfile cp ON hp.companyId = cp.id
      ${where}
      ORDER BY hp.purchaseDate DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) as total FROM HistoryPurchase hp ${where}`,
      params
    );

    res.json({
      message: "Semua reservasi berhasil diambil",
      data: reservations.map(r => ({
        id: r.id,
        purchaseDate: r.purchaseDate,
        checkinTime: r.checkinTime,
        checkoutTime: r.checkoutTime,
        amount: r.amount,
        status: r.status,
        roomNumber: r.roomNumber,
        hotelName: r.hotelName,
        roomType: r.typeRoom,
        hotelLocation: r.hotelLocation,
        customerName: r.customerName,
        customerEmail: r.customerEmail,
        mitraName: r.mitraName,
        mitraEmail: r.mitraEmail
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

// CREATE kamar baru
export const createRoom = async (req, res) => {
  try {
    const { roomNumber, price, hotelId, detailId, status } = req.body;

    // Validasi input
    if (!roomNumber || roomNumber.trim() === "") {
      return res.status(400).json({ message: "Nomor kamar wajib diisi." });
    }
    if (!price || price <= 0) {
      return res.status(400).json({ message: "Harga kamar wajib diisi dan harus lebih dari 0." });
    }
    if (!hotelId) {
      return res.status(400).json({ message: "Hotel ID wajib diisi." });
    }
    if (!detailId) {
      return res.status(400).json({ message: "Detail ID wajib diisi." });
    }

    // Cek hotel ada atau tidak
    const [hotelRows] = await db.execute(
      `SELECT id FROM ListHotel WHERE id = ?`,
      [parseInt(hotelId)]
    );

    if (hotelRows.length === 0) {
      return res.status(404).json({ message: "Hotel tidak ditemukan." });
    }

    // Cek detail kamar ada atau tidak
    const [detailRows] = await db.execute(
      `SELECT id FROM DetailKamar WHERE id = ?`,
      [parseInt(detailId)]
    );

    if (detailRows.length === 0) {
      return res.status(404).json({ message: "Detail kamar tidak ditemukan." });
    }

    // Cek duplikasi nomor kamar di hotel yang sama
    const [existingRows] = await db.execute(
      `SELECT id FROM ListKamar WHERE roomNumber = ? AND hotelId = ?`,
      [roomNumber.trim(), parseInt(hotelId)]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({ message: "Nomor kamar sudah ada di hotel ini." });
    }

    // Create kamar baru
    const [result] = await db.execute(
      `INSERT INTO ListKamar (roomNumber, price, status, hotelId, detailId) VALUES (?, ?, ?, ?, ?)`,
      [roomNumber.trim(), parseFloat(price), status?.toUpperCase() || "AVAILABLE", parseInt(hotelId), parseInt(detailId)]
    );

    const newRoomId = result.insertId;

    const [roomRows] = await db.execute(
      `SELECT lk.id, lk.roomNumber, lk.price, lk.status,
        lh.hotelName,
        dk.typeRoom, dk.facility, dk.capacity
      FROM ListKamar lk
      JOIN ListHotel lh ON lk.hotelId = lh.id
      JOIN DetailKamar dk ON lk.detailId = dk.id
      WHERE lk.id = ?`,
      [newRoomId]
    );

    const room = roomRows[0];

    res.status(201).json({
      message: "Kamar berhasil ditambahkan",
      data: {
        id: room.id,
        roomNumber: room.roomNumber,
        price: room.price,
        status: room.status,
        hotelName: room.hotelName,
        roomType: room.typeRoom,
        facility: room.facility,
        capacity: room.capacity
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
