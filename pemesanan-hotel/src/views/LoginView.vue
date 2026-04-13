<template>
  <section class="auth-page">
    <div class="auth-card">
      <!-- Tab -->
      <div class="auth-tabs">
        <button :class="['tab', { active: mode === 'login' }]" @click="mode = 'login'">Masuk</button>
        <button :class="['tab', { active: mode === 'register' }]" @click="mode = 'register'">Daftar</button>
      </div>

      <!-- Login -->
      <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="auth-form">
        <div class="auth-header">
          <h2>Selamat Datang Kembali</h2>
          <p>Masuk untuk mengakses reservasi Anda</p>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" v-model="loginForm.email" placeholder="email@contoh.com" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <div class="input-password">
            <input :type="showPass ? 'text' : 'password'" v-model="loginForm.password" placeholder="Password" required />
            <button type="button" class="toggle-pass" @click="showPass = !showPass">{{ showPass ? '🙈' : '👁' }}</button>
          </div>
        </div>
        <div class="form-row-end">
          <button type="button" class="link-btn" @click="mode = 'forgot'">Lupa password?</button>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </button>
        <p class="demo-hint">💡 Demo: <strong>budi@email.com</strong> / <strong>password123</strong></p>
      </form>

      <!-- Register -->
      <form v-else-if="mode === 'register'" @submit.prevent="handleRegister" class="auth-form">
        <div class="auth-header">
          <h2>Buat Akun Baru</h2>
          <p>Gratis dan mudah, mulai pesan hotel sekarang</p>
        </div>
        <div class="form-group">
          <label>Nama Lengkap</label>
          <input type="text" v-model="regForm.name" placeholder="John Doe" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" v-model="regForm.email" placeholder="email@contoh.com" required />
        </div>
        <div class="form-group">
          <label>No. Telepon</label>
          <input type="tel" v-model="regForm.phone" placeholder="+62 812 3456 7890" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" v-model="regForm.password" placeholder="Min. 6 karakter" required minlength="6" />
        </div>
        <div class="form-group">
          <label>Konfirmasi Password</label>
          <input type="password" v-model="regForm.confirm" placeholder="Ulangi password" required />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? 'Memproses...' : 'Buat Akun' }}
        </button>
      </form>

      <!-- Forgot Password -->
      <div v-else class="auth-form">
        <div class="auth-header">
          <h2>Reset Password</h2>
          <p>Masukkan email Anda untuk menerima link reset</p>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" v-model="forgotEmail" placeholder="email@contoh.com" />
        </div>
        <button class="btn btn-primary btn-full" @click="handleForgot">Kirim Link Reset</button>
        <p v-if="forgotSuccess" class="success-msg">✅ Link reset telah dikirim ke email Anda.</p>
        <button class="link-btn" @click="mode = 'login'">← Kembali ke Login</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mode = ref('login')
const error = ref('')
const loading = ref(false)
const showPass = ref(false)
const forgotEmail = ref('')
const forgotSuccess = ref(false)

const loginForm = ref({ email: '', password: '' })
const regForm = ref({ name: '', email: '', phone: '', password: '', confirm: '' })

async function handleLogin() {
  error.value = ''; loading.value = true
  await new Promise(r => setTimeout(r, 600)) // simulasi API
  const result = auth.login(loginForm.value.email, loginForm.value.password)
  loading.value = false
  if (result.success) {
    router.push(route.query.redirect || '/')
  } else {
    error.value = result.message
  }
}

async function handleRegister() {
  error.value = ''
  if (regForm.value.password !== regForm.value.confirm) {
    error.value = 'Password tidak cocok.'; return
  }
  loading.value = true
  await new Promise(r => setTimeout(r, 600))
  const result = auth.register(regForm.value.name, regForm.value.email, regForm.value.password, regForm.value.phone)
  loading.value = false
  if (result.success) {
    router.push('/')
  } else {
    error.value = result.message
  }
}

function handleForgot() {
  if (!forgotEmail.value) return
  forgotSuccess.value = true
}
</script>

<style scoped>
.auth-page {
  min-height: calc(100vh - 130px);
  display: flex; align-items: center; justify-content: center;
  padding: 2rem; background: var(--bg-light);
}

.auth-card {
  background: white; border-radius: 20px; width: 100%; max-width: 460px;
  box-shadow: var(--shadow-lg); overflow: hidden;
  border-top: 4px solid var(--accent-color);
}

.auth-tabs { display: flex; }

.tab {
  flex: 1; padding: 1rem; border: none; background: var(--bg-light);
  font-size: 1rem; font-weight: 600; cursor: pointer;
  color: var(--text-light); transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
}

.tab.active { background: white; color: var(--primary-color); border-bottom-color: var(--accent-color); }

.auth-form { padding: 2rem; display: flex; flex-direction: column; gap: 1.2rem; }

.auth-header { text-align: center; margin-bottom: 0.5rem; }
.auth-header h2 { color: var(--primary-color); font-size: 1.5rem; margin-bottom: 0.3rem; }
.auth-header p  { color: var(--text-light); font-size: 0.9rem; }

.form-group { display: flex; flex-direction: column; gap: 0.4rem; }

.form-group label { font-weight: 600; color: var(--text-dark); font-size: 0.9rem; }

.form-group input {
  padding: 12px; border: 2px solid var(--border-color);
  border-radius: 8px; font-size: 1rem; font-family: inherit;
  transition: all 0.3s ease;
}

.form-group input:focus { outline: none; border-color: var(--accent-color); box-shadow: 0 0 0 4px rgba(0,180,216,0.12); }

.input-password { position: relative; }
.input-password input { width: 100%; padding-right: 50px; }
.toggle-pass { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.1rem; }

.form-row-end { display: flex; justify-content: flex-end; }

.link-btn { background: none; border: none; cursor: pointer; color: var(--accent-color); font-size: 0.9rem; text-decoration: underline; padding: 0; }

.error-msg { color: #e74c3c; font-size: 0.9rem; text-align: center; background: #fdf0f0; padding: 0.7rem; border-radius: 8px; }

.success-msg { color: var(--success-color); font-size: 0.9rem; text-align: center; background: #f0fdf4; padding: 0.7rem; border-radius: 8px; }

.demo-hint { text-align: center; font-size: 0.82rem; color: var(--text-light); background: var(--bg-light); padding: 0.7rem; border-radius: 8px; }

button:disabled { opacity: 0.6; cursor: not-allowed; }
</style>