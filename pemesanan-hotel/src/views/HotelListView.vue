<template>
  <section class="hotel-list-page">
    <div class="container">
      <div class="page-header">
        <h1>Semua Hotel Mitra</h1>
        <p>{{ filtered.length }} hotel ditemukan</p>
      </div>

      <!-- Filter -->
      <div class="filter-panel">
        <div class="filter-group">
          <label>🏙 Kota</label>
          <select v-model="filter.city" class="select-input">
            <option value="">Semua Kota</option>
            <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>⭐ Bintang</label>
          <select v-model="filter.stars" class="select-input">
            <option :value="0">Semua</option>
            <option :value="3">3 Bintang</option>
            <option :value="4">4 Bintang</option>
            <option :value="5">5 Bintang</option>
          </select>
        </div>
        <div class="filter-group">
          <label>💰 Urutkan</label>
          <select v-model="filter.sort" class="select-input">
            <option value="rating">Rating Tertinggi</option>
            <option value="price_asc">Harga Termurah</option>
            <option value="price_desc">Harga Termahal</option>
          </select>
        </div>
        <button class="btn btn-secondary" @click="resetFilter">Reset</button>
      </div>

      <!-- Grid -->
      <div class="hotels-grid" v-if="filtered.length > 0">
        <HotelCard v-for="hotel in filtered" :key="hotel.id" :hotel="hotel" />
      </div>
      <div class="empty-state" v-else>
        <p>😕 Tidak ada hotel yang cocok dengan filter Anda.</p>
        <button class="btn btn-primary" @click="resetFilter">Reset Filter</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHotelStore } from '@/stores/hotel'
import HotelCard from '@/components/HotelCard.vue'

const hotelStore = useHotelStore()
const route = useRoute()

const filter = ref({ city: '', stars: 0, sort: 'rating' })

onMounted(() => {
  if (route.query.city) filter.value.city = route.query.city
})

const cities = computed(() => [...new Set(hotelStore.hotels.map(h => h.city))])

const filtered = computed(() => {
  let list = [...hotelStore.hotels]
  if (filter.value.city) list = list.filter(h => h.city === filter.value.city)
  if (filter.value.stars) list = list.filter(h => h.stars === filter.value.stars)
  if (filter.value.sort === 'rating') list.sort((a,b) => b.rating - a.rating)
  else if (filter.value.sort === 'price_asc') list.sort((a,b) => a.priceFrom - b.priceFrom)
  else if (filter.value.sort === 'price_desc') list.sort((a,b) => b.priceFrom - a.priceFrom)
  return list
})

function resetFilter() { filter.value = { city: '', stars: 0, sort: 'rating' } }
</script>

<style scoped>
.hotel-list-page { padding: 3rem 0; }

.page-header { margin-bottom: 2rem; }
.page-header h1 { font-size: 2rem; color: var(--primary); }
.page-header p  { color: var(--text-light); }

.filter-panel {
  display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;
  background: white; padding: 1.5rem; border-radius: 12px;
  box-shadow: var(--shadow); margin-bottom: 2.5rem;
}

.filter-group { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 140px; }

.filter-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }

.select-input {
  padding: 10px 12px; border: 2px solid var(--border);
  border-radius: 8px; font-size: 0.95rem; background: white; transition: all 0.3s ease;
}

.select-input:focus { outline: none; border-color: var(--accent-color); box-shadow: 0 0 0 4px rgba(0,180,216,0.12); }

.hotels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }

.empty-state { text-align: center; padding: 4rem; color: var(--text-light); }
.empty-state p { font-size: 1.1rem; margin-bottom: 1.5rem; }

@media (max-width: 768px) {
  .filter-panel { flex-direction: column; }
  .filter-group { min-width: 100%; }
  .hotels-grid { grid-template-columns: 1fr; }
}
</style>