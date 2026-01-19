<template>
  <div class="page-container">
    <div class="main-layout">
      <!-- 左侧主内容区 -->
      <div class="main-content">
        <!-- 搜索和筛选区 -->
        <div class="search-area">
      <el-input
        v-model="searchQuery"
        placeholder="搜索标题或描述..."
        :prefix-icon="Search"
        clearable
        size="large"
        class="search-input"
        @input="debouncedSearch"
      />

      <el-select
        v-model="selectedType"
        placeholder="类型"
        clearable
        size="large"
        style="width: 120px"
        @change="handleSearch"
      >
        <el-option label="全部" value="" />
        <el-option label="链接" value="link" />
        <el-option label="文章" value="article" />
      </el-select>

      <el-select
        v-model="selectedTime"
        placeholder="时间"
        clearable
        size="large"
        style="width: 120px"
        @change="handleSearch"
      >
        <el-option label="全部" value="" />
        <el-option label="近一日" value="day" />
        <el-option label="近一周" value="week" />
        <el-option label="近一月" value="month" />
        <el-option label="近一年" value="year" />
      </el-select>

      <el-select
        v-model="sortOrder"
        size="large"
        style="width: 120px"
        @change="handleSearch"
      >
        <el-option label="最新" value="desc" />
        <el-option label="最早" value="asc" />
      </el-select>
    </div>

    <!-- 标签筛选区 -->
    <div v-if="knowledgeStore.tags.length > 0" class="tag-filter-area">
      <div class="tag-cloud" :class="{ expanded: tagExpanded }">
        <span
          v-for="tag in displayedTags"
          :key="tag.id"
          class="filter-tag"
          :class="{ active: selectedTag === tag.name }"
          @click="handleTagClick(tag.name)"
        >
          {{ tag.name }}
          <span class="tag-count">{{ tag.count }}</span>
        </span>
        <span
          v-if="selectedTag"
          class="filter-tag clear-tag"
          @click="clearTagFilter"
        >
          清除筛选 ×
        </span>
      </div>
      <span
        v-if="hasMoreTags"
        class="tag-expand-btn"
        @click="tagExpanded = !tagExpanded"
      >
        {{ tagExpanded ? '收起' : `更多 (${hiddenTagCount})` }}
        <el-icon><ArrowDown :class="{ rotated: tagExpanded }" /></el-icon>
      </span>
    </div>

    <!-- 列表 -->
    <div v-loading="knowledgeStore.loading" class="item-list">
      <div v-if="knowledgeStore.items.length === 0 && !knowledgeStore.loading" class="empty-state">
        <el-empty description="暂无内容" />
      </div>

      <div v-for="item in knowledgeStore.items" :key="item.id" class="item-card">
        <div class="item-header">
          <div class="item-title-row">
            <el-tag :type="item.type === 'link' ? 'primary' : 'success'" size="small">
              {{ item.type === 'link' ? '链接' : '文章' }}
            </el-tag>
            <h3 class="item-title">
              <a
                v-if="item.type === 'link'"
                :href="item.url"
                target="_blank"
                rel="noopener"
              >
                {{ item.title }}
                <el-icon><Link /></el-icon>
              </a>
              <router-link v-else :to="`/article/${item.id}`">
                {{ item.title }}
              </router-link>
            </h3>
          </div>
          <div class="item-actions">
            <el-button
              type="info"
              link
              size="small"
              @click="handleShare(item)"
            >
              分享
            </el-button>
            <template v-if="canEdit(item)">
              <el-button
                v-if="item.type === 'link'"
                type="primary"
                link
                size="small"
                @click="handleEditLink(item)"
              >
                编辑
              </el-button>
              <el-button
                v-else
                type="primary"
                link
                size="small"
                @click="router.push(`/article/${item.id}/edit`)"
              >
                编辑
              </el-button>
            </template>
            <el-popconfirm
              v-if="canEdit(item)"
              title="确定删除？"
              @confirm="handleDelete(item.id)"
            >
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>

        <p v-if="item.description" class="item-description">
          {{ item.description }}
        </p>

        <div class="item-footer">
          <div class="tag-list">
            <el-tag
              v-for="tag in item.tags"
              :key="tag.id"
              size="small"
              type="info"
              class="tag-item"
              @click="handleTagClick(tag.name)"
            >
              {{ tag.name }}
            </el-tag>
          </div>
          <div class="item-meta">
            <span>{{ item.author_name || '未知' }}</span>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
        </div>

        <!-- 评论区 -->
        <CommentSection :item-id="item.id" :initial-count="item.comment_count || 0" />
      </div>
    </div>

    <!-- 分页 -->
        <div v-if="knowledgeStore.total > pageSize" class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="knowledgeStore.total"
            layout="total, prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- 右侧下载列表 -->
      <div class="sidebar">
        <div class="sidebar-card">
          <div class="sidebar-header">
            <h3>下载中心</h3>
            <router-link to="/downloads" class="view-all">查看全部</router-link>
          </div>
          <div v-if="files.length === 0" class="sidebar-empty">
            暂无文件
          </div>
          <div v-else class="file-list">
            <div v-for="file in files.slice(0, 5)" :key="file.id" class="file-item" @click="downloadFile(file)">
              <el-icon class="file-icon"><Document /></el-icon>
              <div class="file-info">
                <div class="file-name" :title="file.original_name">{{ file.original_name }}</div>
                <div class="file-size">{{ formatFileSize(file.size) }}</div>
              </div>
              <el-icon class="download-icon"><Download /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分享弹窗 -->
    <el-dialog v-model="shareDialogVisible" title="分享到微信" width="320px" center>
      <div class="share-content">
        <p class="share-title">{{ shareItem?.title }}</p>
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
import { useRouter } from 'vue-router'
import { Search, Link, ArrowDown, Document, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useKnowledgeStore } from '../stores/knowledge'
import { useUserStore } from '../stores/user'
import CommentSection from '../components/CommentSection.vue'
import QRCode from 'qrcode'
import { filesApi } from '../api'
import { formatFileSize, downloadFile } from '../utils/file'

const router = useRouter()
const knowledgeStore = useKnowledgeStore()
const userStore = useUserStore()

const searchQuery = ref('')
const selectedType = ref('')
const selectedTag = ref('')
const selectedTime = ref('')
const sortOrder = ref('desc')
const currentPage = ref(1)
const pageSize = 20
const tagExpanded = ref(false)
const maxVisibleTags = 10

// 分享相关
const shareDialogVisible = ref(false)
const shareItem = ref(null)
const qrcodeCanvas = ref(null)

// 文件下载相关
const files = ref([])

// 计算显示的标签
const displayedTags = computed(() => {
  if (tagExpanded.value) {
    return knowledgeStore.tags
  }
  return knowledgeStore.tags.slice(0, maxVisibleTags)
})

const hasMoreTags = computed(() => knowledgeStore.tags.length > maxVisibleTags)
const hiddenTagCount = computed(() => knowledgeStore.tags.length - maxVisibleTags)

let searchTimeout = null

const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    handleSearch()
  }, 300)
}

const handleSearch = () => {
  knowledgeStore.fetchItems({
    q: searchQuery.value || undefined,
    type: selectedType.value || undefined,
    tag: selectedTag.value || undefined,
    time: selectedTime.value || undefined,
    sort: sortOrder.value,
    page: currentPage.value,
    limit: pageSize
  })
}

const handlePageChange = (page) => {
  currentPage.value = page
  handleSearch()
}

const handleTagClick = (tagName) => {
  if (selectedTag.value === tagName) {
    selectedTag.value = ''
  } else {
    selectedTag.value = tagName
  }
  currentPage.value = 1
  handleSearch()
}

const clearTagFilter = () => {
  selectedTag.value = ''
  currentPage.value = 1
  handleSearch()
}

const handleEditLink = (item) => {
  router.push(`/link/${item.id}/edit`)
}

// 判断是否可以编辑/删除（作者或管理员）
const canEdit = (item) => {
  return item.author_id === userStore.user?.id || userStore.isAdmin
}

const handleDelete = async (id) => {
  try {
    await knowledgeStore.deleteItem(id)
    ElMessage.success('删除成功')
  } catch (error) {
    // Error handled by API interceptor
  }
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

// 分享功能
const getShareUrl = (item) => {
  const baseUrl = window.location.origin
  if (item.type === 'link') {
    return item.url
  } else {
    return `${baseUrl}/article/${item.id}`
  }
}

const handleShare = async (item) => {
  shareItem.value = item
  shareDialogVisible.value = true

  await nextTick()

  const url = getShareUrl(item)
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
  const url = getShareUrl(shareItem.value)
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制')
  } catch (err) {
    // 降级方案
    const input = document.createElement('input')
    input.value = url
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('链接已复制')
  }
}

// 获取文件列表
const fetchFiles = async () => {
  try {
    const res = await filesApi.getList()
    files.value = res.files || []
  } catch (error) {
    console.error('获取文件列表失败:', error)
  }
}

onMounted(() => {
  knowledgeStore.fetchItems({ page: 1, limit: pageSize })
  knowledgeStore.fetchTags()
  fetchFiles()
})
</script>

<style scoped>
/* 主布局 */
.main-layout {
  display: flex;
  gap: 20px;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
}

.sidebar-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 80px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 15px;
  color: #303133;
}

.view-all {
  font-size: 12px;
  color: #409eff;
  text-decoration: none;
}

.view-all:hover {
  text-decoration: underline;
}

.sidebar-empty {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 20px 0;
}

.sidebar .file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar .file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar .file-item:hover {
  background-color: #f5f7fa;
}

.sidebar .file-icon {
  color: #409eff;
  font-size: 20px;
  flex-shrink: 0;
}

.sidebar .file-info {
  flex: 1;
  min-width: 0;
}

.sidebar .file-name {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar .file-size {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.sidebar .download-icon {
  color: #67c23a;
  font-size: 16px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.sidebar .file-item:hover .download-icon {
  opacity: 1;
}

/* 响应式：小屏隐藏侧边栏 */
@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .sidebar-card {
    position: static;
  }
}

/* 标签筛选区样式 */
.tag-filter-area {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  flex: 1;
  max-height: 32px;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.tag-cloud.expanded {
  max-height: 500px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 13px;
  color: #606266;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-tag:hover {
  color: #409eff;
  border-color: #409eff;
  background: #ecf5ff;
}

.filter-tag.active {
  color: #fff;
  background: #409eff;
  border-color: #409eff;
}

.filter-tag.clear-tag {
  color: #f56c6c;
  border-color: #f56c6c;
  background: #fef0f0;
}

.filter-tag.clear-tag:hover {
  color: #fff;
  background: #f56c6c;
}

.tag-count {
  font-size: 11px;
  color: #909399;
  margin-left: 2px;
}

.filter-tag.active .tag-count {
  color: rgba(255, 255, 255, 0.8);
}

.tag-expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #409eff;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.tag-expand-btn:hover {
  color: #66b1ff;
}

.tag-expand-btn .el-icon {
  transition: transform 0.3s;
}

.tag-expand-btn .rotated {
  transform: rotate(180deg);
}

.item-list {
  min-height: 200px;
}

.item-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s;
}

.item-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 500;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-title a {
  color: #303133;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.item-title a:hover {
  color: #409eff;
}

.item-actions {
  flex-shrink: 0;
}

.item-description {
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
}

.tag-item:hover {
  opacity: 0.8;
}

.item-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.empty-state {
  padding: 60px 0;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
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
