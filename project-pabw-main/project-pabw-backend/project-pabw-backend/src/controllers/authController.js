import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendMail } from "../utils/mailer.js";

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function isBcryptHash(password) {
  return typeof password === "string" && password.startsWith("$2");
}

async function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;

  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(inputPassword, storedPassword);
  }

  return inputPassword === storedPassword;
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function createOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(email, purpose, otp) {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;

  return crypto
    .createHmac("sha256", secret)
    .update(`${email}:${purpose}:${otp}`)
    .digest("hex");
}

function safeOtpCompare(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) return false;

  return crypto.timingSafeEqual(bufferA, bufferB);
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET belum diset di file .env.");
  }

  return jwt.sign(
    {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
}

async function saveOtp(connection, email, purpose, otp) {
  const otpHash = hashOtp(email, purpose, otp);

  await connection.query(
    `UPDATE email_verification_codes
     SET consumed_at = NOW()
     WHERE email = ? AND purpose = ? AND consumed_at IS NULL`,
    [email, purpose]
  );

  await connection.query(
    `INSERT INTO email_verification_codes
     (email, purpose, otp_hash, attempts, expires_at)
     VALUES (?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [email, purpose, otpHash]
  );
}

async function sendVerificationOtp(email, name, otp) {
  await sendMail({
    to: email,
    subject: "Kode Verifikasi Akun PABW",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verifikasi Akun PABW</h2>
        <p>Halo ${name},</p>
        <p>Gunakan kode berikut untuk verifikasi akun kamu:</p>
        <h1 style="letter-spacing: 6px;">${otp}</h1>
        <p>Kode ini berlaku selama 10 menit.</p>
        <p>Jika kamu tidak merasa membuat akun, abaikan email ini.</p>
      </div>
    `
  });
}

async function createLoginSession(user) {
  const [existingSession] = await pool.query(
    `SELECT id_login, last_activity
     FROM session_login
     WHERE id_user = ? AND user_type = ? AND status = 'active'
     ORDER BY login_time DESC
     LIMIT 1`,
    [user.id, user.role]
  );

  if (existingSession.length > 0) {
    const lastActivity = new Date(existingSession[0].last_activity);
    const now = new Date();
    const diffMinutes = (now - lastActivity) / 1000 / 60;

    if (diffMinutes < 5) {
      return {
        allowed: false,
        message: "Akun ini sedang login di perangkat lain. Silakan logout terlebih dahulu."
      };
    }

    await pool.query(
      `UPDATE session_login
       SET status = 'inactive', logout_time = NOW()
       WHERE id_login = ?`,
      [existingSession[0].id_login]
    );
  }

  await pool.query(
    `INSERT INTO session_login
     (id_user, user_type, status, login_time, last_activity, logout_time)
     VALUES (?, ?, 'active', NOW(), NOW(), NULL)`,
    [user.id, user.role]
  );

  return {
    allowed: true
  };
}

function normalizeUser(row) {
  return {
    id: row.id_user,
    nama: row.name,
    email: row.email,
    role: row.role,
    phone_number: row.phone_number || ""
  };
}

export const register = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { name, email, password, phone_number } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Nama lengkap wajib diisi." });
    }

    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Email wajib diisi." });
    }

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password wajib diisi." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter." });
    }

    const emailNormalized = normalizeEmail(email);
    const cleanName = name.trim();
    const cleanPhone = phone_number || "";
    const passwordHash = await hashPassword(password);
    const otp = createOtp();

    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id_user, is_verified
       FROM user
       WHERE email = ?
       LIMIT 1`,
      [emailNormalized]
    );

    if (existing.length > 0 && Number(existing[0].is_verified) === 1) {
      await connection.rollback();

      return res.status(409).json({
        message: "Email sudah terdaftar dan sudah diverifikasi."
      });
    }

    if (existing.length > 0 && Number(existing[0].is_verified) === 0) {
      await connection.query(
        `UPDATE user
         SET name = ?, password = ?, phone_number = ?, role = 'customer', is_verified = 0
         WHERE id_user = ?`,
        [cleanName, passwordHash, cleanPhone, existing[0].id_user]
      );
    } else {
      await connection.query(
        `INSERT INTO user
         (name, email, password, phone_number, role, is_verified)
         VALUES (?, ?, ?, ?, 'customer', 0)`,
        [cleanName, emailNormalized, passwordHash, cleanPhone]
      );
    }

    await saveOtp(connection, emailNormalized, "verify_email", otp);

    await sendVerificationOtp(emailNormalized, cleanName, otp);

    await connection.commit();

    return res.status(201).json({
      message: "Register berhasil. Kode OTP sudah dikirim ke email.",
      data: {
        email: emailNormalized,
        requires_verification: true
      }
    });
  } catch (error) {
    await connection.rollback();

    console.error("Register error:", error);

    return res.status(500).json({
      message: "Register gagal.",
      error: "Gagal mengirim OTP atau menyimpan data register."
    });
  } finally {
    connection.release();
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Email wajib diisi." });
    }

    if (!otp || otp.trim() === "") {
      return res.status(400).json({ message: "Kode OTP wajib diisi." });
    }

    const emailNormalized = normalizeEmail(email);
    const cleanOtp = otp.trim();

    const [codes] = await pool.query(
      `SELECT id_code, otp_hash, attempts, expires_at
       FROM email_verification_codes
       WHERE email = ?
       AND purpose = 'verify_email'
       AND consumed_at IS NULL
       ORDER BY id_code DESC
       LIMIT 1`,
      [emailNormalized]
    );

    if (codes.length === 0) {
      return res.status(400).json({
        message: "Kode OTP tidak ditemukan. Silakan minta kode baru."
      });
    }

    const code = codes[0];

    if (new Date(code.expires_at) < new Date()) {
      await pool.query(
        `UPDATE email_verification_codes
         SET consumed_at = NOW()
         WHERE id_code = ?`,
        [code.id_code]
      );

      return res.status(400).json({
        message: "Kode OTP sudah expired. Silakan minta kode baru."
      });
    }

    if (Number(code.attempts) >= 5) {
      await pool.query(
        `UPDATE email_verification_codes
         SET consumed_at = NOW()
         WHERE id_code = ?`,
        [code.id_code]
      );

      return res.status(429).json({
        message: "Percobaan OTP terlalu banyak. Silakan minta kode baru."
      });
    }

    const incomingHash = hashOtp(emailNormalized, "verify_email", cleanOtp);
    const isValidOtp = safeOtpCompare(incomingHash, code.otp_hash);

    if (!isValidOtp) {
      await pool.query(
        `UPDATE email_verification_codes
         SET attempts = attempts + 1
         WHERE id_code = ?`,
        [code.id_code]
      );

      return res.status(400).json({
        message: "Kode OTP salah."
      });
    }

    await pool.query(
      `UPDATE email_verification_codes
       SET consumed_at = NOW()
       WHERE id_code = ?`,
      [code.id_code]
    );

    await pool.query(
      `UPDATE user
       SET is_verified = 1
       WHERE email = ? AND role = 'customer'`,
      [emailNormalized]
    );

    const [users] = await pool.query(
      `SELECT id_user, name, email, phone_number, role
       FROM user
       WHERE email = ? AND role = 'customer'
       LIMIT 1`,
      [emailNormalized]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User tidak ditemukan."
      });
    }

    const user = normalizeUser(users[0]);

    const session = await createLoginSession(user);

    if (!session.allowed) {
      return res.status(403).json({
        message: session.message
      });
    }

    const token = createToken(user);

    return res.json({
      message: "Email berhasil diverifikasi.",
      token,
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      message: "Verifikasi email gagal.",
      error: error.message
    });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || email.trim() === "") {
      return res.status(400).json({ message: "Email wajib diisi." });
    }

    const emailNormalized = normalizeEmail(email);

    const [users] = await pool.query(
      `SELECT id_user, name, email, is_verified
       FROM user
       WHERE email = ? AND role = 'customer'
       LIMIT 1`,
      [emailNormalized]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "Email tidak ditemukan."
      });
    }

    if (Number(users[0].is_verified) === 1) {
      return res.status(400).json({
        message: "Email sudah diverifikasi."
      });
    }

    const otp = createOtp();

    await saveOtp(emailNormalized, "verify_email", otp);
    await sendVerificationOtp(emailNormalized, users[0].name, otp);

    return res.json({
      message: "Kode OTP baru sudah dikirim ke email.",
      data: {
        email: emailNormalized
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengirim ulang OTP.",
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || identifier.trim() === "") {
      return res.status(400).json({
        message: "Email atau ID Mitra wajib diisi."
      });
    }

    if (!password || password.trim() === "") {
      return res.status(400).json({
        message: "Password wajib diisi."
      });
    }

    const cleanIdentifier = identifier.trim();
    const isNumeric = /^[0-9]+$/.test(cleanIdentifier);

    let user = null;
    let tableTarget = null;
    let targetId = null;
    let storedPassword = null;

    if (isNumeric) {
      const idCompanyProfile = parseInt(cleanIdentifier, 10);

      const [mitraRows] = await pool.query(
        `SELECT id_company_profile, company_name, email, password, phone_number, address
         FROM company_profile
         WHERE id_company_profile = ?
         LIMIT 1`,
        [idCompanyProfile]
      );

      if (mitraRows.length === 0) {
        return res.status(401).json({
          message: "Mitra tidak terdaftar."
        });
      }

      const mitra = mitraRows[0];

      user = {
        id: mitra.id_company_profile,
        nama: mitra.company_name,
        email: mitra.email,
        role: "mitra",
        phone_number: mitra.phone_number || "",
        alamat: mitra.address || ""
      };

      storedPassword = mitra.password;
      tableTarget = "company_profile";
      targetId = mitra.id_company_profile;
    } else {
      const emailNormalized = normalizeEmail(cleanIdentifier);

      const [userRows] = await pool.query(
        `SELECT id_user, name, email, password, phone_number, role, is_verified
         FROM user
         WHERE email = ?
         LIMIT 1`,
        [emailNormalized]
      );

      if (userRows.length === 0) {
        return res.status(401).json({
          message: "Email tidak terdaftar."
        });
      }

      const selectedUser = userRows[0];

      if (selectedUser.role === "customer" && Number(selectedUser.is_verified) !== 1) {
        return res.status(403).json({
          message: "Email belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.",
          requires_verification: true,
          email: selectedUser.email
        });
      }

      user = normalizeUser(selectedUser);
      storedPassword = selectedUser.password;
      tableTarget = "user";
      targetId = selectedUser.id_user;
    }

    const isPasswordValid = await verifyPassword(password, storedPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Password salah."
      });
    }

    if (!isBcryptHash(storedPassword)) {
      const newHash = await hashPassword(password);

      if (tableTarget === "user") {
        await pool.query(
          `UPDATE user
           SET password = ?
           WHERE id_user = ?`,
          [newHash, targetId]
        );
      }

      if (tableTarget === "company_profile") {
        await pool.query(
          `UPDATE company_profile
           SET password = ?
           WHERE id_company_profile = ?`,
          [newHash, targetId]
        );
      }
    }

    const session = await createLoginSession(user);

    if (!session.allowed) {
      return res.status(403).json({
        message: session.message
      });
    }

    const token = createToken(user);

    return res.json({
      message: "Login berhasil.",
      token,
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      message: "Login gagal.",
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await pool.query(
        `UPDATE session_login
         SET status = 'inactive', logout_time = NOW()
         WHERE id_user = ? AND user_type = ? AND status = 'active'`,
        [req.user.id, req.user.role]
      );
    }

    return res.json({
      message: "Logout berhasil."
    });
  } catch (error) {
    return res.status(500).json({
      message: "Logout gagal.",
      error: error.message
    });
  }
};

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

    const emailNormalized = normalizeEmail(email);
    const userTypeNormalized = user_type ? user_type.toLowerCase().trim() : "customer";
    const newPasswordHash = await hashPassword(new_password);

    if (!["customer", "mitra"].includes(userTypeNormalized)) {
      return res.status(400).json({
        message: "user_type hanya boleh customer atau mitra."
      });
    }

    if (userTypeNormalized === "customer") {
      const [users] = await pool.query(
        `SELECT id_user, email
         FROM user
         WHERE email = ? AND role = 'customer'
         LIMIT 1`,
        [emailNormalized]
      );

      if (users.length === 0) {
        return res.status(404).json({
          message: "Email customer tidak ditemukan."
        });
      }

      await pool.query(
        `UPDATE user
         SET password = ?
         WHERE id_user = ?`,
        [newPasswordHash, users[0].id_user]
      );

      return res.json({
        message: "Password customer berhasil diperbarui."
      });
    }

    const [mitraRows] = await pool.query(
      `SELECT id_company_profile, email
       FROM company_profile
       WHERE email = ?
       LIMIT 1`,
      [emailNormalized]
    );

    if (mitraRows.length === 0) {
      return res.status(404).json({
        message: "Email mitra tidak ditemukan."
      });
    }

    await pool.query(
      `UPDATE company_profile
       SET password = ?
       WHERE id_company_profile = ?`,
      [newPasswordHash, mitraRows[0].id_company_profile]
    );

    return res.json({
      message: "Password mitra berhasil diperbarui."
    });
  } catch (error) {
    return res.status(500).json({
      message: "Reset password gagal.",
      error: error.message
    });
  }
};