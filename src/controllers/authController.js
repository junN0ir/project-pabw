import pool from "../config/db.js";

// pengganti trigger register
export const register = async (req, res) => {
  try {
    const { name, email, password, phone_number } = req.body;

    // Validasi wajib
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Nama lengkap wajib diisi." });
    }
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password wajib diisi." });
    }
    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Email wajib diisi." });
    }

    // Normalisasi email
    const emailNormalized = email.toLowerCase().trim();

    // Email unik - cek di tabel user
    const [existing] = await pool.query(
      `SELECT id_user FROM user WHERE email = ?`,
      [emailNormalized]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    // Insert ke tabel user dengan role customer
    const [result] = await pool.query(
      `INSERT INTO user (name, email, password, phone_number, role) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), emailNormalized, password, phone_number || "", "customer"]
    );

    const userId = result.insertId;

    res.json({
      message: "Register berhasil",
      data: {
        id: userId,
        nama: name.trim(),
        email: emailNormalized,
        role: "customer",
        phone_number: phone_number || ""
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// pengganti trigger login (support identifier: email atau mitra ID)
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validasi input
    if (!identifier || identifier.trim() === "") {
      return res.status(400).json({ message: "Email atau Mitra ID wajib diisi." });
    }
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password wajib diisi." });
    }

    // Cek apakah input adalah angka (ID Mitra)
    const isNumeric = /^[0-9]+$/.test(identifier);

    let user, userType;

    if (isNumeric) {
      // LOGIN SEBAGAI MITRA
      const id_company_profile = parseInt(identifier, 10);
      const [mitraRows] = await pool.query(
        `SELECT * FROM company_profile WHERE id_company_profile = ?`,
        [id_company_profile]
      );

      if (mitraRows.length === 0) {
        return res.status(401).json({ message: "Mitra tidak terdaftar." });
      }

      const mitra = mitraRows[0];

      if (mitra.password !== password) {
        return res.status(401).json({ message: "Password salah." });
      }

      user = {
        id: mitra.id_company_profile,
        nama: mitra.company_name,
        role: "mitra",
        email: mitra.email,
        alamat: mitra.address,
        phone_number: mitra.phone_number
      };
      userType = "MITRA";

    } else {
      // LOGIN SEBAGAI CUSTOMER
      const emailNormalized = identifier.toLowerCase().trim();

      const [customerRows] = await pool.query(
        `SELECT id_user, name, email, password, phone_number, role FROM user WHERE email = ? AND role = 'customer'`,
        [emailNormalized]
      );

      if (customerRows.length === 0) {
        return res.status(401).json({ message: "Email tidak terdaftar atau bukan customer." });
      }

      const customer = customerRows[0];

      if (customer.password !== password) {
        return res.status(401).json({ message: "Password salah." });
      }

      user = {
        id: customer.id_user,
        nama: customer.name,
        role: "customer",
        email: customer.email,
        phone_number: customer.phone_number
      };
      userType = "CUSTOMER";
    }

    // Cek apakah sudah ada session aktif
    const [existingSession] = await pool.query(
      `SELECT id_login, last_activity FROM session_login 
       WHERE id_user = ? AND status = 'active'
       ORDER BY login_time DESC LIMIT 1`,
      [user.id]
    );

    if (existingSession.length > 0) {
      const lastActivity = new Date(existingSession[0].last_activity);
      const now = new Date();
      const diffMinutes = (now - lastActivity) / 1000 / 60;

      if (diffMinutes < 5) {
        // Session masih aktif dan belum expired
        return res.status(403).json({
          message: "Akun ini sedang login di perangkat lain. Silakan logout terlebih dahulu."
        });
      } else {
        // Session sudah expired (lebih dari 5 menit tidak ada aktivitas), auto logout
        await pool.query(
          `UPDATE session_login 
           SET status = 'inactive', logout_time = NOW() 
           WHERE id_login = ?`,
          [existingSession[0].id_login]
        );
      }
    }

    // Simpan session login baru
    await pool.query(
      `INSERT INTO session_login (id_user, user_type, status, login_time, last_activity, logout_time)
       VALUES (?, ?, 'active', NOW(), NOW(), NULL)`,
      [user.id, userType]
    );

    res.json({
      message: "Login berhasil",
      data: user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UC5 Lupa Password
export const forgotPassword = async (req, res) => {
  try {
    const { email, new_password, user_type } = req.body;

    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Email wajib diisi." });
    }

    if (!new_password || new_password.trim() === "") {
      return res.status(400).json({ message: "Password baru wajib diisi." });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ message: "Password baru minimal 6 karakter." });
    }

    const emailNormalized = email.toLowerCase().trim();
    const userTypeNormalized = user_type ? user_type.toLowerCase().trim() : null;

    if (userTypeNormalized && !["customer", "mitra"].includes(userTypeNormalized)) {
      return res.status(400).json({ message: "user_type hanya boleh customer atau mitra." });
    }

    const targets = [];

    if (!userTypeNormalized || userTypeNormalized === "customer") {
      const [customerRows] = await pool.query(
        `SELECT id_user, name, email FROM user WHERE email = ? AND role = 'customer'`,
        [emailNormalized]
      );

      if (customerRows.length > 0) {
        targets.push({ type: "customer", data: customerRows[0] });
      }
    }

    if (!userTypeNormalized || userTypeNormalized === "mitra") {
      const [mitraRows] = await pool.query(
        `SELECT id_company_profile, company_name, email FROM company_profile WHERE email = ?`,
        [emailNormalized]
      );

      if (mitraRows.length > 0) {
        targets.push({ type: "mitra", data: mitraRows[0] });
      }
    }

    if (targets.length === 0) {
      return res.status(404).json({ message: "Email tidak ditemukan." });
    }

    if (targets.length > 1 && !userTypeNormalized) {
      return res.status(400).json({
        message: "Email ditemukan pada customer dan mitra. Kirim user_type untuk menentukan akun yang ingin direset."
      });
    }

    const target = targets[0];

    if (target.type === "customer") {
      await pool.query(
        `UPDATE user SET password = ? WHERE id_user = ?`,
        [new_password, target.data.id_user]
      );

      return res.json({
        message: "Password customer berhasil diperbarui",
        data: {
          id_user: target.data.id_user,
          name: target.data.name,
          email: target.data.email
        }
      });
    }

    await pool.query(
      `UPDATE company_profile SET password = ? WHERE id_company_profile = ?`,
      [new_password, target.data.id_company_profile]
    );

    return res.json({
      message: "Password mitra berhasil diperbarui",
      data: {
        id_company_profile: target.data.id_company_profile,
        company_name: target.data.company_name,
        email: target.data.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
