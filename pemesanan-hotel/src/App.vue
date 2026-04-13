<template>
  <AppHeader />
  <main>
    <RouterView />
  </main>
  <AppFooter />

  <template v-if="!isDetailPage">
    <BookingModal v-if="bookingStore.showBookingModal" />
    <ConfirmationModal v-if="bookingStore.showConfirmationModal" />
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import BookingModal from '@/components/BookingModal.vue'
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import { useBookingStore } from '@/stores/booking'

const bookingStore = useBookingStore()
const route = useRoute()

const isDetailPage = computed(() => route.name === 'HotelDetail')
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

main {
  min-height: calc(100vh - 130px);
}
</style>