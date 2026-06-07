import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiPost } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('pabwUser') || 'null'))
  const token = ref(localStorage.getItem('pabwToken') || null)

  const isLoggedIn = computed(() => !!token.value)
  const isCustomer = computed(() => user.value?.role === 'customer')
  const isMitra = computed(() => user.value?.role === 'mitra')
  const isAdmin = computed(() => user.value?.role === 'admin')

  function normalizeUser(data) {
    return {
      id: data.id,
      name: data.nama || data.name || '',
      email: data.email || '',
      role: data.role || 'customer',
      phone: data.phone_number || data.phone || '',
      address: data.alamat || ''
    }
  }

  function persistSession(safeUser, backendToken) {
    user.value = safeUser
    token.value = backendToken

    localStorage.setItem('pabwUser', JSON.stringify(safeUser))
    localStorage.setItem('pabwToken', backendToken)
  }

  async function login(identifier, password) {
    try {
      const response = await apiPost('/auth/login', {
        identifier,
        password
      })

      if (!response?.data || !response?.token) {
        return {
          success: false,
          message: 'Respons login tidak valid.'
        }
      }

      const safeUser = normalizeUser(response.data)
      persistSession(safeUser, response.token)

      return {
        success: true,
        data: safeUser
      }
    } catch (error) {
      return {
        success: false,
        message: error.payload?.error || error.message || 'Login gagal.',
        payload: error.payload || null
      }
    }
  }

  async function register(name, email, password, phone) {
    try {
      const response = await apiPost('/auth/register', {
        name,
        email,
        password,
        phone_number: phone
      })

      return {
        success: true,
        message: response.message,
        email: response?.data?.email || email
      }
    } catch (error) {
      return {
        success: false,
        message: error.payload?.error || error.message || 'Registrasi gagal.',
        payload: error.payload || null
      }
    }
  }

  async function verifyEmail(email, otp) {
    try {
      const response = await apiPost('/auth/verify-email', {
        email,
        otp
      })

      if (!response?.data || !response?.token) {
        return {
          success: false,
          message: 'Respons verifikasi tidak valid.'
        }
      }

      const safeUser = normalizeUser(response.data)
      persistSession(safeUser, response.token)

      return {
        success: true,
        data: safeUser
      }
    } catch (error) {
      return {
        success: false,
        message: error.payload?.error || error.message || 'Verifikasi email gagal.',
        payload: error.payload || null
      }
    }
  }

  async function resendVerification(email) {
    try {
      const response = await apiPost('/auth/resend-verification', {
        email
      })

      return {
        success: true,
        message: response.message
      }
    } catch (error) {
      return {
        success: false,
        message: error.payload?.error || error.message || 'Gagal mengirim ulang OTP.',
        payload: error.payload || null
      }
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await apiPost('/auth/logout', {})
      }
    } catch (error) {
      console.warn(error.message)
    } finally {
      user.value = null
      token.value = null
      localStorage.removeItem('pabwUser')
      localStorage.removeItem('pabwToken')
    }
  }

  function updateProfile(data) {
    user.value = { ...user.value, ...data }
    localStorage.setItem('pabwUser', JSON.stringify(user.value))
  }

  return {
    user,
    token,
    isLoggedIn,
    isCustomer,
    isMitra,
    isAdmin,
    login,
    register,
    verifyEmail,
    resendVerification,
    logout,
    updateProfile
  }
})