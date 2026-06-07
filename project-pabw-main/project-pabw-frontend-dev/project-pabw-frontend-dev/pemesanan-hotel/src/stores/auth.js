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

  function persistSession(safeUser) {
    user.value = safeUser
    token.value = `backend-token-${Date.now()}`
    localStorage.setItem('pabwUser', JSON.stringify(safeUser))
    localStorage.setItem('pabwToken', token.value)
  }

  async function login(identifier, password) {
    try {
      const response = await apiPost('/login', { identifier, password })

      if (!response?.data) {
        return { success: false, message: 'Respons login tidak valid.' }
      }

      const safeUser = normalizeUser(response.data)
      persistSession(safeUser)
      return { success: true, data: safeUser }
    } catch (error) {
      return { success: false, message: error.message || 'Login gagal.' }
    }
  }

  async function register(name, email, password, phone) {
    try {
      const response = await apiPost('/register', {
        name,
        email,
        password,
        phone_number: phone
      })

      if (!response?.data) {
        return { success: false, message: 'Respons register tidak valid.' }
      }

      const safeUser = normalizeUser(response.data)
      persistSession(safeUser)
      return { success: true, data: safeUser }
    } catch (error) {
      return { success: false, message: error.message || 'Registrasi gagal.' }
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('pabwUser')
    localStorage.removeItem('pabwToken')
  }

  function updateProfile(data) {
    user.value = { ...user.value, ...data }
    localStorage.setItem('pabwUser', JSON.stringify(user.value))
  }

  return { user, token, isLoggedIn, isCustomer, isMitra, isAdmin, login, register, logout, updateProfile }
})