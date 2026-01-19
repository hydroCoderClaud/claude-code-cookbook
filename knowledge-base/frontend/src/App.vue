<template>
  <el-config-provider :locale="zhCn">
    <div class="app-container">
      <!-- 游客导航 -->
      <el-header v-if="!userStore.isLoggedIn && $route.meta.guestAllowed" class="app-header">
        <div class="header-content">
          <div class="header-left">
            <router-link to="/" class="logo">HydroCoder</router-link>
            <el-menu mode="horizontal" :ellipsis="false" router class="guest-menu">
              <el-menu-item index="/">首页</el-menu-item>
              <el-menu-item index="/downloads">下载中心</el-menu-item>
            </el-menu>
          </div>
          <div class="header-right">
            <el-button type="primary" @click="router.push('/login')">登录</el-button>
          </div>
        </div>
      </el-header>

      <!-- 登录用户导航 -->
      <el-header v-if="userStore.isLoggedIn" class="app-header">
        <div class="header-content">
          <div class="header-left">
            <router-link to="/" class="logo">HydroCoder</router-link>
            <el-menu mode="horizontal" :ellipsis="false" router>
              <el-menu-item index="/">首页</el-menu-item>
              <el-menu-item index="/downloads">下载中心</el-menu-item>
              <el-menu-item index="/link/new">添加链接</el-menu-item>
              <el-menu-item index="/article/new">写文章</el-menu-item>
              <el-menu-item v-if="userStore.isAdmin" index="/users">用户管理</el-menu-item>
            </el-menu>
          </div>
          <div class="header-right">
            <el-dropdown>
              <span class="user-dropdown">
                <el-icon><User /></el-icon>
                {{ userStore.user?.username }}
                <el-tag v-if="userStore.isAdmin" size="small" type="danger" style="margin-left: 4px">管理员</el-tag>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openPasswordDialog">修改密码</el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main class="app-main">
        <router-view />
      </el-main>

      <!-- 修改密码对话框 -->
      <el-dialog
        v-model="showPasswordDialog"
        :title="forceChangePassword ? '首次登录请修改密码' : '修改密码'"
        width="400px"
        :close-on-click-modal="!forceChangePassword"
        :close-on-press-escape="!forceChangePassword"
        :show-close="!forceChangePassword"
      >
        <el-alert
          v-if="forceChangePassword"
          title="为了账号安全，首次登录需要修改初始密码"
          type="warning"
          :closable="false"
          style="margin-bottom: 16px"
        />
        <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="80px">
          <el-form-item label="原密码" prop="oldPassword">
            <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="管理员创建的初始密码" />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="passwordForm.newPassword" type="password" show-password />
            <div class="password-hint">至少8位，包含大写、小写字母、数字和特殊符号</div>
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button v-if="!forceChangePassword" @click="showPasswordDialog = false">取消</el-button>
          <el-button type="primary" :loading="passwordLoading" @click="handleChangePassword">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </el-config-provider>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { User, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { useUserStore } from './stores/user'
import { useRouter } from 'vue-router'
import { authApi } from './api'

const userStore = useUserStore()
const router = useRouter()

const showPasswordDialog = ref(false)
const forceChangePassword = ref(false)
const passwordLoading = ref(false)
const passwordFormRef = ref()

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 检查是否需要强制修改密码
const checkMustChangePassword = () => {
  if (userStore.isLoggedIn && userStore.mustChangePassword) {
    forceChangePassword.value = true
    showPasswordDialog.value = true
  }
}

// 监听登录状态
watch(() => userStore.mustChangePassword, (newVal) => {
  if (newVal) {
    forceChangePassword.value = true
    showPasswordDialog.value = true
  }
}, { immediate: true })

onMounted(() => {
  checkMustChangePassword()
})

const openPasswordDialog = () => {
  forceChangePassword.value = false
  showPasswordDialog.value = true
}

// 密码强度验证
const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入新密码'))
  } else if (value.length < 8) {
    callback(new Error('密码至少8位'))
  } else if (!/[A-Z]/.test(value)) {
    callback(new Error('密码需包含大写字母'))
  } else if (!/[a-z]/.test(value)) {
    callback(new Error('密码需包含小写字母'))
  } else if (!/[0-9]/.test(value)) {
    callback(new Error('密码需包含数字'))
  } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(value)) {
    callback(new Error('密码需包含特殊符号'))
  } else {
    callback()
  }
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, validator: validatePassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleChangePassword = async () => {
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return

  passwordLoading.value = true
  try {
    await authApi.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    })
    ElMessage.success('密码修改成功')
    userStore.clearMustChangePassword()
    showPasswordDialog.value = false
    forceChangePassword.value = false
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    passwordLoading.value = false
  }
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  text-decoration: none;
}

.el-menu {
  border-bottom: none;
}

.guest-menu {
  border-bottom: none;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #606266;
  outline: none;
  border: none;
}

.user-dropdown:focus {
  outline: none;
}

.app-main {
  flex: 1;
  padding: 20px;
  background: #f5f7fa;
}

.password-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}
</style>
