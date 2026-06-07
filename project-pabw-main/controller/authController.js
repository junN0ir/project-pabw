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
        nama_lengkap, 
        nomor_telepon, 
        alamat, 
        email, 
        password
    }) {
        try {
            const [rows] = await pool.query(
                'Call sp_registrasi(?, ?, ?, ?, ?)',
                [nama_lengkap, nomor_telepon, alamat, email, password]
            ); 
            let result = null;
            if (Array.isArray(result)) {
                for (let i = 0; i < result.length; i++) {
                    if (Array.isArray(rows[i]) && rows[i].length > 0) {
                        result = rows[i][0];
                        break;
                    }
                }
            } else {
                result = rows;
            }
            return successResponse({
                message: 'User registered successfully',
                data: result[0]
            });
        } catch (error) {
            console.error(error);
            return errorResponse({ message: error.message });
        }
    }
    static async tambah_kamar({
        id_kategori,
        nomor_kamar,
        lantai,
        harga_per_malam
    }) {
        try {
            const [rows] = await pool.query(
                'CALL sp_tambah_kamar(?, ?, ?, ?)',
                [id_kategori, nomor_kamar, lantai, harga_per_malam]
            );

            // rows[0] = hasil SELECT dari stored procedure
            const result = rows[0][0];

            if (result.status === 'ERROR') {
                return errorResponse({ 
                    message: result.message,
                    statusCode: 400   // error bisnis/validasi
                });
            }
            
            return successResponse({
                message: result.message,
                data: {
                    id_kamar: result.id_kamar,
                    nomor_kamar: result.nomor_kamar
                }
            });
        } catch (error) {
            console.error("AuthController.tambah_kamar error:", error);
            return errorResponse({ 
                message: 'Terjadi kesalahan pada server',
                statusCode: 500
            });
        }
    }
}

export default AuthController;