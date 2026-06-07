<template>
  <section class="auth-page">
    <div class="auth-card">
      <div class="auth-tabs">
        <button
          :class="['tab', { active: mode === 'login' }]"
          @click="switchMode('login')"
        >
          Masuk
        </button>

        <button
          :class="['tab', { active: mode === 'register' }]"
          @click="switchMode('register')"
        >
          Daftar
        </button>
      </div>

      <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="auth-form">
        <div class="auth-header">
          <h2>Selamat Datang Kembali</h2>
          <p>Masuk untuk melakukan reservasi</p>
        </div>

        <div class="form-group">
          <label>Email atau ID Mitra</label>
          <input
            type="text"
            v-model="loginForm.email"
            placeholder="email@contoh.com atau ID Mitra"
            required
          />
        </div>

        <div class="form-group">
          <label>Password</label>

          <div class="input-password">
            <input
              :type="showLoginPassword ? 'text' : 'password'"
              v-model="loginForm.password"
              placeholder="Password"
              required
            />

            <button
              type="button"
              class="toggle-pass"
              @click="showLoginPassword = !showLoginPassword"
            >
              {{ showLoginPassword ? '🙈' : '👁' }}
            </button>
          </div>
        </div>

        <div class="form-row-end">
          <button type="button" class="link-btn" @click="switchMode('forgot')">
            Lupa password?
          </button>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? 'Memproses...' : 'Masuk' }}
        </button>
      </form>

      <form v-else-if="mode === 'register'" @submit.prevent="handleRegister" class="auth-form">
        <div class="auth-header">
          <h2>Buat Akun Baru</h2>
        </div>

        <div class="form-group">
          <label>Nama Lengkap</label>
          <input
            type="text"
            v-model="regForm.name"
            placeholder="Nama lengkap"
            required
          />
        </div>

        <div class="form-group">
          <label>Email</label>
          <input
            type="email"
            v-model="regForm.email"
            placeholder="email@contoh.com"
            required
          />
        </div>

        <div class="form-group">
          <label>No. Telepon</label>
          <input
            type="tel"
            v-model="regForm.phone"
            placeholder="0812 3456 7890"
            required
          />
        </div>

        <div class="form-group">
          <label>Password</label>

          <div class="input-password">
            <input
              :type="showRegisterPassword ? 'text' : 'password'"
              v-model="regForm.password"
              placeholder="Minimal 6 karakter"
              required
              minlength="6"
            />

            <button
              type="button"
              class="toggle-pass"
              @click="showRegisterPassword = !showRegisterPassword"
            >
              {{ showRegisterPassword ? '🙈' : '👁' }}
            </button>
          </div>

          <div v-if="regForm.password.length > 0" class="password-strength">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="passwordStrength.className"
                :style="{ width: passwordStrength.percent + '%' }"
              ></div>
            </div>

            <p :class="['strength-text', passwordStrength.className]">
              {{ passwordStrength.label }}
            </p>
          </div>
        </div>

        <div class="form-group">
          <label>Konfirmasi Password</label>

          <div class="input-password">
            <input
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="regForm.confirm"
              placeholder="Ulangi password"
              required
              :class="{
                'input-error': passwordMismatch,
                'input-success': passwordMatched
              }"
            />

            <button
              type="button"
              class="toggle-pass"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              {{ showConfirmPassword ? '🙈' : '👁' }}
            </button>
          </div>

          <p
            v-if="confirmPasswordMessage"
            :class="passwordMismatch ? 'field-error' : 'field-success'"
          >
            {{ confirmPasswordMessage }}
          </p>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>

        <button
          type="submit"
          class="btn btn-primary btn-full"
          :disabled="loading || passwordMismatch"
        >
          {{ loading ? 'Mengirim OTP...' : 'Submit' }}
        </button>
      </form>

      <form v-else-if="mode === 'verify'" @submit.prevent="handleVerifyEmail" class="auth-form">
        <div class="auth-header">
          <h2>Verifikasi Email</h2>
          <p>Kode OTP sudah dikirim ke {{ verificationEmail }}</p>
        </div>

        <div class="form-group">
          <label>Kode OTP</label>
          <input
            type="text"
            v-model="otpForm.otp"
            placeholder="Masukkan 6 digit OTP"
            maxlength="6"
            required
          />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>

        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? 'Memverifikasi...' : 'Verifikasi Email' }}
        </button>

        <button type="button" class="link-btn" @click="handleResendOtp" :disabled="loading">
          Kirim ulang OTP
        </button>

        <button type="button" class="link-btn" @click="switchMode('login')">
          Kembali ke Login
        </button>
      </form>

      <div v-else class="auth-form">
        <div class="auth-header">
          <h2>Reset Password</h2>
          <p>Masukkan email dan password baru</p>
        </div>

        <div class="form-group">
          <label>Email</label>
          <input
            type="email"
            v-model="forgotEmail"
            placeholder="email@contoh.com"
          />
        </div>

        <div class="form-group">
          <label>Password Baru</label>
          <input
            type="password"
            v-model="forgotPassword"
            placeholder="Minimal 6 karakter"
            minlength="6"
          />
        </div>

        <p v-if="forgotError" class="error-msg">{{ forgotError }}</p>
        <p v-if="forgotSuccess" class="success-msg">Password berhasil diperbarui.</p>

        <button class="btn btn-primary btn-full" @click="handleForgot">
          Reset Password
        </button>

        <button class="link-btn" @click="switchMode('login')">
          Kembali ke Login
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiPost } from '@/services/api'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const mode = ref('login')
const error = ref('')
const successMessage = ref('')
const loading = ref(false)
const showLoginPassword = ref(false)
const showRegisterPassword = ref(false)
const showConfirmPassword = ref(false)

const forgotEmail = ref('')
const forgotPassword = ref('')
const forgotSuccess = ref(false)
const forgotError = ref('')

const verificationEmail = ref('')

const loginForm = ref({
  email: '',
  password: ''
})

const regForm = ref({
  name: '',
  email: '',
  phone: '',
  password: '',
  confirm: ''
})

const passwordMismatch = computed(() => {
  return regForm.value.confirm.length > 0 &&
    regForm.value.password !== regForm.value.confirm
})

const passwordMatched = computed(() => {
  return regForm.value.confirm.length > 0 &&
    regForm.value.password === regForm.value.confirm
})

const confirmPasswordMessage = computed(() => {
  if (regForm.value.confirm.length === 0) {
    return ''
  }

  if (passwordMismatch.value) {
    return 'Konfirmasi password tidak sama.'
  }

  return 'Konfirmasi password sudah sesuai.'
})

const passwordStrength = computed(() => {
  const password = regForm.value.password

  let score = 0

  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (password.length === 0) {
    return {
      label: '',
      className: '',
      percent: 0
    }
  }

  if (score <= 2) {
    return {
      label: 'Password lemah',
      className: 'weak',
      percent: 33
    }
  }

  if (score <= 4) {
    return {
      label: 'Password sedang',
      className: 'medium',
      percent: 66
    }
  }

  return {
    label: 'Password kuat',
    className: 'strong',
    percent: 100
  }
})

const otpForm = ref({
  otp: ''
})

function switchMode(nextMode) {
  mode.value = nextMode
  error.value = ''
  successMessage.value = ''
  forgotError.value = ''
  forgotSuccess.value = false
}

function redirectAfterLogin() {
  const role = auth.user?.role

  if (role === 'mitra') {
    router.push('/mitra')
    return
  }

  if (role === 'admin') {
    router.push('/admin')
    return
  }

  router.push(route.query.redirect || '/')
}

async function handleLogin() {
  error.value = ''
  successMessage.value = ''
  loading.value = true

  const result = await auth.login(loginForm.value.email, loginForm.value.password)

  loading.value = false

  if (result.success) {
    redirectAfterLogin()
    return
  }

  if (result.payload?.requires_verification) {
    verificationEmail.value = result.payload.email || loginForm.value.email
    mode.value = 'verify'
  }

  error.value = result.message
}

async function handleRegister() {
  error.value = ''
  successMessage.value = ''

  if (regForm.value.password.length < 6) {
    error.value = 'Password minimal 6 karakter.'
    return
  }

  if (passwordMismatch.value || regForm.value.password !== regForm.value.confirm) {
    error.value = 'Konfirmasi password tidak sama.'
    return
  }

  loading.value = true

  const result = await auth.register(
    regForm.value.name,
    regForm.value.email,
    regForm.value.password,
    regForm.value.phone
  )

  loading.value = false

  if (result.success) {
    verificationEmail.value = result.email
    successMessage.value = 'Kode OTP sudah dikirim ke email.'
    mode.value = 'verify'
    return
  }

  error.value = result.message
}

async function handleVerifyEmail() {
  error.value = ''
  successMessage.value = ''

  if (!verificationEmail.value) {
    error.value = 'Email verifikasi tidak ditemukan. Silakan daftar ulang.'
    return
  }

  if (!otpForm.value.otp) {
    error.value = 'Kode OTP wajib diisi.'
    return
  }

  loading.value = true

  const result = await auth.verifyEmail(verificationEmail.value, otpForm.value.otp)

  loading.value = false

  if (result.success) {
    redirectAfterLogin()
    return
  }

  error.value = result.message
}

async function handleResendOtp() {
  error.value = ''
  successMessage.value = ''

  if (!verificationEmail.value) {
    error.value = 'Email verifikasi tidak ditemukan.'
    return
  }

  loading.value = true

  const result = await auth.resendVerification(verificationEmail.value)

  loading.value = false

  if (result.success) {
    successMessage.value = result.message || 'Kode OTP baru sudah dikirim.'
    return
  }

  error.value = result.message
}

async function handleForgot() {
  forgotError.value = ''
  forgotSuccess.value = false

  if (!forgotEmail.value || !forgotPassword.value) {
    forgotError.value = 'Email dan password baru wajib diisi.'
    return
  }

  try {
    await apiPost('/auth/forgot-password', {
      email: forgotEmail.value,
      new_password: forgotPassword.value,
      user_type: 'customer'
    })

    forgotSuccess.value = true
  } catch (error) {
    forgotError.value = error.message || 'Reset password gagal.'
  }
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

.input-error {
  border-color: #dc2626 !important;
  background-color: #fef2f2;
}

.input-success {
  border-color: #16a34a !important;
  background-color: #f0fdf4;
}

.field-error {
  margin-top: 6px;
  font-size: 13px;
  color: #dc2626;
}

.field-success {
  margin-top: 6px;
  font-size: 13px;
  color: #16a34a;
}

.password-strength {
  margin-top: 8px;
}

.strength-bar {
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background-color: #e5e7eb;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}

.strength-fill.weak {
  background-color: #dc2626;
}

.strength-fill.medium {
  background-color: #f59e0b;
}

.strength-fill.strong {
  background-color: #16a34a;
}

.strength-text {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
}

.strength-text.weak {
  color: #dc2626;
}

.strength-text.medium {
  color: #f59e0b;
}

.strength-text.strong {
  color: #16a34a;
}

</style>