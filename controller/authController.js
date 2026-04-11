import pool from '../config/db.js';
import { successResponse, errorResponse } from "../models/apiResponse.js";

class AuthController {
    static async user_booking() {
        try {
            const [rows] = await pool.query('call sp_v_melihat_user()');

            let result = null;
            
            if (Array.isArray(rows)) {
                for (let i = 0; i < rows.length; i++) {
                    if (Array.isArray(rows[i]) && rows[i].length > 0) {
                        result = rows[i];
                        break;
                    }
                }
            } else {
                result = rows;
            }

            if (!result || result.length === 0) {
                console.log("⚠️Tidak ada data");
                return errorResponse({ message: "Tidak ada reservasi ditemukan" });
            }

            return successResponse({
                message: 'Reservasi ditemukan',
                data: result
            });
        } catch (error) {
            return errorResponse({ message: error.message });
        }
    }
    static async register({
        name,
        email,
        password,
        phone_number
    }) {
        try {
            const [rows] = await pool.query(
                'CALL sp_registrasi(?, ?, ?, ?)',
                [name, email, password, phone_number]
            );
            
            let result = null;
            
            // Procedure mengembalikan hasil dalam rows (array of arrays)
            if (Array.isArray(rows) && rows.length > 0) {
                // rows[0] adalah data customer yang baru dibuat
                result = rows[0];
            }
            
            if (!result || result.length === 0) {
                return errorResponse({ message: 'Gagal mendaftarkan user' });
            }
            
            return successResponse({
                message: 'User registered successfully',
                data: result[0]
            });
        } catch (error) {
            console.error('Register error:', error);
            return errorResponse({ message: error.message });
        }
    }
    static async tambah_kamar({
        id_list_hotel,
        id_detail_kamar,
        room_number,
        price,
        status = 'available'
    }) {
        try {
            // Validasi input
            if (!id_list_hotel || !id_detail_kamar || !room_number || !price) {
                return errorResponse({ 
                    message: 'Semua field wajib diisi (id_list_hotel, id_detail_kamar, room_number, price)',
                    statusCode: 400
                });
            }

            const [rows] = await pool.query(
                'CALL sp_tambah_kamar(?, ?, ?, ?, ?)',
                [id_list_hotel, id_detail_kamar, room_number, price, status]
            );

            // Parse hasil dari stored procedure
            let result = null;
            if (Array.isArray(rows) && rows.length > 0) {
                result = rows[0][0];
            }

            if (!result) {
                return errorResponse({ 
                    message: 'Gagal menambahkan kamar',
                    statusCode: 400
                });
            }

            // Cek status dari procedure
            if (result.status === 'ERROR') {
                return errorResponse({ 
                    message: result.message,
                    statusCode: 400
                });
            }
            
            return successResponse({
                message: result.message,
                data: {
                    id_list_kamar: result.id_list_kamar,
                    room_number: result.room_number
                }
            });
        } catch (error) {
            console.error("AuthController.tambah_kamar error:", error);
            return errorResponse({ 
                message: error.message,
                statusCode: 500
            });
        }
    }
    static async login({ identifier, password }) {
        try {
            // Validasi input
            if (!identifier || !password) {
                return errorResponse({ 
                    message: 'Username/Email dan Password wajib diisi',
                    statusCode: 400
                });
            }

            const [rows] = await pool.query(
                'CALL sp_login(?, ?)',
                [identifier, password]
            );

            // Parse hasil dari stored procedure
            let result = null;
            if (Array.isArray(rows)) {
                for (let i = 0; i < rows.length; i++) {
                    if (Array.isArray(rows[i]) && rows[i].length > 0) {
                        result = rows[i][0];
                        break;
                    }
                }
            } else {
                result = rows[0];
            }

            if (!result) {
                return errorResponse({ 
                    message: 'Email atau Username tidak terdaftar',
                    statusCode: 401
                });
            }

            // Response berbeda untuk admin, mitra, dan customer
            if (result.user_type === 'admin') {
                return successResponse({
                    message: 'Login berhasil',
                    data: {
                        id: result.id,
                        nama: result.nama,
                        email: result.email,
                        phone: result.nomor_telepon,
                        userType: result.user_type
                    }
                });
            } else if (result.user_type === 'mitra') {
                return successResponse({
                    message: 'Login berhasil',
                    data: {
                        id: result.id,
                        nama: result.nama,
                        username: result.username,
                        email: result.email,
                        alamat: result.alamat,
                        phone: result.nomor_telepon,
                        userType: result.user_type
                    }
                });
            } else {
                return successResponse({
                    message: 'Login berhasil',
                    data: {
                        id: result.id,
                        nama: result.nama,
                        email: result.email,
                        phone: result.nomor_telepon,
                        userType: result.user_type
                    }
                });
            }
        } catch (error) {
            console.error("AuthController.login error:", error);
            
            // Parse error message dari database
            if (error.message.includes('Password salah')) {
                return errorResponse({ 
                    message: 'Password salah',
                    statusCode: 401
                });
            }
            if (error.message.includes('tidak terdaftar')) {
                return errorResponse({ 
                    message: 'Email atau Username tidak terdaftar',
                    statusCode: 401
                });
            }

            return errorResponse({ 
                message: error.message,
                statusCode: 500
            });
        }
    }
    static async logout({ id_user }) {
        try {
            // Validasi input
            if (!id_user) {
                return errorResponse({ 
                    message: 'ID user wajib diisi',
                    statusCode: 400
                });
            }

            const [rows] = await pool.query(
                'CALL sp_logout_user(?)',
                [id_user]
            );

            // Parse hasil dari stored procedure
            let result = null;
            if (Array.isArray(rows)) {
                for (let i = 0; i < rows.length; i++) {
                    if (Array.isArray(rows[i]) && rows[i].length > 0) {
                        result = rows[i][0];
                        break;
                    }
                }
            } else {
                result = rows[0];
            }

            if (!result) {
                return errorResponse({ 
                    message: 'Gagal logout',
                    statusCode: 400
                });
            }

            // Cek status dari procedure
            if (result.status === 'USER_NOT_FOUND') {
                return errorResponse({ 
                    message: 'User tidak ditemukan',
                    statusCode: 404
                });
            }

            if (result.status === 'NO_ACTIVE_SESSION') {
                return errorResponse({ 
                    message: 'Tidak ada sesi aktif untuk logout',
                    statusCode: 400
                });
            }

            if (result.status === 'OK') {
                return successResponse({
                    message: 'Logout berhasil'
                });
            }

            return errorResponse({ 
                message: result.message || 'Gagal logout',
                statusCode: 400
            });
        } catch (error) {
            console.error("AuthController.logout error:", error);
            return errorResponse({ 
                message: error.message,
                statusCode: 500
            });
        }
    }
    static async get_hotel() {
        try {
            const [rows] = await pool.query('CALL sp_v_list_hotel()');
            return successResponse({
                message: 'Data hotel berhasil diambil',
                data: rows
            });
        } catch (error) {
            console.error("AuthController.get_hotel error:", error);
            return errorResponse({ 
                message: error.message,
                statusCode: 500
            });
        }
    }

    // VIEW SESSION LOGIN - CUSTOMER ONLY
    static async get_all_active_customer_sessions() {
        try {
            const [rows] = await pool.query(
                'CALL sp_get_all_active_customer_sessions()'
            );

            let result = null;
            if (Array.isArray(rows)) {
                for (let i = 0; i < rows.length; i++) {
                    if (Array.isArray(rows[i]) && rows[i].length > 0) {
                        result = rows[i];
                        break;
                    }
                }
            }

            if (!result || result.length === 0) {
                return errorResponse({ 
                    message: 'Tidak ada session customer aktif',
                    statusCode: 404
                });
            }

            return successResponse({
                message: 'Data session customer aktif berhasil diambil',
                data: result,
                total: result.length
            });
        } catch (error) {
            console.error("AuthController.get_all_active_customer_sessions error:", error);
            return errorResponse({ 
                message: error.message,
                statusCode: 500
            });
        }
    }

    static async get_customer_session({ id_customer }) {
        try {
            if (!id_customer) {
                return errorResponse({ 
                    message: 'ID customer wajib diisi',
                    statusCode: 400
                });
            }

            const [rows] = await pool.query(
                'CALL sp_get_customer_session(?)',
                [id_customer]
            );

            let result = null;
            if (Array.isArray(rows)) {
                for (let i = 0; i < rows.length; i++) {
                    if (Array.isArray(rows[i]) && rows[i].length > 0) {
                        result = rows[i];
                        break;
                    }
                }
            }

            if (!result || result.length === 0) {
                return errorResponse({ 
                    message: 'Session customer tidak ditemukan',
                    statusCode: 404
                });
            }

            return successResponse({
                message: 'Data session customer berhasil diambil',
                data: result,
                total: result.length
            });
        } catch (error) {
            console.error("AuthController.get_customer_session error:", error);
            return errorResponse({ 
                message: error.message,
                statusCode: 500
            });
        }
    }

    static async get_all_customer_sessions() {
        try {
            const [rows] = await pool.query(
                'CALL sp_get_all_customer_sessions()'
            );

            let result = null;
            if (Array.isArray(rows)) {
                for (let i = 0; i < rows.length; i++) {
                    if (Array.isArray(rows[i]) && rows[i].length > 0) {
                        result = rows[i];
                        break;
                    }
                }
            }

            if (!result || result.length === 0) {
                return errorResponse({ 
                    message: 'Tidak ada session customer ditemukan',
                    statusCode: 404
                });
            }

            return successResponse({
                message: 'Semua data session customer berhasil diambil',
                data: result,
                total: result.length
            });
        } catch (error) {
            console.error("AuthController.get_all_customer_sessions error:", error);
            return errorResponse({ 
                message: error.message,
                statusCode: 500
            });
        }
    }
}

export default AuthController;