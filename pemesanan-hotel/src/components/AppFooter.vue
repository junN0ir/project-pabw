<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">
          <h3>PABW<span>Hotels</span></h3>
          <p class="brand-desc">Platform pemesanan hotel terpercaya di Kalimantan. Menghubungkan traveler dengan hotel-hotel terbaik pilihan.</p>
          <div class="brand-contact">
            <p>📞 +62 21 1234 5678</p>
            <p>✉️ info@pabwhotels.com</p>
            <p>📍 Balikpapan, Kalimantan Timur</p>
          </div>
        </div>

        <div class="footer-col">
          <h4>Navigasi</h4>
          <RouterLink to="/">Beranda</RouterLink>
          <RouterLink to="/hotels">Daftar Hotel</RouterLink>
          <RouterLink to="/reservations" v-if="auth.isLoggedIn">Reservasi Saya</RouterLink>
          <RouterLink to="/profile" v-if="auth.isLoggedIn">Profil</RouterLink>
          <RouterLink to="/login" v-else>Masuk / Daftar</RouterLink>
        </div>

        <div class="footer-col">
          <h4>Destinasi</h4>
          <a href="/hotels?city=Balikpapan">Balikpapan</a>
          <a href="/hotels?city=Samarinda">Samarinda</a>
          <a href="/hotels?city=Tenggarong">Tenggarong</a>
        </div>

        <div class="footer-col">
          <h4>Bantuan</h4>
          <a href="#">Syarat & Ketentuan</a>
          <a href="#">Kebijakan Privasi</a>
          <a href="#">FAQ</a>
          <a href="#">Hubungi Kami</a>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; {{ year }} PABW Hotels. Hak cipta dilindungi.</p>
        <p class="footer-tagline">Dibuat untuk kemudahan perjalanan Anda</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
const year = new Date().getFullYear()
</script>

<style scoped>
.footer {
  background: var(--navy-900);
  color: white; padding: 3.5rem 0 1.5rem; margin-top: 4rem;
}

.footer-content {
  display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2.5rem; margin-bottom: 2rem;
}

.footer-brand h3 { color: var(--accent); margin-bottom: 1rem; font-size: 1.3rem; }
.footer-brand p { margin-bottom: 0.4rem; opacity: 0.85; font-size: 0.9rem; }

.footer-col h4 { margin-bottom: 1rem; color: rgba(255,255,255,0.9); }

.footer-col a {
  display: block; color: white;
  text-decoration: none; margin-bottom: 0.6rem; font-size: 0.9rem;
  transition: all 0.3s ease;
}

.footer-col a:hover { color: var(--accent); transform: translateX(6px); }

.footer-contact { margin-top: 0.8rem; }

.footer-bottom {
  text-align: center; padding-top: 2rem;
  border-top: 1px solid rgba(255,255,255,0.15);
  opacity: 0.75;
}

.footer-tagline { font-size: 0.82rem; margin-top: 0.3rem; }

@media (max-width: 900px) {
  .footer-content { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 500px) {
  .footer-content { grid-template-columns: 1fr; }
}
</style>