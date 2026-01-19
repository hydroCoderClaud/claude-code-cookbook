import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.error || '请求失败'

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    } else {
      ElMessage.error(message)
    }

    return Promise.reject(error)
  }
)

// 认证 API
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/password', data)
}

// 用户管理 API（管理员）
export const usersApi = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

// 条目 API
export const itemsApi = {
  getList: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`)
}

// 标签 API
export const tagsApi = {
  getAll: () => api.get('/tags'),
  getItems: (id, params) => api.get(`/tags/${id}/items`, { params })
}

// 评论 API
export const commentsApi = {
  getByItem: (itemId) => api.get(`/comments/item/${itemId}`),
  create: (data) => api.post('/comments', data),
  delete: (id) => api.delete(`/comments/${id}`)
}

// 文件 API
export const filesApi = {
  getList: () => api.get('/files'),
  upload: (formData, onProgress) => api.post('/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000, // 上传超时延长到 10 分钟
    onUploadProgress: onProgress
  }),
  delete: (id) => api.delete(`/files/${id}`),
  getDownloadUrl: (id) => `/api/files/${id}/download`
}

export default api
