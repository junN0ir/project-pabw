import prisma from "../config/prisma.js";
import { logActivity } from "../services/activityService.js";

// pengganti trigger register
export const register = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Validasi wajib
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Nama lengkap wajib diisi." });
    }
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password wajib diisi." });
    }

    // Normalisasi email (lowercase, trim, null jika kosong)
    const emailNormalized = email && email.trim() !== "" ? email.toLowerCase().trim() : null;

    // Email unik (jika diisi)
    if (emailNormalized) {
      const existingUser = await prisma.Customer.findUnique({
        where: { email: emailNormalized }
      });

      if (existingUser) {
        return res.status(409).json({ message: "Email sudah terdaftar." });
      }
    }

    // Insert customer
    const user = await prisma.Customer.create({
      data: {
        name: name.trim(),
        email: emailNormalized,
        password,
        phoneNumber: phoneNumber || ""
      }
    });

    await logActivity({
      userId: user.id,
      userType: "CUSTOMER",
      activityType: "REGISTER",
      details: {
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber
      }
    });

    res.json({
      message: "Register berhasil",
      data: {
        id: user.id,
        nama: user.name,
        email: user.email,
        password: user.password,
        userType: "customer",
        alamat: "",
        nomor_telepon: user.phoneNumber
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// pengganti trigger login
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validasi input
    if (!identifier || identifier.trim() === "") {
      return res.status(400).json({ message: "Email atau ID Mitra wajib diisi." });
    }
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password wajib diisi." });
    }

    // Cek apakah input adalah angka (ID Mitra)
    const isNumeric = /^[0-9]+$/.test(identifier);

    let user, userType;

    if (isNumeric) {
      // LOGIN SEBAGAI MITRA
      const mitraId = parseInt(identifier, 10);
      const mitra = await prisma.CompanyProfile.findUnique({
        where: { id: mitraId }
      });

      // Jika ID Mitra tidak ditemukan
      if (!mitra) {
        return res.status(401).json({ message: "Mitra tidak terdaftar." });
      }

      // Validasi password
      if (mitra.password !== password) {
        return res.status(401).json({ message: "Password salah." });
      }

      user = {
        id: mitra.id,
        nama: mitra.companyName,
        user_type: "mitra",
        email: mitra.email,
        alamat: mitra.address,
        nomor_telepon: mitra.phoneNumber
      };
      userType = "MITRA";

    } else {
      // LOGIN SEBAGAI CUSTOMER
      const customer = await prisma.Customer.findUnique({
        where: { email: identifier.toLowerCase().trim() }
      });

      // Jika email tidak ditemukan
      if (!customer) {
        return res.status(401).json({ message: "Email tidak terdaftar." });
      }

      // Validasi password
      if (customer.password !== password) {
        return res.status(401).json({ message: "Password salah." });
      }

      user = {
        id: customer.id,
        nama: customer.name,
        user_type: "customer",
        email: customer.email,
        alamat: customer.phoneNumber
      };
      userType = "CUSTOMER";
    }

    await logActivity({
      userId: user.id,
      userType: userType,
      activityType: "LOGIN",
      details: {
        email: user.email,
        nama: user.nama,
        userType: user.user_type
      }
    });

    res.json({
      message: "Login berhasil",
      data: user
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET semua session login
export const getAllSessions = async (req, res) => {
  try {
    const { status, userType, limit = 10, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status.toUpperCase();
    if (userType) where.userType = userType.toUpperCase();

    const sessions = await prisma.SessionLogin.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { loginTime: "desc" }
    });

    const total = await prisma.SessionLogin.count({ where });

    res.json({
      message: "Data session login berhasil diambil",
      data: sessions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET session berdasarkan ID
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.SessionLogin.findUnique({
      where: { id: parseInt(id) }
    });

    if (!session) {
      return res.status(404).json({ message: "Session login tidak ditemukan." });
    }

    res.json({
      message: "Data session login berhasil diambil",
      data: session
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET session berdasarkan userId
export const getSessionByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const session = await prisma.SessionLogin.findFirst({
      where: { 
        userId: parseInt(userId),
        status: "ACTIVE"
      },
      orderBy: { loginTime: "desc" }
    });

    if (!session) {
      return res.status(404).json({ message: "Session login tidak ditemukan untuk user ini." });
    }

    res.json({
      message: "Data session login berhasil diambil",
      data: session
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET active sessions
export const getActiveSessions = async (req, res) => {
  try {
    const { userType, limit = 10, offset = 0 } = req.query;

    const where = { status: "ACTIVE" };
    if (userType) where.userType = userType.toUpperCase();

    const sessions = await prisma.SessionLogin.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { lastActivity: "desc" }
    });

    const total = await prisma.SessionLogin.count({ where });

    res.json({
      message: "Data active session login berhasil diambil",
      data: sessions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET semua session history (termasuk yang sudah logout)
export const getAllSessionsHistory = async (req, res) => {
  try {
    const { userType, limit = 10, offset = 0 } = req.query;

    const where = {};
    if (userType) where.userType = userType.toUpperCase();

    const sessions = await prisma.SessionLogin.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { loginTime: "desc" }
    });

    const total = await prisma.SessionLogin.count({ where });

    res.json({
      message: "Data semua session login (termasuk logout) berhasil diambil",
      data: sessions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET histori reservasi customer
export const getCustomerReservationHistory = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    // Validasi customerId
    if (!customerId) {
      return res.status(400).json({ message: "Customer ID wajib diisi." });
    }

    // Cek customer ada atau tidak
    const customer = await prisma.Customer.findUnique({
      where: { id: parseInt(customerId) }
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer tidak ditemukan." });
    }

    // Build query filter
    const where = { customerId: parseInt(customerId) };
    if (status) where.status = status.toUpperCase();

    // Get reservation history dengan detail
    const reservations = await prisma.HistoryPurchase.findMany({
      where,
      include: {
        room: {
          include: {
            hotel: true,
            detail: true
          }
        },
        company: true
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { purchaseDate: "desc" }
    });

    const total = await prisma.HistoryPurchase.count({ where });

    res.json({
      message: "Histori reservasi berhasil diambil",
      data: reservations.map(reservation => ({
        id: reservation.id,
        purchaseDate: reservation.purchaseDate,
        checkinTime: reservation.checkinTime,
        checkoutTime: reservation.checkoutTime,
        amount: reservation.amount,
        status: reservation.status,
        roomNumber: reservation.room.roomNumber,
        hotelName: reservation.room.hotel.hotelName,
        roomType: reservation.room.detail.typeRoom,
        capacity: reservation.room.detail.capacity,
        hotelLocation: reservation.room.hotel.location,
        companyName: reservation.company.companyName
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET detail reservasi spesifik
export const getReservationDetail = async (req, res) => {
  try {
    const { customerId, reservationId } = req.params;

    // Validasi parameter
    if (!customerId || !reservationId) {
      return res.status(400).json({ message: "Customer ID dan Reservation ID wajib diisi." });
    }

    // Get reservation dengan validasi customer
    const reservation = await prisma.HistoryPurchase.findFirst({
      where: {
        id: parseInt(reservationId),
        customerId: parseInt(customerId)
      },
      include: {
        room: {
          include: {
            hotel: true,
            detail: true
          }
        },
        company: true,
        customer: true
      }
    });

    if (!reservation) {
      return res.status(404).json({ message: "Reservasi tidak ditemukan." });
    }

    res.json({
      message: "Detail reservasi berhasil diambil",
      data: {
        id: reservation.id,
        purchaseDate: reservation.purchaseDate,
        checkinTime: reservation.checkinTime,
        checkoutTime: reservation.checkoutTime,
        amount: reservation.amount,
        status: reservation.status,
        customer: {
          id: reservation.customer.id,
          nama: reservation.customer.name,
          email: reservation.customer.email,
          nomor_telepon: reservation.customer.phoneNumber
        },
        room: {
          number: reservation.room.roomNumber,
          type: reservation.room.detail.typeRoom,
          facility: reservation.room.detail.facility,
          capacity: reservation.room.detail.capacity,
          price: reservation.room.price
        },
        hotel: {
          nama: reservation.room.hotel.hotelName,
          location: reservation.room.hotel.location,
          contactPerson: reservation.room.hotel.contactPerson,
          contactEmail: reservation.room.hotel.contactEmail,
          contactPhone: reservation.room.hotel.contactPhone
        },
        company: {
          nama: reservation.company.companyName,
          email: reservation.company.email,
          alamat: reservation.company.address,
          nomor_telepon: reservation.company.phoneNumber
        }
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ringkasan statistik reservasi customer
export const getReservationStats = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID wajib diisi." });
    }

    // Cek customer ada atau tidak
    const customer = await prisma.Customer.findUnique({
      where: { id: parseInt(customerId) }
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer tidak ditemukan." });
    }

    // Ambil semua reservasi
    const allReservations = await prisma.HistoryPurchase.findMany({
      where: { customerId: parseInt(customerId) }
    });

    // Hitung statistik
    const stats = {
      totalReservasi: allReservations.length,
      totalBiaya: allReservations.reduce((sum, r) => sum + parseFloat(r.amount), 0),
      confirmed: allReservations.filter(r => r.status === "CONFIRMED").length,
      cancelled: allReservations.filter(r => r.status === "CANCELLED").length
    };

    res.json({
      message: "Statistik reservasi berhasil diambil",
      data: stats
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET histori reservasi berdasarkan mitra/company
export const getMitraReservationHistory = async (req, res) => {
  try {
    const { mitraId } = req.params;
    const { status, limit = 10, offset = 0 } = req.query;

    // Validasi mitraId
    if (!mitraId) {
      return res.status(400).json({ message: "Mitra ID wajib diisi." });
    }

    // Cek mitra ada atau tidak
    const mitra = await prisma.CompanyProfile.findUnique({
      where: { id: parseInt(mitraId) }
    });

    if (!mitra) {
      return res.status(404).json({ message: "Mitra tidak ditemukan." });
    }

    // Build query filter
    const where = { companyId: parseInt(mitraId) };
    if (status) where.status = status.toUpperCase();

    // Get reservation history dengan detail
    const reservations = await prisma.HistoryPurchase.findMany({
      where,
      include: {
        room: {
          include: {
            hotel: true,
            detail: true
          }
        },
        customer: true
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { purchaseDate: "desc" }
    });

    const total = await prisma.HistoryPurchase.count({ where });

    res.json({
      message: "Histori reservasi mitra berhasil diambil",
      data: reservations.map(reservation => ({
        id: reservation.id,
        purchaseDate: reservation.purchaseDate,
        checkinTime: reservation.checkinTime,
        checkoutTime: reservation.checkoutTime,
        amount: reservation.amount,
        status: reservation.status,
        roomNumber: reservation.room.roomNumber,
        hotelName: reservation.room.hotel.hotelName,
        roomType: reservation.room.detail.typeRoom,
        capacity: reservation.room.detail.capacity,
        hotelLocation: reservation.room.hotel.location,
        customerName: reservation.customer.name,
        customerEmail: reservation.customer.email
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET semua reservasi (untuk admin)
export const getAllReservations = async (req, res) => {
  try {
    const { status, customerId, mitraId, limit = 10, offset = 0 } = req.query;

    // Build query filter
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (customerId) where.customerId = parseInt(customerId);
    if (mitraId) where.companyId = parseInt(mitraId);

    // Get all reservations dengan detail
    const reservations = await prisma.HistoryPurchase.findMany({
      where,
      include: {
        room: {
          include: {
            hotel: true,
            detail: true
          }
        },
        customer: true,
        company: true
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { purchaseDate: "desc" }
    });

    const total = await prisma.HistoryPurchase.count({ where });

    res.json({
      message: "Semua reservasi berhasil diambil",
      data: reservations.map(reservation => ({
        id: reservation.id,
        purchaseDate: reservation.purchaseDate,
        checkinTime: reservation.checkinTime,
        checkoutTime: reservation.checkoutTime,
        amount: reservation.amount,
        status: reservation.status,
        roomNumber: reservation.room.roomNumber,
        hotelName: reservation.room.hotel.hotelName,
        roomType: reservation.room.detail.typeRoom,
        hotelLocation: reservation.room.hotel.location,
        customerName: reservation.customer.name,
        customerEmail: reservation.customer.email,
        mitraName: reservation.company.companyName,
        mitraEmail: reservation.company.email
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CREATE kamar baru
export const createRoom = async (req, res) => {
  try {
    const { roomNumber, price, hotelId, detailId, status } = req.body;

    // Validasi input
    if (!roomNumber || roomNumber.trim() === "") {
      return res.status(400).json({ message: "Nomor kamar wajib diisi." });
    }
    if (!price || price <= 0) {
      return res.status(400).json({ message: "Harga kamar wajib diisi dan harus lebih dari 0." });
    }
    if (!hotelId) {
      return res.status(400).json({ message: "Hotel ID wajib diisi." });
    }
    if (!detailId) {
      return res.status(400).json({ message: "Detail ID wajib diisi." });
    }

    // Cek hotel ada atau tidak
    const hotel = await prisma.ListHotel.findUnique({
      where: { id: parseInt(hotelId) }
    });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel tidak ditemukan." });
    }

    // Cek detail kamar ada atau tidak
    const detail = await prisma.DetailKamar.findUnique({
      where: { id: parseInt(detailId) }
    });

    if (!detail) {
      return res.status(404).json({ message: "Detail kamar tidak ditemukan." });
    }

    // Cek duplikasi nomor kamar di hotel yang sama
    const existingRoom = await prisma.ListKamar.findFirst({
      where: {
        roomNumber: roomNumber.trim(),
        hotelId: parseInt(hotelId)
      }
    });

    if (existingRoom) {
      return res.status(409).json({ message: "Nomor kamar sudah ada di hotel ini." });
    }

    // Create kamar baru
    const room = await prisma.ListKamar.create({
      data: {
        roomNumber: roomNumber.trim(),
        price: parseFloat(price),
        status: status?.toUpperCase() || "AVAILABLE",
        hotelId: parseInt(hotelId),
        detailId: parseInt(detailId)
      },
      include: {
        hotel: true,
        detail: true
      }
    });

    res.status(201).json({
      message: "Kamar berhasil ditambahkan",
      data: {
        id: room.id,
        roomNumber: room.roomNumber,
        price: room.price,
        status: room.status,
        hotelName: room.hotel.hotelName,
        roomType: room.detail.typeRoom,
        facility: room.detail.facility,
        capacity: room.detail.capacity
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
