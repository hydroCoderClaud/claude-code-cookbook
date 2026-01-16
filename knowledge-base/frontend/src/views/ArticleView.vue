<template>
  <div class="page-container">
    <div v-loading="knowledgeStore.loading" class="article-container">
      <template v-if="article">
        <article class="article-content">
          <header class="article-header">
            <h1 class="article-title">{{ article.title }}</h1>
            <div class="article-meta">
              <span>{{ article.author_name }}</span>
              <span>{{ formatDate(article.created_at) }}</span>
              <span v-if="article.updated_at !== article.created_at">
                (更新于 {{ formatDate(article.updated_at) }})
              </span>
            </div>
            <div class="tag-list">
              <el-tag
                v-for="tag in article.tags"
                :key="tag.id"
                size="small"
                type="info"
              >
                {{ tag.name }}
              </el-tag>
            </div>
          </header>

          <!-- Markdown 渲染 -->
          <div v-if="article.content_type === 'markdown'" class="markdown-body">
            <MdPreview :modelValue="article.content" />
          </div>

          <!-- 富文本渲染 -->
          <div v-else class="richtext-body" v-html="article.content"></div>

          <footer class="article-footer">
            <el-button @click="router.back()">返回</el-button>
            <el-button type="primary" @click="router.push(`/article/${article.id}/edit`)">
              编辑
            </el-button>
          </footer>
        </article>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { useKnowledgeStore } from '../stores/knowledge'

const route = useRoute()
const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const article = computed(() => knowledgeStore.currentItem)

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  knowledgeStore.fetchItem(route.params.id)
})
</script>

<style scoped>
.article-container {
  max-width: 800px;
  margin: 0 auto;
}

.article-content {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.article-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #ebeef5;
}

.article-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.article-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #909399;
  margin-bottom: 12px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.markdown-body,
.richtext-body {
  line-height: 1.8;
  color: #303133;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-body :deep(p) {
  margin-bottom: 16px;
}

.markdown-body :deep(pre) {
  background: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
}

.markdown-body :deep(code) {
  background: #f6f8fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #dcdfe6;
  padding-left: 16px;
  margin: 16px 0;
  color: #606266;
}

.richtext-body :deep(img) {
  max-width: 100%;
  height: auto;
}

.article-footer {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .article-content {
    padding: 24px;
  }

  .article-title {
    font-size: 22px;
  }
}
</style>
