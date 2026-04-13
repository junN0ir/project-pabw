import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/hotels',
    name: 'HotelList',
    component: () => import('@/views/HotelListView.vue')
  },
  {
    path: '/hotels/:id',
    name: 'HotelDetail',
    component: () => import('@/views/HotelDetailView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/reservations',
    name: 'Reservations',
    component: () => import('@/views/ReservationView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    // Tangkap semua route yang tidak dikenali
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/HomeView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  // Pinia store dipanggil di dalam beforeEach, bukan di luar
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.meta.guestOnly && auth.isLoggedIn) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router