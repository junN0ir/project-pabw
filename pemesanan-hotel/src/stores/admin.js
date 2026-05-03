import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAdminStore = defineStore('admin', () => {

  // ─── Daftar Mitra ──────────────────────────────────────────────────
  const mitraList = ref([
    {
      id: 1, name: 'Budi Santoso', email: 'budi@hotel.com',
      phone: '08111111111', hotel: 'Grand Kalimantan Hotel',
      status: 'aktif', joinDate: '2024-01-10', password: 'mitra123'
    },
    {
      id: 2, name: 'Sari Dewi', email: 'sari@hotel.com',
      phone: '08222222222', hotel: 'Borneo Transit Hotel',
      status: 'aktif', joinDate: '2024-02-15', password: 'mitra123'
    },
    {
      id: 3, name: 'Ahmad Fauzi', email: 'ahmad@hotel.com',
      phone: '08333333333', hotel: 'Samarinda River View',
      status: 'aktif', joinDate: '2024-03-20', password: 'mitra123'
    },
    {
      id: 4, name: 'Linda Putri', email: 'linda@hotel.com',
      phone: '08444444444', hotel: 'Kutai Heritage Resort',
      status: 'nonaktif', joinDate: '2024-04-05', password: 'mitra123'
    },
  ])

  // ID mitra yang masih punya reservasi aktif (tidak boleh dihapus)
  const mitraWithActiveReservation = ref([2])

  // ─── Reservasi ──────────────────────────────────────────────────────
  const allReservations = ref([
    { id: 1, ref: '87654321', fullname: 'Budi Setiawan',  email: 'budi@mail.com',  hotelName: 'Grand Kalimantan Hotel', hotelId: 1, room: 'Suite Premium',   checkin: '2025-08-10', checkout: '2025-08-13', nights: 3, total: 4500000, status: 'confirmed' },
    { id: 2, ref: '12345678', fullname: 'Rina Marlina',   email: 'rina@mail.com',  hotelName: 'Grand Kalimantan Hotel', hotelId: 1, room: 'Kamar Deluxe',     checkin: '2025-08-15', checkout: '2025-08-17', nights: 2, total: 1700000, status: 'pending'   },
    { id: 3, ref: '23456789', fullname: 'Denny Wahyu',    email: 'denny@mail.com', hotelName: 'Borneo Transit Hotel',   hotelId: 2, room: 'Kamar Standard',   checkin: '2025-08-20', checkout: '2025-08-21', nights: 1, total:  450000, status: 'confirmed' },
    { id: 4, ref: '34567890', fullname: 'Siti Rahma',     email: 'siti@mail.com',  hotelName: 'Borneo Transit Hotel',   hotelId: 2, room: 'Kamar Keluarga',   checkin: '2025-08-22', checkout: '2025-08-25', nights: 3, total: 2250000, status: 'cancelled' },
    { id: 5, ref: '45678901', fullname: 'Eko Purnomo',    email: 'eko@mail.com',   hotelName: 'Samarinda River View',   hotelId: 3, room: 'Kamar River View', checkin: '2025-08-12', checkout: '2025-08-14', nights: 2, total: 1240000, status: 'confirmed' },
    { id: 6, ref: '56789012', fullname: 'Dewi Kartika',   email: 'dewi@mail.com',  hotelName: 'Kutai Heritage Resort',  hotelId: 4, room: 'Villa Heritage',   checkin: '2025-08-18', checkout: '2025-08-20', nights: 2, total: 2200000, status: 'confirmed' },
  ])

  // ─── CRUD Mitra ─────────────────────────────────────────────────────

  /**
   * Tambah mitra baru.
   * Admin cukup ketik nama hotel langsung — tidak perlu pilih dari list.
   * Validasi hanya: semua field wajib diisi + email tidak duplikat.
   */
  function tambahMitra(data) {
    if (!data.name || !data.email || !data.phone || !data.hotel || !data.password) {
      return { success: false, message: 'Semua field wajib diisi.' }
    }
    if (mitraList.value.find(m => m.email === data.email)) {
      return { success: false, message: 'Email sudah digunakan oleh mitra lain.' }
    }
    mitraList.value.push({
      id: Date.now(),
      name:     data.name,
      email:    data.email,
      phone:    data.phone,
      hotel:    data.hotel.trim(),
      status:   data.status ?? 'aktif',
      password: data.password,
      joinDate: new Date().toISOString().split('T')[0]
    })
    return { success: true, message: 'Mitra baru berhasil ditambahkan!' }
  }

  /**
   * Edit mitra.
   * Admin bisa ubah nama hotel kapanpun — ketik langsung.
   * Validasi: email tidak duplikat (kecuali milik sendiri).
   */
  function editMitra(id, data) {
    const idx = mitraList.value.findIndex(m => m.id === id)
    if (idx === -1) return { success: false, message: 'Mitra tidak ditemukan.' }

    if (mitraList.value.find(m => m.email === data.email && m.id !== id)) {
      return { success: false, message: 'Email sudah digunakan oleh mitra lain.' }
    }
    mitraList.value[idx] = {
      ...mitraList.value[idx],
      name:   data.name,
      email:  data.email,
      phone:  data.phone,
      hotel:  data.hotel.trim(),
      status: data.status ?? mitraList.value[idx].status,
      ...(data.password ? { password: data.password } : {})
    }
    return { success: true, message: 'Data mitra berhasil diperbarui!' }
  }

  /**
   * Hapus mitra.
   * Tidak bisa hapus jika masih punya reservasi aktif.
   */
  function hapusMitra(id) {
    if (mitraWithActiveReservation.value.includes(id)) {
      return { success: false, message: 'Mitra tidak dapat dihapus karena masih memiliki reservasi aktif.' }
    }
    mitraList.value = mitraList.value.filter(m => m.id !== id)
    return { success: true, message: 'Mitra berhasil dihapus.' }
  }

  /**
   * Get reservasi berdasarkan hotel (untuk tab laporan).
   */
  function getReservasiByHotel(hotelId) {
    if (!hotelId) return []
    return allReservations.value.filter(r => r.hotelId === parseInt(hotelId))
  }

  // ─── Computed ────────────────────────────────────────────────────────
  const totalMitra     = computed(() => mitraList.value.length)
  const totalReservasi = computed(() => allReservations.value.length)

  return {
    mitraList,
    allReservations,
    mitraWithActiveReservation,
    totalMitra,
    totalReservasi,
    tambahMitra,
    editMitra,
    hapusMitra,
    getReservasiByHotel,
  }
})