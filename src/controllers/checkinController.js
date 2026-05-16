import pool from '../config/db.js';
import { successResponse, errorResponse } from "../models/apiResponse.js";

class CheckinController {
    // Proses checkin
    static async performCheckin({
        id_history,
        id_customer,
        id_list_hotel,
        reservation_number,
        checkin_time
    }) {
        try {
            // Validasi input
            if (!id_history || !id_customer || !id_list_hotel) {
                return errorResponse({
                    message: "id_history, id_customer, dan id_list_hotel tidak boleh kosong"
                });
            }

            // Step 1: Cek apakah reservasi ada dan statusnya valid
            const [reservation] = await pool.query(
                `SELECT * FROM history_purchase 
                 WHERE id_history = ? AND id_customer = ? AND status = 'confirmed'`,
                [id_history, id_customer]
            );

            if (reservation.length === 0) {
                return errorResponse({
                    message: "Reservasi tidak ditemukan atau sudah dibatalkan"
                });
            }

            // Step 2: Validasi waktu checkin dengan schedule
            const bookedCheckinTime = new Date(reservation[0].checkin_time);
            const currentTime = new Date(checkin_time || Date.now());

            if (currentTime < bookedCheckinTime) {
                return errorResponse({
                    message: "Waktu checkin lebih awal dari jadwal"
                });
            }

            // Step 3: Update status kamar menjadi not available (sedang dipakai)
            const [updateRoom] = await pool.query(
                `UPDATE list_kamar SET status = 'not available' WHERE id_list_kamar = ?`,
                [reservation[0].id_list_kamar]
            );

            if (updateRoom.affectedRows === 0) {
                return errorResponse({
                    message: "Gagal mengupdate status kamar"
                });
            }

            // Step 4: Simpan waktu checkin actual ke history dengan format MySQL datetime
            const actualCheckinDate = new Date(checkin_time || Date.now());
            const actualCheckinTime = actualCheckinDate.toISOString().slice(0, 19).replace('T', ' ');
            
            const [updateCheckin] = await pool.query(
                `UPDATE history_purchase 
                 SET checkin_time = ? 
                 WHERE id_history = ?`,
                [actualCheckinTime, id_history]
            );

            if (updateCheckin.affectedRows === 0) {
                return errorResponse({
                    message: "Gagal menyimpan data checkin"
                });
            }

            // Step 5: Ambil data checkin untuk konfirmasi
            const [checkinData] = await pool.query(
                `SELECT hp.*, lh.hotel_name, lh.location
                 FROM history_purchase hp
                 JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
                 JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
                 WHERE hp.id_history = ?`,
                [id_history]
            );

            return successResponse({
                message: 'Checkin berhasil dilakukan',
                data: {
                    id_history: id_history,
                    customer_id: id_customer,
                    checkin_status: 'success',
                    checkin_time: actualCheckinTime,
                    hotel_info: checkinData[0],
                    notification: `Selamat datang di ${checkinData[0]?.hotel_name}. Kamar Anda siap untuk digunakan.`
                }
            });
        } catch (error) {
            console.error("Error:", error.message);
            return errorResponse({
                message: error.message
            });
        }
    }

    // Mendapatkan detail reservasi untuk checkin
    static async getReservationForCheckin(id_customer, reservation_number) {
        try {
            if (!id_customer) {
                return errorResponse({
                    message: "id_customer tidak boleh kosong"
                });
            }

            let query = `
                SELECT hp.*, lh.hotel_name, lh.location
                FROM history_purchase hp
                JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
                JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
                WHERE hp.id_customer = ? AND hp.status = 'confirmed'
            `;

            let params = [id_customer];

            // Jika reservation number diberikan, tambahkan ke filter
            if (reservation_number) {
                query += ` AND hp.id_history = ?`;
                params.push(reservation_number);
            }

            const [reservations] = await pool.query(query, params);

            if (reservations.length === 0) {
                return errorResponse({
                    message: "Tidak ada reservasi ditemukan"
                });
            }

            return successResponse({
                message: 'Reservasi ditemukan',
                data: reservations
            });
        } catch (error) {
            console.error("Error:", error.message);
            return errorResponse({
                message: error.message
            });
        }
    }

    // Mendapatkan checkin history
    static async getCheckinHistory(id_customer) {
        try {
            if (!id_customer) {
                return errorResponse({
                    message: "id_customer tidak boleh kosong"
                });
            }

            const [history] = await pool.query(
                `SELECT hp.*, lh.hotel_name, lh.location
                 FROM history_purchase hp
                 JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
                 JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
                 WHERE hp.id_customer = ?
                 ORDER BY hp.checkin_time DESC`,
                [id_customer]
            );

            if (history.length === 0) {
                return errorResponse({
                    message: "Tidak ada riwayat checkin ditemukan"
                });
            }

            return successResponse({
                message: 'Riwayat checkin ditemukan',
                data: history
            });
        } catch (error) {
            console.error("Error:", error.message);
            return errorResponse({
                message: error.message
            });
        }
    }
}

export { CheckinController as default };
