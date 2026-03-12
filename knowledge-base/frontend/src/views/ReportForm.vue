<template>
  <div class="page-container">
    <div class="form-header">
      <h2>上传工作报告</h2>
    </div>

    <el-form
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

      <el-form-item label="HTML 文件" prop="htmlFile" required>
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :before-upload="beforeUpload"
          accept=".html,.htm"
          drag
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            拖拽文件到此处或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              只能上传 HTML 文件，且不超过 50MB
            </div>
          </template>
        </el-upload>
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
          提交
        </el-button>
        <el-button @click="router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useKnowledgeStore } from '../stores/knowledge'
import api from '../api'

const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const formRef = ref(null)
const uploadRef = ref(null)
const submitting = ref(false)

const form = ref({
  title: '',
  description: '',
  htmlFile: null,
  tags: []
})

const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' }
  ]
}

const handleFileChange = (file) => {
  // 验证文件类型
  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
    ElMessage.error('只能上传 HTML 文件（.html 或 .htm）')
    // 清空文件选择
    uploadRef.value.clearFiles()
    form.value.htmlFile = null
    return false
  }

  // 验证文件大小（50MB）
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 50MB')
    uploadRef.value.clearFiles()
    form.value.htmlFile = null
    return false
  }

  form.value.htmlFile = file.raw
  return true
}

const handleFileRemove = () => {
  form.value.htmlFile = null
}

const beforeUpload = (file) => {
  // 这个钩子在文件被添加到上传列表之前触发
  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
    ElMessage.error('只能上传 HTML 文件（.html 或 .htm）')
    return false
  }

  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 50MB')
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!form.value.htmlFile) {
    ElMessage.error('请上传 HTML 文件')
    return
  }

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true

  try {
    const formData = new FormData()
    formData.append('type', 'report')
    formData.append('title', form.value.title)
    if (form.value.description) {
      formData.append('description', form.value.description)
    }
    formData.append('htmlFile', form.value.htmlFile)
    formData.append('tags', JSON.stringify(form.value.tags))

    await api.post('/items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    ElMessage.success('上传成功')
    router.push('/')
  } catch (error) {
    // Error handled by API interceptor
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  knowledgeStore.fetchTags()
})
</script>

<style scoped>
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
</style>
