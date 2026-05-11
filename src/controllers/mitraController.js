import db from "../config/db.js";
import { logActivity } from "../services/activityService.js";

// UC14 - Mengubah Deskripsi Hotel
export const updateHotelDescription = async (req, res) => {
  try {
    const { id_list_hotel } = req.params;
    const { id_company_profile, hotel_name, location, contact_person, contact_email, contact_phone } = req.body;

    if (!id_company_profile) {
      return res.status(400).json({ message: "ID Company Profile wajib diisi." });
    }

    // Cek hotel ada
    const [hotelRows] = await db.query(
      `SELECT id_list_hotel, id_company_profile, hotel_name, location, contact_person, contact_email, contact_phone
       FROM list_hotel WHERE id_list_hotel = ?`,
      [parseInt(id_list_hotel)]
    );

    if (hotelRows.length === 0) {
      return res.status(404).json({ message: "Hotel tidak ditemukan." });
    }

    // Cek hotel milik mitra ini
    if (hotelRows[0].id_company_profile !== parseInt(id_company_profile)) {
      return res.status(403).json({ message: "Anda tidak memiliki akses untuk mengubah hotel ini." });
    }

    if (!hotel_name && !location && !contact_person && !contact_email && !contact_phone) {
      return res.status(400).json({ message: "Minimal satu field harus diisi untuk diperbarui." });
    }

    const hotel = hotelRows[0];
    const newHotelName     = hotel_name      ? hotel_name.trim()      : hotel.hotel_name;
    const newLocation      = location        ? location.trim()        : hotel.location;
    const newContactPerson = contact_person  ? contact_person.trim()  : hotel.contact_person;
    const newContactEmail  = contact_email   ? contact_email.trim()   : hotel.contact_email;
    const newContactPhone  = contact_phone   ? contact_phone.trim()   : hotel.contact_phone;

    await db.query(
      `UPDATE list_hotel
       SET hotel_name = ?, location = ?, contact_person = ?, contact_email = ?, contact_phone = ?
       WHERE id_list_hotel = ?`,
      [newHotelName, newLocation, newContactPerson, newContactEmail, newContactPhone, parseInt(id_list_hotel)]
    );

    const [updated] = await db.query(
      `SELECT lh.id_list_hotel, lh.hotel_name, lh.location, lh.contact_person, lh.contact_email, lh.contact_phone,
              cp.company_name
       FROM list_hotel lh
       JOIN company_profile cp ON lh.id_company_profile = cp.id_company_profile
       WHERE lh.id_list_hotel = ?`,
      [parseInt(id_list_hotel)]
    );

    await logActivity({
      userId: parseInt(id_company_profile),
      userType: "MITRA",
      activityType: "UPDATE_HOTEL_DESCRIPTION",
      details: { id_list_hotel: parseInt(id_list_hotel), hotel_name: newHotelName }
    });

    res.json({
      message: "Deskripsi hotel berhasil diperbarui",
      data: updated[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC15 - Mengubah Kategori Kamar
export const updateRoomCategory = async (req, res) => {
  try {
    const { id_detail_kamar } = req.params;
    const { id_company_profile, type_room, description, facility, capacity } = req.body;

    if (!id_company_profile) {
      return res.status(400).json({ message: "ID Company Profile wajib diisi." });
    }

    // Cek detail_kamar ada
    const [detailRows] = await db.query(
      `SELECT id_detail_kamar, type_room, description, facility, capacity
       FROM detail_kamar WHERE id_detail_kamar = ?`,
      [parseInt(id_detail_kamar)]
    );

    if (detailRows.length === 0) {
      return res.status(404).json({ message: "Kategori kamar tidak ditemukan." });
    }

    // Cek kategori kamar ini dipakai oleh hotel milik mitra
    const [ownerCheck] = await db.query(
      `SELECT DISTINCT lh.id_company_profile
       FROM list_kamar lk
       JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
       WHERE lk.id_detail_kamar = ? AND lh.id_company_profile = ?`,
      [parseInt(id_detail_kamar), parseInt(id_company_profile)]
    );

    if (ownerCheck.length === 0) {
      return res.status(403).json({ message: "Anda tidak memiliki akses untuk mengubah kategori kamar ini." });
    }

    if (!type_room && !description && !facility && capacity === undefined) {
      return res.status(400).json({ message: "Minimal satu field harus diisi untuk diperbarui." });
    }

    if (capacity !== undefined && (isNaN(parseInt(capacity)) || parseInt(capacity) <= 0)) {
      return res.status(400).json({ message: "Kapasitas harus berupa angka positif." });
    }

    const detail = detailRows[0];
    const newTypeRoom    = type_room    ? type_room.trim()   : detail.type_room;
    const newDescription = description ? description.trim() : detail.description;
    const newFacility    = facility     ? facility.trim()    : detail.facility;
    const newCapacity    = capacity !== undefined ? parseInt(capacity) : detail.capacity;

    await db.query(
      `UPDATE detail_kamar
       SET type_room = ?, description = ?, facility = ?, capacity = ?
       WHERE id_detail_kamar = ?`,
      [newTypeRoom, newDescription, newFacility, newCapacity, parseInt(id_detail_kamar)]
    );

    const [updated] = await db.query(
      `SELECT id_detail_kamar, type_room, description, facility, capacity
       FROM detail_kamar WHERE id_detail_kamar = ?`,
      [parseInt(id_detail_kamar)]
    );

    await logActivity({
      userId: parseInt(id_company_profile),
      userType: "MITRA",
      activityType: "UPDATE_ROOM_CATEGORY",
      details: { id_detail_kamar: parseInt(id_detail_kamar), type_room: newTypeRoom }
    });

    res.json({
      message: "Kategori kamar berhasil diperbarui",
      data: updated[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC16 - Mengubah Status Kamar
export const updateRoomStatus = async (req, res) => {
  try {
    const { id_list_kamar } = req.params;
    const { id_company_profile, status } = req.body;

    if (!id_company_profile) {
      return res.status(400).json({ message: "ID Company Profile wajib diisi." });
    }

    if (!status || status.trim() === "") {
      return res.status(400).json({ message: "Status kamar wajib diisi." });
    }

    const validStatuses = ["available", "not available"];
    const normalizedStatus = status.toLowerCase().trim();

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ message: "Status tidak valid. Gunakan: available atau not available." });
    }

    // Cek kamar ada
    const [roomRows] = await db.query(
      `SELECT lk.id_list_kamar, lk.room_number, lk.status, lk.price,
              lh.id_company_profile, lh.hotel_name,
              dk.type_room
       FROM list_kamar lk
       JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
       JOIN detail_kamar dk ON lk.id_detail_kamar = dk.id_detail_kamar
       WHERE lk.id_list_kamar = ?`,
      [parseInt(id_list_kamar)]
    );

    if (roomRows.length === 0) {
      return res.status(404).json({ message: "Kamar tidak ditemukan." });
    }

    const room = roomRows[0];

    // Cek kamar milik mitra ini
    if (room.id_company_profile !== parseInt(id_company_profile)) {
      return res.status(403).json({ message: "Anda tidak memiliki akses untuk mengubah status kamar ini." });
    }

    if (room.status === normalizedStatus) {
      return res.status(400).json({ message: `Status kamar sudah '${normalizedStatus}', tidak ada perubahan.` });
    }

    await db.query(
      `UPDATE list_kamar SET status = ? WHERE id_list_kamar = ?`,
      [normalizedStatus, parseInt(id_list_kamar)]
    );

    await logActivity({
      userId: parseInt(id_company_profile),
      userType: "MITRA",
      activityType: "UPDATE_ROOM_STATUS",
      details: {
        id_list_kamar: parseInt(id_list_kamar),
        room_number: room.room_number,
        old_status: room.status,
        new_status: normalizedStatus
      }
    });

    res.json({
      message: "Status kamar berhasil diperbarui",
      data: {
        id_list_kamar: parseInt(id_list_kamar),
        room_number: room.room_number,
        hotel_name: room.hotel_name,
        type_room: room.type_room,
        price: room.price,
        old_status: room.status,
        new_status: normalizedStatus
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};