import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHotelStore = defineStore('hotel', () => {
  const hotels = ref([
    {
      id: 1,
      name: 'Grand Kalimantan Hotel',
      city: 'Balikpapan',
      address: 'Jl. Sudirman No. 45, Balikpapan',
      description: 'Hotel bintang 5 dengan pemandangan Teluk Balikpapan yang menakjubkan. Dilengkapi fasilitas kolam renang infinity, spa kelas dunia, dan restoran fine dining.',
      image: '/images/hotel-1.jpg',
      rating: 4.8,
      reviewCount: 234,
      priceFrom: 850000,
      stars: 5,
      amenities: ['🏊 Kolam Renang', '💆 Spa', '🍽 Restoran', '🏋 Gym', '🅿 Parkir', '🚐 Antar Jemput'],
      rooms: [
        { id: 1, name: 'Kamar Deluxe', price: 850000, capacity: 2, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', description: 'Kamar nyaman dengan pemandangan teluk.', amenities: ['🛏 King Bed', '📶 WiFi', '❄️ AC', '📺 Smart TV'], badge: '🕐 Early Bird', badgeClass: 'early-bird', featured: false, status: 'available' },
        { id: 2, name: 'Suite Premium', price: 1500000, capacity: 3, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop', description: 'Suite mewah dengan jacuzzi dan ruang tamu.', amenities: ['🛏 Super King', '📶 WiFi', '🛁 Jacuzzi', '🍽 Sarapan'], badge: '⭐ Unggulan', badgeClass: 'seasonal', featured: true, status: 'available' }
      ]
    },
    {
      id: 2,
      name: 'Borneo Transit Hotel',
      city: 'Balikpapan',
      address: 'Jl. MT Haryono No. 12, Balikpapan',
      description: 'Hotel transit nyaman dekat Bandara Sultan Aji Muhammad Sulaiman. Cocok untuk perjalanan bisnis dengan fasilitas meeting room modern.',
      image: '/images/hotel-2.jpg',
      rating: 4.3,
      reviewCount: 187,
      priceFrom: 450000,
      stars: 3,
      amenities: ['📶 WiFi', '☕ Sarapan', '🚐 Antar Jemput Bandara', '🅿 Parkir'],
      rooms: [
        { id: 3, name: 'Kamar Standard', price: 450000, capacity: 2, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', description: 'Kamar bersih dan nyaman untuk transit.', amenities: ['🛏 Queen Bed', '📶 WiFi', '❄️ AC', '📺 TV'], badge: null, badgeClass: '', featured: false, status: 'available' },
        { id: 4, name: 'Kamar Keluarga', price: 750000, capacity: 4, image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=400&fit=crop', description: 'Kamar luas untuk keluarga.', amenities: ['🛏 2 Tempat Tidur', '📶 WiFi', '❄️ AC', '☕ Mini Bar'], badge: '💎 Hemat', badgeClass: 'loyalty', featured: false, status: 'available' }
      ]
    },
    {
      id: 3,
      name: 'Samarinda River View',
      city: 'Samarinda',
      address: 'Jl. Cendana No. 88, Samarinda',
      description: 'Hotel tepi sungai Mahakam dengan arsitektur khas Dayak modern. Nikmati sunset di restoran terapung kami yang ikonik.',
      image: '/images/hotel-3.jpg',
      rating: 4.6,
      reviewCount: 156,
      priceFrom: 620000,
      stars: 4,
      amenities: ['🏊 Kolam Renang', '🍽 Restoran Terapung', '💆 Spa', '🅿 Parkir'],
      rooms: [
        { id: 5, name: 'Kamar River View', price: 620000, capacity: 2, image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop', description: 'Kamar dengan pemandangan langsung ke Sungai Mahakam.', amenities: ['🛏 King Bed', '📶 WiFi', '❄️ AC', '🌅 View Sungai'], badge: '🌟 Populer', badgeClass: 'seasonal', featured: true, status: 'available' }
      ]
    },
    {
      id: 4,
      name: 'Kutai Heritage Resort',
      city: 'Tenggarong',
      address: 'Jl. Mulawarman No. 5, Tenggarong',
      description: 'Resort warisan budaya Kutai dengan sentuhan tradisional dan modern. Berlokasi dekat Museum Mulawarman dan Danau Semayang.',
      image: '/images/hotel-4.jpg',
      rating: 4.5,
      reviewCount: 98,
      priceFrom: 550000,
      stars: 4,
      amenities: ['🏊 Kolam Renang', '🌿 Tur Budaya', '🍽 Restoran', '🎭 Pertunjukan Seni'],
      rooms: [
        { id: 6, name: 'Villa Heritage', price: 1100000, capacity: 3, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop', description: 'Villa dengan dekorasi adat Kutai yang autentik.', amenities: ['🛏 King Bed', '📶 WiFi', '🌿 Taman Pribadi', '🎭 Tur Gratis'], badge: '🏛 Heritage', badgeClass: 'early-bird', featured: true, status: 'available' }
      ]
    }
  ])

  const ratings = ref(JSON.parse(localStorage.getItem('pabwRatings') || '[]'))

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

  return { hotels, ratings, getHotelById, addRating, getRatingByUser }
})