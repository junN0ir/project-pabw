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
                console.log("⚠️  Tidak ada data");
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
}

export default AuthController;