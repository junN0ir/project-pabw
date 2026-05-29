import db from "../config/db.js";

// UC9 Memberikan Rating ke Hotel
export const createHotelRating = async (req, res) => {
  try {
    const { id_user, id_list_hotel, id_history, rating, review } = req.body;

    if (!id_user || !id_list_hotel || !id_history || rating === undefined) {
      return res.status(400).json({
        message: "id_user, id_list_hotel, id_history, dan rating wajib diisi."
      });
    }

    const ratingValue = parseInt(rating);

    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ message: "Rating harus berupa angka 1 sampai 5." });
    }

    const [reservationRows] = await db.query(
      `SELECT
        hp.id_history,
        hp.id_user,
        hp.status,
        lh.id_list_hotel,
        lh.hotel_name
      FROM history_purchase hp
      JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
      JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
      WHERE hp.id_history = ?
        AND hp.id_user = ?
        AND lh.id_list_hotel = ?
        AND hp.status <> 'cancelled'`,
      [parseInt(id_history), parseInt(id_user), parseInt(id_list_hotel)]
    );

    if (reservationRows.length === 0) {
      return res.status(403).json({
        message: "Rating hanya bisa diberikan oleh customer yang memiliki reservasi valid pada hotel tersebut."
      });
    }

    await db.query(
      `INSERT INTO hotel_rating (id_user, id_list_hotel, id_history, rating, review)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review), updated_at = NOW()`,
      [
        parseInt(id_user),
        parseInt(id_list_hotel),
        parseInt(id_history),
        ratingValue,
        review ? review.trim() : null
      ]
    );

    const [ratingRows] = await db.query(
      `SELECT
        hr.id_rating,
        hr.id_user,
        u.name AS customer_name,
        hr.id_list_hotel,
        lh.hotel_name,
        hr.id_history,
        hr.rating,
        hr.review,
        hr.created_at,
        hr.updated_at
      FROM hotel_rating hr
      JOIN user u ON hr.id_user = u.id_user
      JOIN list_hotel lh ON hr.id_list_hotel = lh.id_list_hotel
      WHERE hr.id_history = ?`,
      [parseInt(id_history)]
    );

    res.status(201).json({
      message: "Rating hotel berhasil disimpan",
      data: ratingRows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tambahan untuk melihat rating hotel
export const getHotelRatings = async (req, res) => {
  try {
    const { id_list_hotel } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    if (!id_list_hotel) {
      return res.status(400).json({ message: "ID hotel wajib diisi." });
    }

    const limitVal = parseInt(limit);
    const offsetVal = parseInt(offset);

    const [[summary]] = await db.query(
      `SELECT
        COUNT(*) AS total_rating,
        COALESCE(AVG(rating), 0) AS rata_rata_rating
      FROM hotel_rating
      WHERE id_list_hotel = ?`,
      [parseInt(id_list_hotel)]
    );

    const [ratings] = await db.query(
      `SELECT
        hr.id_rating,
        hr.rating,
        hr.review,
        hr.created_at,
        hr.updated_at,
        u.name AS customer_name
      FROM hotel_rating hr
      JOIN user u ON hr.id_user = u.id_user
      WHERE hr.id_list_hotel = ?
      ORDER BY hr.created_at DESC
      LIMIT ? OFFSET ?`,
      [parseInt(id_list_hotel), limitVal, offsetVal]
    );

    res.json({
      message: "Rating hotel berhasil diambil",
      data: {
        summary: {
          total_rating: summary.total_rating,
          rata_rata_rating: parseFloat(summary.rata_rata_rating)
        },
        ratings
      },
      pagination: {
        limit: limitVal,
        offset: offsetVal
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};