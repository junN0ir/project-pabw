import db from "../config/db.js";

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
