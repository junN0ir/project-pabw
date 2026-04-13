import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('pabwUser') || 'null'))
  const token = ref(localStorage.getItem('pabwToken') || null)

  const isLoggedIn = computed(() => !!token.value)
  const isCustomer = computed(() => user.value?.role === 'customer')
  const isMitra = computed(() => user.value?.role === 'mitra')
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Simulasi database user (nanti diganti API)
  const mockUsers = [
    { id: 1, name: 'customer', email: 'customer@email.com', password: 'customer123', role: 'customer', phone: '081234567890', joinDate: '2024-01-15' },
    { id: 2, name: 'Lusy Rahmawati', email: 'lusy@email.com', password: 'password123', role: 'customer', phone: '089876543210', joinDate: '2024-03-20' }
  ]

  function login(email, password) {
    const found = mockUsers.find(u => u.email === email && u.password === password)
    if (!found) return { success: false, message: 'Email atau password salah.' }

    const { password: _, ...safeUser } = found
    user.value = safeUser
    token.value = 'mock-token-' + Date.now()
    localStorage.setItem('pabwUser', JSON.stringify(safeUser))
    localStorage.setItem('pabwToken', token.value)
    return { success: true }
  }

  function register(name, email, password, phone) {
    const exists = mockUsers.find(u => u.email === email)
    if (exists) return { success: false, message: 'Email sudah terdaftar.' }

    const newUser = {
      id: Date.now(), name, email, password, phone,
      role: 'customer',
      joinDate: new Date().toISOString().split('T')[0]
    }
    mockUsers.push(newUser)

    const { password: _, ...safeUser } = newUser
    user.value = safeUser
    token.value = 'mock-token-' + Date.now()
    localStorage.setItem('pabwUser', JSON.stringify(safeUser))
    localStorage.setItem('pabwToken', token.value)
    return { success: true }
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