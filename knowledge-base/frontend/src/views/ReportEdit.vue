<template>
  <div class="page-container">
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <div v-else class="form-header">
      <h2>编辑工作报告</h2>
    </div>

    <el-form
      v-if="!loading"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="report-form"
    >
      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入报告标题"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入报告描述（可选）"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="HTML 文件">
        <div class="file-info">
          <el-icon><Document /></el-icon>
          <span>{{ originalFileName }}</span>
          <el-tag type="info" size="small">不可修改</el-tag>
        </div>
        <div class="file-tip">如需更换文件，请删除后重新上传</div>
      </el-form-item>

      <el-form-item label="标签" prop="tags">
        <el-select
          v-model="form.tags"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="请选择或输入标签"
          style="width: 100%"
        >
          <el-option
            v-for="tag in knowledgeStore.tags"
            :key="tag.id"
            :label="tag.name"
            :value="tag.name"
          />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          保存
        </el-button>
        <el-button @click="router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Document } from '@element-plus/icons-vue'
import { useKnowledgeStore } from '../stores/knowledge'
import api from '../api'

const route = useRoute()
const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const reportId = route.params.id
const formRef = ref(null)
const loading = ref(true)
const submitting = ref(false)
const originalFileName = ref('')

const form = ref({
  title: '',
  description: '',
  tags: []
})

const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' }
  ]
}

const loadReport = async () => {
  loading.value = true
  try {
    const data = await api.get(`/items/${reportId}`)

    if (data.type !== 'report') {
      ElMessage.error('该条目不是工作报告')
      router.push('/')
      return
    }

    form.value.title = data.title
    form.value.description = data.description || ''
    form.value.tags = data.tags ? data.tags.map(t => t.name) : []
    originalFileName.value = data.html_file || '未知文件'
  } catch (error) {
    ElMessage.error('加载失败')
    router.back()
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true

  try {
    await api.put(`/items/${reportId}`, {
      title: form.value.title,
      description: form.value.description,
      tags: form.value.tags
    })

    ElMessage.success('保存成功')
    router.push(`/report/${reportId}`)
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  knowledgeStore.fetchTags()
  loadReport()
})
</script>

<style scoped>
.loading-container {
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

.form-header {
  margin-bottom: 24px;
}

.form-header h2 {
  font-size: 20px;
  color: #303133;
  margin: 0;
}

.report-form {
  max-width: 800px;
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #606266;
}

.file-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
</style>
