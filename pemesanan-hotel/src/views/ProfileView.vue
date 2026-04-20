<template>
  <section class="profile-page">
    <div class="container">
      <div class="profile-layout">

        <!-- Sidebar -->
        <aside class="profile-sidebar">
          <div class="avatar-circle">{{ auth.user?.name?.charAt(0) }}</div>
          <h3>{{ auth.user?.name }}</h3>
          <p>{{ auth.user?.email }}</p>
          <p class="join-date">Bergabung: {{ formatDate(auth.user?.joinDate) }}</p>
          <div class="sidebar-menu">
            <button :class="{ active: tab === 'profile' }" @click="tab = 'profile'">👤 Profil</button>
            <button :class="{ active: tab === 'password' }" @click="tab = 'password'">🔒 Password</button>
          </div>
        </aside>

        <!-- Konten -->
        <div class="profile-content">

          <!-- Edit Profil -->
          <div v-if="tab === 'profile'" class="content-card">
            <h2>Edit Profil</h2>
            <form @submit.prevent="saveProfile" class="profile-form">
              <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" v-model="profileForm.name" required />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" v-model="profileForm.email" required />
              </div>
              <div class="form-group">
                <label>No. Telepon</label>
                <input type="tel" v-model="profileForm.phone" />
              </div>
              <p v-if="profileSuccess" class="success-msg">✅ Profil berhasil diperbarui!</p>
              <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
            </form>
          </div>

          <!-- Ubah Password -->
          <div v-else class="content-card">
            <h2>Ubah Password</h2>
            <form @submit.prevent="savePassword" class="profile-form">
              <div class="form-group">
                <label>Password Lama</label>
                <input type="password" v-model="passForm.old" required placeholder="Password saat ini" />
              </div>
              <div class="form-group">
                <label>Password Baru</label>
                <input type="password" v-model="passForm.new" required placeholder="Min. 6 karakter" minlength="6" />
              </div>
              <div class="form-group">
                <label>Konfirmasi Password Baru</label>
                <input type="password" v-model="passForm.confirm" required placeholder="Ulangi password baru" />
              </div>
              <p v-if="passError" class="error-msg">{{ passError }}</p>
              <p v-if="passSuccess" class="success-msg">✅ Password berhasil diubah!</p>
              <button type="submit" class="btn btn-primary">Ubah Password</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const tab = ref('profile')
const profileSuccess = ref(false)
const passError = ref('')
const passSuccess = ref(false)

const profileForm = reactive({ name: '', email: '', phone: '' })
const passForm = reactive({ old: '', new: '', confirm: '' })

onMounted(() => {
  profileForm.name  = auth.user?.name  || ''
  profileForm.email = auth.user?.email || ''
  profileForm.phone = auth.user?.phone || ''
})

function saveProfile() {
  auth.updateProfile({ name: profileForm.name, email: profileForm.email, phone: profileForm.phone })
  profileSuccess.value = true
  setTimeout(() => profileSuccess.value = false, 3000)
}

function savePassword() {
  passError.value = ''
  if (passForm.new !== passForm.confirm) { passError.value = 'Password baru tidak cocok.'; return }
  // Di implementasi nyata: verifikasi ke API
  passSuccess.value = true
  Object.assign(passForm, { old: '', new: '', confirm: '' })
  setTimeout(() => passSuccess.value = false, 3000)
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<style scoped>
.profile-page { padding: 3rem 0; }

.profile-layout { display: grid; grid-template-columns: 260px 1fr; gap: 2.5rem; align-items: start; }

.profile-sidebar {
  background: white; border-radius: 16px; padding: 2rem;
  box-shadow: var(--shadow); text-align: center; position: sticky; top: 90px;
}

.avatar-circle {
  width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 1rem;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white; font-size: 2rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}

.profile-sidebar h3 { color: var(--primary); font-size: 1.2rem; margin-bottom: 0.3rem; }
.profile-sidebar p  { color: var(--text-light); font-size: 0.88rem; }
.join-date { margin-top: 0.3rem; }

.sidebar-menu { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1.5rem; }

.sidebar-menu button {
  padding: 0.75rem 1rem; border: none; background: var(--navy-50);
  border-radius: 10px; cursor: pointer; text-align: left;
  font-size: 0.95rem; color: var(--text-dark); font-weight: 600;
  transition: all 0.2s ease;
}

.sidebar-menu button:hover  { background: var(--navy-50); color: var(--accent); }
.sidebar-menu button.active { background: var(--primary); color: white; }

.content-card {
  background: white; border-radius: 16px; padding: 2rem; box-shadow: var(--shadow);
  border-top: 4px solid var(--accent);
}

.content-card h2 { color: var(--primary); margin-bottom: 1.5rem; font-size: 1.4rem; }

.profile-form { display: flex; flex-direction: column; gap: 1.2rem; }

.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }
.form-group input {
  padding: 12px; border: 2px solid var(--border-color);
  border-radius: 8px; font-size: 1rem; font-family: inherit; transition: all 0.3s ease;
}
.form-group input:focus { outline: none; border-color: var(--accent-color); box-shadow: 0 0 0 4px rgba(0,180,216,0.12); }

.success-msg { color: var(--success-color); background: #f0fdf4; padding: 0.7rem; border-radius: 8px; font-size: 0.9rem; }
.error-msg   { color: #e74c3c; background: #fdf0f0; padding: 0.7rem; border-radius: 8px; font-size: 0.9rem; }

@media (max-width: 768px) {
  .profile-layout { grid-template-columns: 1fr; }
  .profile-sidebar { position: static; }
}
</style>