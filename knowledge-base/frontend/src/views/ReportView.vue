<template>
  <div class="page-container">
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <el-result icon="error" title="加载失败" :sub-title="error">
        <template #extra>
          <el-button type="primary" @click="router.push('/')">返回首页</el-button>
        </template>
      </el-result>
    </div>

    <div v-else class="report-container">
      <!-- 报告头部信息 -->
      <div class="report-header">
        <div class="header-top">
          <h1 class="report-title">{{ report.title }}</h1>
          <div class="report-actions">
            <el-button type="info" size="default" @click="handleShare">分享</el-button>
            <el-button v-if="canEdit" type="primary" size="default" @click="router.push(`/report/${reportId}/edit`)">编辑</el-button>
            <el-popconfirm
              v-if="canEdit"
              title="确定删除？"
              @confirm="handleDelete"
            >
              <template #reference>
                <el-button type="danger" size="default">删除</el-button>
              </template>
            </el-popconfirm>
            <el-button size="default" @click="router.push('/')">返回</el-button>
          </div>
        </div>

        <div class="header-meta">
          <span class="meta-item">
            <el-icon><User /></el-icon>
            {{ report.author_name || '未知' }}
          </span>
          <span class="meta-item">
            <el-icon><Calendar /></el-icon>
            {{ formatDate(report.created_at) }}
          </span>
          <div v-if="report.tags && report.tags.length > 0" class="meta-tags">
            <el-tag
              v-for="tag in report.tags"
              :key="tag.id"
              size="small"
              type="info"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </div>

        <p v-if="report.description" class="report-description">
          {{ report.description }}
        </p>
      </div>

      <!-- HTML 内容展示区 -->
      <div class="report-content">
        <iframe
          ref="iframeRef"
          :src="`/api/items/${reportId}/report-html`"
          frameborder="0"
          @load="handleIframeLoad"
        ></iframe>
      </div>

      <!-- 评论区 -->
      <div class="comment-section">
        <CommentSection :item-id="reportId" />
      </div>
    </div>

    <!-- 分享弹窗 -->
    <el-dialog v-model="shareDialogVisible" title="分享到微信" width="320px" center>
      <div class="share-content">
        <p class="share-title">{{ report?.title }}</p>
        <div class="qrcode-container">
          <canvas ref="qrcodeCanvas"></canvas>
        </div>
        <p class="share-tip">微信扫一扫，分享给好友</p>
        <el-button type="primary" size="small" @click="copyShareLink">
          复制链接
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, User, Calendar } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import api from '../api'
import CommentSection from '../components/CommentSection.vue'
import QRCode from 'qrcode'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const reportId = route.params.id
const loading = ref(true)
const error = ref(null)
const report = ref(null)
const iframeRef = ref(null)
const shareDialogVisible = ref(false)
const qrcodeCanvas = ref(null)

// 判断是否可以编辑
const canEdit = computed(() => {
  if (!report.value || !userStore.user) return false
  return report.value.author_id === userStore.user.id || userStore.isAdmin
})

// 加载报告信息
const loadReport = async () => {
  loading.value = true
  error.value = null

  try {
    const data = await api.get(`/items/${reportId}`)
    report.value = data

    if (report.value.type !== 'report') {
      error.value = '该条目不是工作报告'
      return
    }
  } catch (err) {
    error.value = err.response?.data?.error || '加载失败'
  } finally {
    loading.value = false
  }
}

// iframe 加载完成后自动调整高度
const handleIframeLoad = () => {
  try {
    const iframe = iframeRef.value
    if (iframe && iframe.contentWindow) {
      const height = iframe.contentWindow.document.body.scrollHeight
      iframe.style.height = `${height + 20}px`
    }
  } catch (err) {
    console.error('调整 iframe 高度失败:', err)
  }
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const handleDelete = async () => {
  try {
    await api.delete(`/items/${reportId}`)
    ElMessage.success('删除成功')
    router.push('/')
  } catch (error) {
    // Error handled by API interceptor
  }
}

const handleShare = async () => {
  shareDialogVisible.value = true

  await nextTick()

  const url = `${window.location.origin}/report/${reportId}`
  try {
    await QRCode.toCanvas(qrcodeCanvas.value, url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  } catch (err) {
    console.error('生成二维码失败:', err)
    ElMessage.error('生成二维码失败')
  }
}

const copyShareLink = async () => {
  const url = `${window.location.origin}/report/${reportId}`
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制')
  } catch (err) {
    const input = document.createElement('input')
    input.value = url
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('链接已复制')
  }
}

onMounted(() => {
  loadReport()
})
</script>

<style scoped>
.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #909399;
}

.loading-container .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.report-container {
  max-width: 1200px;
  margin: 0 auto;
}

.report-header {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.report-title {
  font-size: 24px;
  color: #303133;
  margin: 0;
  flex: 1;
  min-width: 0;
  padding-right: 20px;
}

.report-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
}

.meta-item .el-icon {
  color: #909399;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}

.report-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 16px 0 0 0;
}

.report-content {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.report-content iframe {
  width: 100%;
  min-height: 600px;
  border: none;
}

.comment-section {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

/* 分享弹窗样式 */
.share-content {
  text-align: center;
}

.share-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 16px;
  word-break: break-all;
}

.qrcode-container {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.share-tip {
  font-size: 12px;
  color: #909399;
  margin-bottom: 16px;
}
</style>
