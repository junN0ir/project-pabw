import db from "../config/db.js";

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
