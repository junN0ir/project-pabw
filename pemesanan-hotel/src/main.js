import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)

// PINIA DULU sebelum router
const pinia = createPinia()
app.use(pinia)

// Baru import router setelah pinia terpasang
import router from './router'
app.use(router)

import './assets/styles/global.css'

app.mount('#app')