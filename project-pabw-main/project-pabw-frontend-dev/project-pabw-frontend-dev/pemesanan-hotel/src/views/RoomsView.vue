<template>
  <section class="rooms-page">
    <div class="container">
      <div class="section-header">
        <h2>Semua Kamar</h2>
        <p>Pilih kamar yang paling sesuai untuk Anda</p>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <label>Filter kapasitas:</label>
        <select v-model="capacityFilter" class="select-input">
          <option :value="0">Semua</option>
          <option :value="1">1+ Tamu</option>
          <option :value="2">2+ Tamu</option>
          <option :value="3">3+ Tamu</option>
          <option :value="4">4+ Tamu</option>
        </select>
      </div>

      <div class="rooms-grid">
        <RoomCard v-for="room in filteredRooms" :key="room.id" :room="room" />
      </div>
      <p v-if="filteredRooms.length === 0" class="no-rooms">Tidak ada kamar untuk kapasitas tersebut.</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import RoomCard from '@/components/RoomCard.vue'

const capacityFilter = ref(0)

const rooms = ref([
  {
    id: 1, name: 'Kamar Deluxe', price: 850000, capacity: 2,
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=400&fit=crop',
    description: 'Kamar nyaman dengan pemandangan kota.',
    badge: '🕐 Early Bird', badgeClass: 'early-bird', featured: false,
    amenities: ['🛏 King Bed', '📶 WiFi', '❄️ AC', '📺 Smart TV', '☕ Mini Bar', '🛁 Bathtub']
  },
  {
    id: 2, name: 'Suite Premium', price: 1500000, capacity: 3,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop',
    description: 'Suite mewah dengan jacuzzi dan ruang tamu.',
    badge: '🌟 Musiman', badgeClass: 'seasonal', featured: true,
    amenities: ['🛏 Super King Bed', '📶 WiFi', '❄️ AC', '📺 Smart TV', '🛁 Jacuzzi', '🍽 Sarapan']
  },
  {
    id: 3, name: 'Kamar Keluarga', price: 1200000, capacity: 4,
    image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&h=400&fit=crop',
    description: 'Kamar luas untuk keluarga.',
    badge: '💎 Loyalitas', badgeClass: 'loyalty', featured: false,
    amenities: ['🛏 2 Tempat Tidur', '📶 WiFi', '❄️ AC', '📺 Smart TV', '☕ Mini Bar', '🛁 Bathtub']
  }
])

const filteredRooms = computed(() =>
  capacityFilter.value === 0 ? rooms.value : rooms.value.filter(r => r.capacity >= capacityFilter.value)
)
</script>

<style scoped>
.rooms-page { padding: 4rem 0; }

.section-header { text-align: center; margin-bottom: 2rem; }
.section-header h2 { font-size: 2.5rem; color: var(--primary); margin-bottom: 0.5rem; }
.section-header p  { font-size: 1.1rem; color: var(--text-light); }

.filter-bar {
  display: flex; align-items: center; gap: 1rem;
  margin-bottom: 2rem; justify-content: flex-end;
}

.filter-bar label { font-weight: 600; color: var(--text-dark); }

.select-input {
  padding: 10px 16px; border: 2px solid var(--border);
  border-radius: 8px; font-size: 1rem;
  transition: all 0.3s ease; background: white;
}

.select-input:focus {
  outline: none; border-color: var(--accent);
  box-shadow: 0 0 0 4px rgba(201,132,58,0.12);
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.no-rooms { text-align: center; color: var(--text-light); padding: 2rem; font-size: 1.1rem; }

@media (max-width: 768px) {
  .rooms-grid { grid-template-columns: 1fr; }
  .filter-bar { justify-content: flex-start; }
}
</style>