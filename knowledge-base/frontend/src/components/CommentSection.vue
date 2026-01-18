<template>
  <div class="comment-section">
    <div class="comment-header" @click="toggleExpand">
      <span class="comment-toggle">
        <el-icon><ChatDotRound /></el-icon>
        评论 ({{ displayCount }})
        <el-icon class="arrow" :class="{ expanded: isExpanded }"><ArrowDown /></el-icon>
      </span>
    </div>

    <div v-show="isExpanded" class="comment-body">
      <!-- 评论输入 - 仅登录用户可见 -->
      <div v-if="userStore.isLoggedIn" class="comment-input">
        <el-input
          v-model="newComment"
          type="textarea"
          :rows="2"
          placeholder="写下你的评论..."
          maxlength="500"
        />
        <el-button type="primary" size="small" :loading="submitting" @click="submitComment">
          发表
        </el-button>
      </div>
      <div v-else class="guest-hint">
        <router-link to="/login">登录</router-link>后可发表评论
      </div>

      <!-- 评论列表 -->
      <div v-if="comments.length > 0" class="comment-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-meta">
            <span class="comment-author">{{ comment.username }}</span>
            <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
            <el-button
              v-if="canDelete(comment)"
              type="danger"
              link
              size="small"
              @click="deleteComment(comment.id)"
            >
              删除
            </el-button>
          </div>
          <div class="comment-content">{{ comment.content }}</div>
        </div>
      </div>
      <div v-else class="no-comment">暂无评论</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChatDotRound, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { commentsApi } from '../api'
import { useUserStore } from '../stores/user'

const props = defineProps({
  itemId: {
    type: Number,
    required: true
  },
  initialCount: {
    type: Number,
    default: 0
  }
})

const userStore = useUserStore()
const isExpanded = ref(false)
const comments = ref([])
const newComment = ref('')
const submitting = ref(false)
const loaded = ref(false)

// 显示的评论数量：加载后用实际数量，否则用初始数量
const displayCount = computed(() => loaded.value ? comments.value.length : props.initialCount)

const toggleExpand = async () => {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value && !loaded.value) {
    await loadComments()
  }
}

const loadComments = async () => {
  try {
    comments.value = await commentsApi.getByItem(props.itemId)
    loaded.value = true
  } catch (error) {
    // Error handled by API interceptor
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  submitting.value = true
  try {
    const comment = await commentsApi.create({
      item_id: props.itemId,
      content: newComment.value.trim()
    })
    comments.value.push(comment)
    newComment.value = ''
    ElMessage.success('评论成功')
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    submitting.value = false
  }
}

const deleteComment = async (id) => {
  try {
    await commentsApi.delete(id)
    comments.value = comments.value.filter(c => c.id !== id)
    ElMessage.success('删除成功')
  } catch (error) {
    // Error handled by API interceptor
  }
}

const canDelete = (comment) => {
  return comment.user_id === userStore.user?.id || userStore.isAdmin
}

const formatTime = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.comment-section {
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
}

.comment-header {
  cursor: pointer;
  user-select: none;
}

.comment-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #909399;
}

.comment-toggle:hover {
  color: #409eff;
}

.arrow {
  transition: transform 0.2s;
}

.arrow.expanded {
  transform: rotate(180deg);
}

.comment-body {
  margin-top: 12px;
}

.comment-input {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.comment-input .el-input {
  flex: 1;
}

.comment-list {
  max-height: 300px;
  overflow-y: auto;
}

.comment-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.comment-time {
  font-size: 12px;
  color: #909399;
}

.comment-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.no-comment {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 16px 0;
}

.guest-hint {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.guest-hint a {
  color: #409eff;
  text-decoration: none;
}

.guest-hint a:hover {
  text-decoration: underline;
}
</style>
