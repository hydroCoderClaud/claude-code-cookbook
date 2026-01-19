<template>
  <div class="page-container">
    <div class="page-header">
      <h2>下载中心</h2>
      <el-upload
        v-if="userStore.isAdmin"
        ref="uploadRef"
        :action="uploadUrl"
        :headers="uploadHeaders"
        :before-upload="beforeUpload"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
        :show-file-list="false"
      >
        <el-button type="primary" :icon="Upload">上传文件</el-button>
      </el-upload>
    </div>

    <!-- 文件列表 -->
    <div v-loading="loading" class="file-list">
      <div v-if="files.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无可下载文件" />
      </div>

      <div v-for="file in files" :key="file.id" class="file-card">
        <div class="file-icon">
          <el-icon :size="32"><Document /></el-icon>
        </div>
        <div class="file-info">
          <a class="file-name" href="#" @click.prevent="downloadFile(file)">{{ file.original_name }}</a>
          <div class="file-meta">
            <span>{{ formatFileSize(file.size) }}</span>
            <span>{{ file.uploader_name || '未知' }} 上传</span>
            <span>{{ formatDate(file.created_at) }}</span>
          </div>
          <div v-if="file.description" class="file-desc">{{ file.description }}</div>
        </div>
        <div class="file-actions">
          <el-button type="primary" :icon="Download" @click="downloadFile(file)">
            下载
          </el-button>
          <el-popconfirm
            v-if="userStore.isAdmin"
            title="确定删除该文件？"
            @confirm="handleDelete(file.id)"
          >
            <template #reference>
              <el-button type="danger" :icon="Delete">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>
    </div>

    <!-- 上传描述弹窗 -->
    <el-dialog v-model="uploadDialogVisible" title="添加文件描述" width="400px" :close-on-click-modal="!uploading">
      <el-input
        v-model="uploadDescription"
        type="textarea"
        :rows="3"
        placeholder="请输入文件描述（可选）"
        :disabled="uploading"
      />
      <div v-if="uploading" class="upload-progress">
        <el-progress :percentage="uploadProgress" :status="uploadProgress === 100 ? 'success' : ''" />
        <div class="progress-text">{{ uploadProgressText }}</div>
      </div>
      <template #footer>
        <el-button @click="cancelUpload" :disabled="uploading">取消</el-button>
        <el-button type="primary" @click="confirmUpload" :loading="uploading">
          {{ uploading ? '上传中...' : '确定上传' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Upload, Download, Delete, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { filesApi } from '../api'
import { formatFileSize, downloadFile } from '../utils/file'

const userStore = useUserStore()

const loading = ref(false)
const files = ref([])
const uploadRef = ref()
const uploadDialogVisible = ref(false)
const uploadDescription = ref('')
const pendingFile = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadProgressText = ref('')

// 上传URL和Headers
const uploadUrl = computed(() => '/api/files')
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

// 获取文件列表
const fetchFiles = async () => {
  loading.value = true
  try {
    const res = await filesApi.getList()
    files.value = res.files || []
  } catch (error) {
    console.error('获取文件列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 上传前处理 - 显示描述弹窗
const beforeUpload = (file) => {
  // 检查文件大小
  if (file.size > 200 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 200MB')
    return false
  }

  pendingFile.value = file
  uploadDescription.value = ''
  uploadDialogVisible.value = true
  return false // 阻止自动上传
}

// 取消上传
const cancelUpload = () => {
  pendingFile.value = null
  uploadDialogVisible.value = false
}

// 确认上传
const confirmUpload = async () => {
  if (!pendingFile.value) return

  const formData = new FormData()
  formData.append('file', pendingFile.value)
  if (uploadDescription.value.trim()) {
    formData.append('description', uploadDescription.value.trim())
  }

  uploading.value = true
  uploadProgress.value = 0
  uploadProgressText.value = '准备上传...'

  try {
    await filesApi.upload(formData, (progressEvent) => {
      const { loaded, total } = progressEvent
      const percent = Math.round((loaded / total) * 100)
      uploadProgress.value = percent
      uploadProgressText.value = `${formatFileSize(loaded)} / ${formatFileSize(total)}`
    })
    ElMessage.success('上传成功')
    fetchFiles()
    uploadDialogVisible.value = false
    pendingFile.value = null
  } catch (error) {
    ElMessage.error('上传失败')
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

// 上传成功回调（实际不会触发，因为 beforeUpload 返回 false）
const handleUploadSuccess = () => {
  ElMessage.success('上传成功')
  fetchFiles()
}

// 上传失败回调
const handleUploadError = (error) => {
  console.error('Upload error:', error)
  ElMessage.error('上传失败')
}

// 删除文件
const handleDelete = async (id) => {
  try {
    await filesApi.delete(id)
    ElMessage.success('删除成功')
    fetchFiles()
  } catch (error) {
    // Error handled by API interceptor
  }
}

// 格式化日期
const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchFiles()
})
</script>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.file-list {
  min-height: 200px;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s;
}

.file-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ecf5ff;
  border-radius: 8px;
  color: #409eff;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 15px;
  font-weight: 500;
  color: #409eff;
  margin-bottom: 6px;
  word-break: break-all;
  text-decoration: none;
  cursor: pointer;
  display: block;
}

.file-name:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.file-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.file-desc {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
}

.file-actions {
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 60px 0;
}

.upload-progress {
  margin-top: 16px;
}

.progress-text {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}
</style>
