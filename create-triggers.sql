-- ===============================================
-- TABEL ACTIVITY LOG (untuk menyimpan log aktifitas)
-- ===============================================
DROP TABLE IF EXISTS `activity_log`;
CREATE TABLE `activity_log` (
    id_activity_log INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT,
    user_type VARCHAR(20),           -- 'customer' atau 'mitra'
    activity_type VARCHAR(50),       -- login, registrasi, tambah_kamar, etc
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (id_user),
    INDEX idx_activity (activity_type),
    INDEX idx_created (created_at)
);

-- ===============================================
-- TRIGGER LOGIN
-- ===============================================
DROP TRIGGER IF EXISTS trg_after_login;
DELIMITER $$

CREATE TRIGGER trg_after_login
AFTER INSERT ON `customer` -- atau sesuaikan dengan event yang ingin dicatatan
FOR EACH ROW
BEGIN
    INSERT INTO `activity_log` (
        id_user,
        user_type,
        activity_type,
        details,
        created_at
    ) VALUES (
        NEW.id_customer,
        'customer',
        'login',
        JSON_OBJECT(
            'email', NEW.email,
            'nama', NEW.name
        ),
        NOW()
    );
END$$

DELIMITER ;

-- ===============================================
-- TRIGGER REGISTRASI CUSTOMER
-- ===============================================
DROP TRIGGER IF EXISTS trg_after_registrasi_customer;
DELIMITER $$

CREATE TRIGGER trg_after_registrasi_customer
AFTER INSERT ON `customer`
FOR EACH ROW
BEGIN
    INSERT INTO `activity_log` (
        id_user,
        user_type,
        activity_type,
        details,
        created_at
    ) VALUES (
        NEW.id_customer,
        'customer',
        'registrasi',
        JSON_OBJECT(
            'email', NEW.email,
            'nama_lengkap', NEW.name,
            'nomor_telepon', NEW.phone_number
        ),
        NOW()
    );
END$$

DELIMITER ;

-- ===============================================
-- TRIGGER REGISTRASI MITRA
-- ===============================================
DROP TRIGGER IF EXISTS trg_after_registrasi_mitra;
DELIMITER $$

CREATE TRIGGER trg_after_registrasi_mitra
AFTER INSERT ON `company_profile`
FOR EACH ROW
BEGIN
    INSERT INTO `activity_log` (
        id_user,
        user_type,
        activity_type,
        details,
        created_at
    ) VALUES (
        NEW.id_company_profile,
        'mitra',
        'registrasi',
        JSON_OBJECT(
            'email', NEW.email,
            'nama_perusahaan', NEW.company_name,
            'nomor_telepon', NEW.phone_number
        ),
        NOW()
    );
END$$

DELIMITER ;

-- ===============================================
-- TRIGGER TAMBAH KAMAR
-- ===============================================
DROP TRIGGER IF EXISTS trg_after_tambah_kamar;
DELIMITER $$

CREATE TRIGGER trg_after_tambah_kamar
AFTER INSERT ON `room` -- Sesuaikan nama tabel dengan database Anda
FOR EACH ROW
BEGIN
    INSERT INTO `activity_log` (
        id_user,
        user_type,
        activity_type,
        details,
        created_at
    ) VALUES (
        NEW.id_company_profile, -- Sesuaikan kolom foreign key yang mereferensi company_profile
        'mitra',
        'tambah_kamar',
        JSON_OBJECT(
            'nama_kamar', NEW.nama_kamar,
            'harga_per_malam', NEW.harga_per_malam,
            'kapasitas', NEW.kapasitas,
            'tipe_kamar', NEW.tipe_kamar
        ),
        NOW()
    );
END$$

DELIMITER ;

-- ===============================================
-- TRIGGER UPDATE KAMAR
-- ===============================================
DROP TRIGGER IF EXISTS trg_after_update_kamar;
DELIMITER $$

CREATE TRIGGER trg_after_update_kamar
AFTER UPDATE ON `room`
FOR EACH ROW
BEGIN
    INSERT INTO `activity_log` (
        id_user,
        user_type,
        activity_type,
        details,
        created_at
    ) VALUES (
        NEW.id_company_profile,
        'mitra',
        'update_kamar',
        JSON_OBJECT(
            'kamar_id', NEW.id_room,
            'nama_kamar', NEW.nama_kamar,
            'harga_lama', OLD.harga_per_malam,
            'harga_baru', NEW.harga_per_malam,
            'kapasitas', NEW.kapasitas
        ),
        NOW()
    );
END$$

DELIMITER ;

-- ===============================================
-- TRIGGER DELETE KAMAR
-- ===============================================
DROP TRIGGER IF EXISTS trg_after_delete_kamar;
DELIMITER $$

CREATE TRIGGER trg_after_delete_kamar
AFTER DELETE ON `room`
FOR EACH ROW
BEGIN
    INSERT INTO `activity_log` (
        id_user,
        user_type,
        activity_type,
        details,
        created_at
    ) VALUES (
        OLD.id_company_profile,
        'mitra',
        'delete_kamar',
        JSON_OBJECT(
            'kamar_id', OLD.id_room,
            'nama_kamar', OLD.nama_kamar,
            'harga_per_malam', OLD.harga_per_malam
        ),
        NOW()
    );
END$$

DELIMITER ;

-- ===============================================
-- VIEW untuk melihat activity log dengan lebih mudah
-- ===============================================
DROP VIEW IF EXISTS vw_activity_log;
CREATE VIEW vw_activity_log AS
SELECT
    al.id_activity_log,
    al.id_user,
    al.user_type,
    al.activity_type,
    al.details,
    al.created_at,
    DATE_FORMAT(al.created_at, '%d-%m-%Y %H:%i:%s') AS waktu_activity
FROM `activity_log` al
ORDER BY al.created_at DESC;
