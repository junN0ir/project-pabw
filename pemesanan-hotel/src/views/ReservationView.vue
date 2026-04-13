<template>
  <section class="reservation-page">
    <div class="container">
      <div class="page-header">
        <h1>Reservasi Saya</h1>
        <p>Halo, <strong>{{ auth.user?.name }}</strong> — berikut riwayat pemesanan Anda</p>
      </div>

      <div v-if="myBookings.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <h3>Belum Ada Reservasi</h3>
        <p>Anda belum pernah melakukan pemesanan.</p>
        <RouterLink to="/hotels" class="btn btn-primary">Cari Hotel Sekarang</RouterLink>
      </div>

      <div class="booking-list" v-else>
        <div
          class="booking-card"
          v-for="(b, i) in myBookings"
          :key="i"
          :class="statusClass(b)"
        >
          <div class="booking-card-header">
            <div>
              <span class="booking-ref">REF: PABW{{ (i + 1).toString().padStart(6,'0') }}</span>
              <h3>{{ b.room }}</h3>
              <p class="booking-hotel" v-if="b.hotelName">🏨 {{ b.hotelName }}</p>
            </div>
            <span :class="['status-badge', statusClass(b)]">{{ statusLabel(b) }}</span>
          </div>

          <div class="booking-card-body">
            <div class="booking-dates">
              <div class="date-block">
                <span class="date-label">CHECK-IN</span>
                <span class="date-value">{{ formatDate(b.checkin) }}</span>
              </div>
              <div class="date-divider">→</div>
              <div class="date-block">
                <span class="date-label">CHECK-OUT</span>
                <span class="date-value">{{ formatDate(b.checkout) }}</span>
              </div>
            </div>
            <div class="booking-meta-grid">
              <span>🌙 {{ b.nights }} malam</span>
              <span>👥 {{ b.guests }} tamu</span>
              <span v-if="b.discountAmount > 0" style="color: var(--success-color)">🎉 {{ b.discount }}</span>
            </div>
          </div>

          <div class="booking-card-footer">
            <div class="booking-total">
              <span>Total Pembayaran</span>
              <strong>{{ bookingStore.formatCurrency(b.total) }}</strong>
            </div>
            <RouterLink :to="`/hotels/${b.hotelId}`" v-if="b.hotelId" class="btn btn-secondary btn-sm">
              Beri Rating
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBookingStore } from '@/stores/booking'

const auth = useAuthStore()
const bookingStore = useBookingStore()

const myBookings = computed(() =>
  [...bookingStore.getBookingsByUser(auth.user?.id)].reverse()
)

function formatDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusClass(b) {
  const checkout = new Date(b.checkout)
  const now = new Date()
  const checkin = new Date(b.checkin)
  if (now < checkin) return 'upcoming'
  if (now > checkout) return 'completed'
  return 'ongoing'
}

function statusLabel(b) {
  const s = statusClass(b)
  return { upcoming: '🔜 Akan Datang', ongoing: '✅ Sedang Berlangsung', completed: '🏁 Selesai' }[s]
}
</script>

<style scoped>
.reservation-page { padding: 3rem 0; }

.page-header { margin-bottom: 2.5rem; }
.page-header h1 { font-size: 2rem; color: var(--primary-color); margin-bottom: 0.3rem; }
.page-header p  { color: var(--text-light); }

.empty-state {
  text-align: center; padding: 5rem 2rem;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
}
.empty-icon { font-size: 4rem; }
.empty-state h3 { font-size: 1.5rem; color: var(--primary-color); }
.empty-state p { color: var(--text-light); }

.booking-list { display: flex; flex-direction: column; gap: 1.5rem; }

.booking-card {
  background: white; border-radius: 16px; overflow: hidden;
  box-shadow: var(--shadow); border-left: 5px solid var(--border-color);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.booking-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }

.booking-card.upcoming  { border-left-color: var(--accent-color); }
.booking-card.ongoing   { border-left-color: var(--success-color); }
.booking-card.completed { border-left-color: var(--text-light); }

.booking-card-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 1.3rem 1.5rem; border-bottom: 1px solid var(--border-color);
}

.booking-ref { font-size: 0.75rem; color: var(--text-light); font-weight: 600; letter-spacing: 1px; display: block; margin-bottom: 0.3rem; }

.booking-card-header h3 { font-size: 1.2rem; color: var(--primary-color); }

.booking-hotel { color: var(--text-light); font-size: 0.88rem; margin-top: 0.2rem; }

.status-badge {
  padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; white-space: nowrap;
}
.status-badge.upcoming  { background: #e8f8fd; color: #0077b6; }
.status-badge.ongoing   { background: #eafaf1; color: var(--success-color); }
.status-badge.completed { background: var(--bg-light); color: var(--text-light); }

.booking-card-body { padding: 1.3rem 1.5rem; }

.booking-dates { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }

.date-block { display: flex; flex-direction: column; gap: 0.2rem; }

.date-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 1px; color: var(--text-light); }

.date-value { font-size: 0.95rem; font-weight: 700; color: var(--primary-color); }

.date-divider { color: var(--accent-color); font-size: 1.3rem; font-weight: 300; }

.booking-meta-grid { display: flex; gap: 1.5rem; flex-wrap: wrap; color: var(--text-dark); font-size: 0.9rem; }

.booking-card-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.5rem; background: var(--bg-light);
}

.booking-total { display: flex; flex-direction: column; gap: 0.1rem; }
.booking-total span  { font-size: 0.8rem; color: var(--text-light); }
.booking-total strong { font-size: 1.15rem; color: var(--primary-color); }

.btn-sm { padding: 8px 16px; font-size: 0.85rem; border-radius: 8px; text-decoration: none; }

@media (max-width: 600px) {
  .booking-card-header { flex-direction: column; gap: 0.8rem; }
  .booking-dates { flex-direction: column; align-items: flex-start; }
  .date-divider { transform: rotate(90deg); }
  .booking-card-footer { flex-direction: column; align-items: flex-start; gap: 1rem; }
}
</style>