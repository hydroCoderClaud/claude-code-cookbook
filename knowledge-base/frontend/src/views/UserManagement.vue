<template>
  <div class="page-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showAddDialog">添加用户</el-button>
    </div>

    <el-table :data="users" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="must_change_password" label="需修改密码" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.must_change_password" type="warning" size="small">是</el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showEditDialog(row)">编辑</el-button>
          <el-button type="warning" link size="small" @click="handleResetPassword(row)">重置密码</el-button>
          <el-popconfirm
            v-if="row.id !== userStore.user?.id"
            title="确定删除该用户？其发布的内容将保留。"
            @confirm="handleDelete(row.id)"
          >
            <template #reference>
              <el-button type="danger" link size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑用户对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '添加用户'" width="400px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3-20位，支持中文" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <div v-if="!isEdit" class="dialog-hint">
        新用户默认密码：<code>Abc@1234</code>，首次登录需修改密码
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { usersApi } from '../api'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()

const users = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()
const editingId = ref(null)

const form = reactive({
  username: '',
  role: 'user'
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名3-20位', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const fetchUsers = async () => {
  loading.value = true
  try {
    users.value = await usersApi.getAll()
  } catch (error) {
    // Error handled by interceptor
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  editingId.value = null
  form.username = ''
  form.role = 'user'
  dialogVisible.value = true
}

const showEditDialog = (user) => {
  isEdit.value = true
  editingId.value = user.id
  form.username = user.username
  form.role = user.role
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await usersApi.update(editingId.value, form)
      ElMessage.success('修改成功')
    } else {
      const result = await usersApi.create(form)
      ElMessage.success(result.message || '创建成功')
    }
    dialogVisible.value = false
    fetchUsers()
  } catch (error) {
    // Error handled by interceptor
  } finally {
    submitting.value = false
  }
}

const handleResetPassword = async (user) => {
  try {
    const result = await usersApi.update(user.id, { reset_password: true })
    ElMessage.success(result.message || '密码已重置')
    fetchUsers()
  } catch (error) {
    // Error handled by interceptor
  }
}

const handleDelete = async (id) => {
  try {
    await usersApi.delete(id)
    ElMessage.success('删除成功')
    fetchUsers()
  } catch (error) {
    // Error handled by interceptor
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.dialog-hint {
  margin-top: 12px;
  padding: 10px;
  background: #fdf6ec;
  border-radius: 4px;
  font-size: 13px;
  color: #e6a23c;
}

.dialog-hint code {
  background: #fff;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}
</style>
