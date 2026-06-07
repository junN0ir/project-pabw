DROP PROCEDURE IF EXISTS sp_login;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_login`(
    IN  p_identifier VARCHAR(255),  -- Email (customer) atau ID Company Profile (mitra)
    IN  p_password   VARCHAR(255)
)
BEGIN
    DECLARE v_id_customer     INT;
    DECLARE v_id_mitra        INT;
    DECLARE v_password_hash   VARCHAR(255);
    DECLARE v_user_type       VARCHAR(20); -- 'customer' atau 'mitra'
    DECLARE v_is_numeric      BOOL;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Validasi input
    IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email atau ID Mitra wajib diisi.';
    END IF;
    IF p_password IS NULL OR TRIM(p_password) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Password wajib diisi.';
    END IF;
    
    -- Cek apakah input adalah angka (ID Mitra)
    SET v_is_numeric = p_identifier REGEXP '^[0-9]+$';
    
    -- LOGIN SEBAGAI MITRA (input adalah angka/ID)
    IF v_is_numeric THEN
        SET v_id_mitra = CAST(p_identifier AS UNSIGNED);
        
        SELECT id_company_profile, `password`
        INTO v_id_mitra, v_password_hash
        FROM `company_profile`
        WHERE id_company_profile = v_id_mitra
        LIMIT 1;
        
        -- Jika id_company_profile tidak ditemukan
        IF v_id_mitra IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mitra tidak terdaftar.';
        END IF;
        
        -- Validasi password
        IF v_password_hash != p_password THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Password salah.';
        END IF;
        
        SET v_user_type = 'mitra';
        
    -- LOGIN SEBAGAI CUSTOMER (input adalah email)
    ELSE
        SELECT id_customer, `password`
        INTO v_id_customer, v_password_hash
        FROM `customer`
        WHERE email = LOWER(TRIM(p_identifier))
        LIMIT 1;
        
        -- Jika email tidak ditemukan
        IF v_id_customer IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email tidak terdaftar.';
        END IF;
        
        -- Validasi password
        IF v_password_hash != p_password THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Password salah.';
        END IF;
        
        SET v_user_type = 'customer';
    END IF;
    
    COMMIT;
    
    -- Kembalikan data sesuai tipe user
    IF v_user_type = 'mitra' THEN
        SELECT
            cp.id_company_profile  AS id,
            cp.nama_perusahaan     AS nama,
            'mitra'                AS user_type,
            cp.email               AS email,
            cp.alamat              AS alamat,
            cp.nomor_telepon       AS nomor_telepon,
            cp.created_at          AS created_at
        FROM `company_profile` cp
        WHERE cp.id_company_profile = v_id_mitra
        LIMIT 1;
    ELSE
        SELECT
            c.id_customer      AS id,
            c.nama_lengkap     AS nama,
            'customer'         AS user_type,
            c.email            AS email,
            c.alamat           AS alamat,
            c.nomor_telepon    AS nomor_telepon,
            c.created_at       AS created_at
        FROM `customer` c
        WHERE c.id_customer = v_id_customer
        LIMIT 1;
    END IF;
    
END
