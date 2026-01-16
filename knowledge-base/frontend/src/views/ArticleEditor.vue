<template>
  <div class="editor-container">
    <div class="editor-header">
      <el-input
        v-model="form.title"
        placeholder="请输入文章标题"
        class="title-input"
        size="large"
      />
      <div class="header-actions">
        <el-radio-group v-model="editorMode" size="small">
          <el-radio-button value="markdown">Markdown</el-radio-button>
          <el-radio-button value="richtext">富文本</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- Markdown 编辑器 -->
    <div v-show="editorMode === 'markdown'" class="editor-wrapper">
      <MdEditor
        v-model="form.content"
        :preview="true"
        :toolbars="markdownToolbars"
        style="height: 500px"
      />
    </div>

    <!-- 富文本编辑器 -->
    <div v-show="editorMode === 'richtext'" class="editor-wrapper">
      <div ref="richEditorRef" class="rich-editor"></div>
    </div>

    <div class="editor-footer">
      <div class="footer-left">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="选择或创建标签"
          style="width: 300px"
        >
          <el-option
            v-for="tag in knowledgeStore.tags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.name"
          />
        </el-select>
      </div>
      <div class="footer-right">
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '发布文章' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { createEditor } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import { useKnowledgeStore } from '../stores/knowledge'

const route = useRoute()
const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const loading = ref(false)
const editorMode = ref('markdown')
const richEditorRef = ref()
const richEditor = shallowRef(null)

const isEdit = computed(() => !!route.params.id)

const form = reactive({
  title: '',
  content: '',
  tags: []
})

// Markdown 工具栏配置
const markdownToolbars = [
  'bold', 'underline', 'italic', 'strikeThrough', '-',
  'title', 'sub', 'sup', 'quote', '-',
  'unorderedList', 'orderedList', 'task', '-',
  'codeRow', 'code', 'link', 'image', 'table', '-',
  'revoke', 'next', '=',
  'preview', 'fullscreen'
]

// 初始化富文本编辑器
const initRichEditor = () => {
  if (richEditor.value) return

  richEditor.value = createEditor({
    selector: richEditorRef.value,
    html: editorMode.value === 'richtext' ? form.content : '',
    config: {
      placeholder: '请输入文章内容...',
      MENU_CONF: {
        uploadImage: {
          // 禁用图片上传，只支持外链
          customBrowseAndUpload: (insertFn) => {
            const url = prompt('请输入图片地址')
            if (url) {
              insertFn(url, '', '')
            }
          }
        }
      }
    }
  })
}

// 监听编辑器模式切换
watch(editorMode, (newMode, oldMode) => {
  if (newMode === 'richtext') {
    // 切换到富文本时初始化
    setTimeout(() => {
      initRichEditor()
      if (oldMode === 'markdown' && form.content) {
        // 简单处理：Markdown 转 HTML 时保留原内容
        richEditor.value?.setHtml(`<pre>${form.content}</pre>`)
      }
    }, 100)
  } else if (newMode === 'markdown' && richEditor.value) {
    // 从富文本切换回 Markdown
    const html = richEditor.value.getHtml()
    if (html && html !== '<p><br></p>') {
      form.content = html
    }
  }
})

const handleSubmit = async () => {
  if (!form.title.trim()) {
    ElMessage.warning('请输入文章标题')
    return
  }

  let content = form.content
  if (editorMode.value === 'richtext' && richEditor.value) {
    content = richEditor.value.getHtml()
  }

  if (!content || content === '<p><br></p>') {
    ElMessage.warning('请输入文章内容')
    return
  }

  loading.value = true
  try {
    const data = {
      type: 'article',
      title: form.title,
      content: content,
      content_type: editorMode.value,
      tags: form.tags
    }

    if (isEdit.value) {
      await knowledgeStore.updateItem(route.params.id, data)
      ElMessage.success('修改成功')
    } else {
      await knowledgeStore.createItem(data)
      ElMessage.success('发布成功')
    }
    router.push('/')
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  knowledgeStore.fetchTags()

  if (isEdit.value) {
    try {
      const item = await knowledgeStore.fetchItem(route.params.id)
      form.title = item.title
      form.content = item.content || ''
      form.tags = item.tags.map(t => t.name)
      editorMode.value = item.content_type || 'markdown'

      if (editorMode.value === 'richtext') {
        setTimeout(() => {
          initRichEditor()
          richEditor.value?.setHtml(form.content)
        }, 100)
      }
    } catch (error) {
      ElMessage.error('加载失败')
      router.push('/')
    }
  }
})

onBeforeUnmount(() => {
  if (richEditor.value) {
    richEditor.value.destroy()
    richEditor.value = null
  }
})
</script>

<style scoped>
.editor-container {
  max-width: 1000px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-input {
  flex: 1;
}

.title-input :deep(.el-input__inner) {
  font-size: 18px;
  font-weight: 500;
}

.editor-wrapper {
  min-height: 500px;
}

.rich-editor {
  min-height: 500px;
}

.rich-editor :deep(.w-e-text-container) {
  min-height: 450px;
}

.editor-footer {
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-right {
  display: flex;
  gap: 12px;
}
</style>
