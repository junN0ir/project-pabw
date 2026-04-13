import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBookingStore = defineStore('booking', () => {
  const currentRoom = ref({ name: '', price: 0, capacity: 0, hotelId: null, hotelName: '' })
  const bookings = ref(JSON.parse(localStorage.getItem('pabwBookings') || '[]'))
  const showBookingModal = ref(false)
  const showConfirmationModal = ref(false)
  const lastBooking = ref(null)

  function setRoom(room) {
    currentRoom.value = room
    showBookingModal.value = true
  }

  function closeBookingModal() {
    showBookingModal.value = false
  }

  function saveBooking(booking) {
    bookings.value.push(booking)
    localStorage.setItem('pabwBookings', JSON.stringify(bookings.value))
    lastBooking.value = booking
    showBookingModal.value = false
    showConfirmationModal.value = true
  }

  function closeConfirmationModal() {
    showConfirmationModal.value = false
    lastBooking.value = null
  }

  function getBookingsByUser(userId) {
    return bookings.value.filter(b => b.userId === userId)
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

  return {
    currentRoom, bookings, showBookingModal, showConfirmationModal, lastBooking,
    setRoom, closeBookingModal, saveBooking, closeConfirmationModal,
    getBookingsByUser, formatCurrency
  }
})