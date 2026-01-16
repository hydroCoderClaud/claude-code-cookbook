import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'

export const useUserStore = defineStore('user', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const mustChangePassword = computed(() => user.value?.must_change_password === true)

  async function login(username, password) {
    const data = await authApi.login({ username, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    return data
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  async function fetchCurrentUser() {
    if (token.value) {
      const data = await authApi.getMe()
      user.value = data
      localStorage.setItem('user', JSON.stringify(data))
    }
  }

  // 密码修改后清除标记
  function clearMustChangePassword() {
    if (user.value) {
      user.value.must_change_password = false
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    mustChangePassword,
    login,
    logout,
    fetchCurrentUser,
    clearMustChangePassword
  }
})
