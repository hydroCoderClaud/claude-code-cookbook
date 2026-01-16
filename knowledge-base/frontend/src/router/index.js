import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/link/new',
    name: 'NewLink',
    component: () => import('../views/LinkForm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/link/:id/edit',
    name: 'EditLink',
    component: () => import('../views/LinkForm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/article/new',
    name: 'NewArticle',
    component: () => import('../views/ArticleEditor.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/article/:id',
    name: 'ArticleView',
    component: () => import('../views/ArticleView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/article/:id/edit',
    name: 'EditArticle',
    component: () => import('../views/ArticleEditor.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: () => import('../views/UserManagement.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.guest && userStore.isLoggedIn) {
    next('/')
  } else if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/')
  } else {
    next()
  }
})

export default router
