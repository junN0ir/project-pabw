import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet } from '@/services/api'

const HOTEL_PRESETS = [
  {
    image: '/images/hotel-1.jpg',
    rating: 4.8,
    reviewCount: 234,
    priceFrom: 850000,
    stars: 5,
    description: 'Hotel bintang 5 dengan pemandangan kota yang menakjubkan. Dilengkapi kolam renang, spa, dan restoran premium.',
    amenities: ['🏊 Kolam Renang', '💆 Spa', '🍽 Restoran', '🏋 Gym', '🅿 Parkir', '🚐 Antar Jemput'],
    rooms: [
      { id: 1, name: 'Kamar Deluxe', price: 850000, capacity: 2, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', description: 'Kamar nyaman dengan pemandangan kota.', amenities: ['🛏 King Bed', '📶 WiFi', '❄️ AC', '📺 Smart TV'], badge: '🕐 Early Bird', badgeClass: 'early-bird', featured: false, status: 'available' },
      { id: 2, name: 'Suite Premium', price: 1500000, capacity: 3, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop', description: 'Suite mewah dengan jacuzzi dan ruang tamu.', amenities: ['🛏 Super King', '📶 WiFi', '🛁 Jacuzzi', '🍽 Sarapan'], badge: '⭐ Unggulan', badgeClass: 'seasonal', featured: true, status: 'available' }
    ]
  },
  {
    image: '/images/hotel-2.jpg',
    rating: 4.3,
    reviewCount: 187,
    priceFrom: 450000,
    stars: 3,
    description: 'Hotel transit nyaman dekat pusat kota. Cocok untuk perjalanan bisnis dengan fasilitas yang praktis dan efisien.',
    amenities: ['📶 WiFi', '☕ Sarapan', '🚐 Antar Jemput Bandara', '🅿 Parkir'],
    rooms: [
      { id: 3, name: 'Kamar Standard', price: 450000, capacity: 2, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', description: 'Kamar bersih dan nyaman untuk transit.', amenities: ['🛏 Queen Bed', '📶 WiFi', '❄️ AC', '📺 TV'], badge: null, badgeClass: '', featured: false, status: 'available' },
      { id: 4, name: 'Kamar Keluarga', price: 750000, capacity: 4, image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=400&fit=crop', description: 'Kamar luas untuk keluarga.', amenities: ['🛏 2 Tempat Tidur', '📶 WiFi', '❄️ AC', '☕ Mini Bar'], badge: '💎 Hemat', badgeClass: 'loyalty', featured: false, status: 'available' }
    ]
  },
  {
    image: '/images/hotel-3.jpg',
    rating: 4.6,
    reviewCount: 156,
    priceFrom: 620000,
    stars: 4,
    description: 'Hotel modern dengan suasana tenang dan akses mudah ke pusat aktivitas kota.',
    amenities: ['🏊 Kolam Renang', '🍽 Restoran', '💆 Spa', '🅿 Parkir'],
    rooms: [
      { id: 5, name: 'Kamar River View', price: 620000, capacity: 2, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', description: 'Kamar dengan pemandangan langsung ke area terbaik hotel.', amenities: ['🛏 King Bed', '📶 WiFi', '❄️ AC', '🌅 View'], badge: '🌟 Populer', badgeClass: 'seasonal', featured: true, status: 'available' }
    ]
  },
  {
    image: '/images/hotel-4.jpg',
    rating: 4.5,
    reviewCount: 98,
    priceFrom: 550000,
    stars: 4,
    description: 'Resort dengan sentuhan tradisional dan modern. Cocok untuk keluarga maupun liburan singkat.',
    amenities: ['🏊 Kolam Renang', '🌿 Tur Budaya', '🍽 Restoran', '🎭 Pertunjukan Seni'],
    rooms: [
      { id: 6, name: 'Villa Heritage', price: 1100000, capacity: 3, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop', description: 'Villa dengan dekorasi khas lokal.', amenities: ['🛏 King Bed', '📶 WiFi', '🌿 Taman Pribadi', '🎭 Tur Gratis'], badge: '🏛 Heritage', badgeClass: 'early-bird', featured: true, status: 'available' }
    ]
  }
]

function parseCity(location = '') {
  const parts = location.split(',').map(part => part.trim()).filter(Boolean)
  return parts.at(-1) || 'Indonesia'
}

function cloneRoom(room, hotelId, hotelName, index, fallbackRoomId) {
  return {
    ...room,
    id: room.id ?? fallbackRoomId ?? index + 1,
    id_list_kamar: room.id_list_kamar ?? fallbackRoomId ?? index + 1,
    hotelId,
    hotelName,
    status: room.status === 'available' || room.status === 'AVAILABLE' ? 'available' : 'available'
  }
}

function mapPresetHotel(row, index = 0) {
  // Ambil dummy hanya sebagai fallback
  const fallbackPreset = HOTEL_PRESETS[index % HOTEL_PRESETS.length]
  const hotelName = row.hotel_name || `Hotel ${index + 1}`
  const address = row.location || ''

  return {
    id: row.id_list_hotel,
    companyId: row.id_company_profile,
    name: hotelName,
    city: parseCity(address),
    address,
    description: row.description || fallbackPreset.description,
    image: row.image || fallbackPreset.image,
    rating: row.rating ?? fallbackPreset.rating,
    reviewCount: row.reviewCount ?? fallbackPreset.reviewCount,
    priceFrom: row.priceFrom ?? fallbackPreset.priceFrom,
    stars: row.stars ?? fallbackPreset.stars,
    amenities: row.amenities?.length ? [...row.amenities] : [...fallbackPreset.amenities],
    rooms: row.rooms?.length ? row.rooms.map((room, roomIndex) => cloneRoom(room, row.id_list_hotel, hotelName, roomIndex)) : fallbackPreset.rooms.map((room, roomIndex) => cloneRoom(room, row.id_list_hotel, hotelName, roomIndex)),
    contactPerson: row.contact_person,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone
  }
}

function mapRoom(row, index, hotelId, hotelName) {
  // Gunakan dummy hanya untuk fallback
  const fallbackPreset = HOTEL_PRESETS[0]
  const facility = typeof row.facility === 'string'
    ? row.facility.split(',').map(item => item.trim()).filter(Boolean)
    : []

  return {
    id: row.id_list_kamar,
    id_list_kamar: row.id_list_kamar,
    name: row.type_room,
    price: Number(row.price) || 0,
    capacity: Number(row.capacity) || 0,
    image: row.image || fallbackPreset.rooms[0]?.image || fallbackPreset.image,
    description: row.description || fallbackPreset.description,
    amenities: facility.length > 0 ? facility : [...(fallbackPreset.rooms[0]?.amenities || [])],
    badge: row.badge || fallbackPreset.rooms[0]?.badge || null,
    badgeClass: row.badgeClass || fallbackPreset.rooms[0]?.badgeClass || '',
    featured: index === 0,
    status: row.status === 'available' ? 'available' : 'unavailable',
    hotelId,
    hotelName
  }
}

export const useHotelStore = defineStore('hotel', () => {
  const hotels = ref([])
  const ratings = ref(JSON.parse(localStorage.getItem('pabwRatings') || '[]'))
  const loadedHotelIds = ref(new Set())

  async function loadHotels(force = false) {
    if (hotels.value.length > 0 && !force) {
      return hotels.value
    }

    const response = await apiGet('/hotel/all')
    const rows = Array.isArray(response?.data) ? response.data : []
    hotels.value = rows.map((row, index) => mapPresetHotel(row, index))
    return hotels.value
  }

  async function loadHotelById(id) {
    const hotelId = parseInt(id)
    if (!hotelId) {
      return null
    }

    const hotelResponse = await apiGet(`/hotel/${hotelId}`)

    const hotelRow = hotelResponse?.data
    if (!hotelRow) {
      return null
    }

    const existingIndex = hotels.value.findIndex(hotel => hotel.id === hotelId)
    const fallbackHotel = mapPresetHotel(hotelRow, existingIndex >= 0 ? existingIndex : hotels.value.length)

    try {
      const roomsResponse = await apiGet(`/rooms/available?id_list_hotel=${hotelId}`)
      const roomRows = Array.isArray(roomsResponse?.data) ? roomsResponse.data : []
      fallbackHotel.rooms = roomRows.length > 0
        ? roomRows.map((room, index) => mapRoom(room, index, hotelId, fallbackHotel.name))
        : fallbackHotel.rooms
    } catch (error) {
      fallbackHotel.rooms = fallbackHotel.rooms
    }

    if (existingIndex >= 0) {
      hotels.value.splice(existingIndex, 1, fallbackHotel)
    } else {
      hotels.value.push(fallbackHotel)
    }

    loadedHotelIds.value.add(hotelId)
    return fallbackHotel
  }

  function getHotelById(id) {
    return hotels.value.find(h => h.id === parseInt(id))
  }

  function addRating(hotelId, userId, score, comment) {
    const existing = ratings.value.find(r => r.hotelId === hotelId && r.userId === userId)
    if (existing) {
      existing.score = score
      existing.comment = comment
      existing.date = new Date().toISOString()
    } else {
      ratings.value.push({ hotelId, userId, score, comment, date: new Date().toISOString() })
    }
    localStorage.setItem('pabwRatings', JSON.stringify(ratings.value))

    // Update hotel rating average
    const hotelRatings = ratings.value.filter(r => r.hotelId === hotelId)
    const avg = hotelRatings.reduce((sum, r) => sum + r.score, 0) / hotelRatings.length
    const hotel = hotels.value.find(h => h.id === hotelId)
    if (hotel) {
      hotel.rating = Math.round(avg * 10) / 10
      hotel.reviewCount = hotelRatings.length
    }
  }

  function getRatingByUser(hotelId, userId) {
    return ratings.value.find(r => r.hotelId === hotelId && r.userId === userId)
  }

  return { hotels, ratings, loadHotels, loadHotelById, getHotelById, addRating, getRatingByUser }
})