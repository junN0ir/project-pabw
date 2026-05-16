import pool from '../config/db.js';
import { successResponse, errorResponse } from "../models/apiResponse.js";

class CheckoutController {
    // Proses checkout
    static async performCheckout({
        id_history,
        id_customer,
        checkout_time,
        additional_charges
    }) {
        try {
            // Validasi input
            if (!id_history || !id_customer) {
                return errorResponse({
                    message: "id_history dan id_customer tidak boleh kosong"
                });
            }

            // Step 1: Ambil data reservasi yang aktif
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

            // Step 2: Hitung biaya menginap dan validasi
            const checkinTime = new Date(reservation[0].checkin_time);
            const scheduledCheckoutTime = new Date(reservation[0].checkout_time);
            const actualCheckoutTime = new Date(checkout_time || Date.now());

            // Hitung durasi menginap
            const durationMs = actualCheckoutTime - checkinTime;
            const durationHours = durationMs / (1000 * 60 * 60);
            const durationDays = Math.ceil(durationHours / 24);

            // Hitung biaya tambahan jika checkout melewati jadwal
            let additionalCost = 0;
            let isLateCheckout = false;

            if (actualCheckoutTime > scheduledCheckoutTime) {
                isLateCheckout = true;
                const lateHours = Math.ceil((actualCheckoutTime - scheduledCheckoutTime) / (1000 * 60 * 60));
                // Asumsi late checkout fee Rp 100.000 per jam
                additionalCost = lateHours * 100000;
            }

            // Tambahkan biaya tambahan jika ada (damage, service, dll)
            if (additional_charges) {
                additionalCost += additional_charges;
            }

            // Step 3: Validasi checkout dan hitung total (convert ke number)
            const baseAmount = parseFloat(reservation[0].amount);
            const totalAmount = baseAmount + additionalCost;

            // Step 4: Update status kamar menjadi available
            const [updateRoom] = await pool.query(
                `UPDATE list_kamar SET status = 'available' WHERE id_list_kamar = ?`,
                [reservation[0].id_list_kamar]
            );

            if (updateRoom.affectedRows === 0) {
                return errorResponse({
                    message: "Gagal mengupdate status kamar"
                });
            }

            // Step 5: Catat waktu checkout actual di history dengan format MySQL datetime
            const actualCheckoutDate = new Date(checkout_time || Date.now());
            const actualCheckoutTimeISO = actualCheckoutDate.toISOString().slice(0, 19).replace('T', ' ');
            
            const [updateCheckout] = await pool.query(
                `UPDATE history_purchase 
                 SET checkout_time = ?, amount = ?
                 WHERE id_history = ?`,
                [actualCheckoutTimeISO, totalAmount, id_history]
            );

            if (updateCheckout.affectedRows === 0) {
                return errorResponse({
                    message: "Gagal menyimpan data checkout"
                });
            }

            // Step 6: Ambil data checkout final untuk konfirmasi
            const [checkoutData] = await pool.query(
                `SELECT hp.*, lh.hotel_name, lh.location
                 FROM history_purchase hp
                 JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
                 JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
                 WHERE hp.id_history = ?`,
                [id_history]
            );

            return successResponse({
                message: 'Checkout berhasil dilakukan',
                data: {
                    id_history: id_history,
                    customer_id: id_customer,
                    checkout_status: 'success',
                    checkout_time: actualCheckoutTimeISO,
                    duration_days: durationDays,
                    is_late_checkout: isLateCheckout,
                    billing: {
                        base_amount: baseAmount,
                        additional_charges: additionalCost,
                        total_amount: totalAmount,
                        late_checkout_fee: isLateCheckout ? additionalCost : 0,
                        other_charges: (additional_charges || 0)
                    },
                    hotel_info: checkoutData[0],
                    notification: `Terima kasih telah menginap di ${checkoutData[0]?.hotel_name}. Total pembayaran Rp ${totalAmount.toLocaleString('id-ID')}`
                }
            });
        } catch (error) {
            console.error("Error:", error.message);
            return errorResponse({
                message: error.message
            });
        }
    }

    // Mendapatkan detail masa menginap sebelum checkout
    static async getCheckoutDetails(id_history, id_customer) {
        try {
            if (!id_history || !id_customer) {
                return errorResponse({
                    message: "id_history dan id_customer tidak boleh kosong"
                });
            }

            const [reservation] = await pool.query(
                `SELECT hp.*, lh.hotel_name, lh.location
                 FROM history_purchase hp
                 JOIN list_kamar lk ON hp.id_list_kamar = lk.id_list_kamar
                 JOIN list_hotel lh ON lk.id_list_hotel = lh.id_list_hotel
                 WHERE hp.id_history = ? AND hp.id_customer = ?`,
                [id_history, id_customer]
            );

            if (reservation.length === 0) {
                return errorResponse({
                    message: "Data reservasi tidak ditemukan"
                });
            }

            // Hitung durasi menginap
            const checkinTime = new Date(reservation[0].checkin_time);
            const checkoutTime = new Date(reservation[0].checkout_time);
            const durationMs = checkoutTime - checkinTime;
            const durationHours = durationMs / (1000 * 60 * 60);
            const durationDays = Math.ceil(durationHours / 24);

            return successResponse({
                message: 'Detail checkout ditemukan',
                data: {
                    ...reservation[0],
                    duration: {
                        hours: durationHours.toFixed(2),
                        days: durationDays
                    },
                    billing_info: {
                        base_amount: reservation[0].amount,
                        late_checkout_fee: 'Akan dihitung saat checkout'
                    }
                }
            });
        } catch (error) {
            console.error("Error:", error.message);
            return errorResponse({
                message: error.message
            });
        }
    }

    // Mendapatkan checkout history
    static async getCheckoutHistory(id_customer) {
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
                 WHERE hp.id_customer = ? AND hp.status = 'confirmed'
                 ORDER BY hp.checkout_time DESC`,
                [id_customer]
            );

            if (history.length === 0) {
                return errorResponse({
                    message: "Tidak ada riwayat checkout ditemukan"
                });
            }

            return successResponse({
                message: 'Riwayat checkout ditemukan',
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

export { CheckoutController as default };
