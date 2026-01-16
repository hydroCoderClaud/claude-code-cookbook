<template>
  <div class="page-container">
    <div class="form-card">
      <h2 class="form-title">{{ isEdit ? '编辑链接' : '添加链接' }}</h2>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入链接标题"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="链接地址" prop="url">
          <el-input
            v-model="form.url"
            placeholder="请输入链接地址，如 https://example.com"
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            placeholder="请输入链接描述（可选）"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="标签" prop="tags">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            default-first-option
            reserve-keyword
            placeholder="输入后按回车创建新标签"
            style="width: 100%"
            :filter-method="filterTags"
            @visible-change="handleTagVisibleChange"
          >
            <el-option
              v-for="tag in filteredTags"
              :key="tag.id || tag.name"
              :label="tag.name"
              :value="tag.name"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">
            {{ isEdit ? '保存修改' : '发布链接' }}
          </el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useKnowledgeStore } from '../stores/knowledge'

const route = useRoute()
const router = useRouter()
const knowledgeStore = useKnowledgeStore()

const formRef = ref()
const loading = ref(false)

const isEdit = computed(() => !!route.params.id)

const form = reactive({
  title: '',
  url: '',
  description: '',
  tags: []
})

const filteredTags = ref([])
const tagQuery = ref('')

const filterTags = (query) => {
  tagQuery.value = query
  if (query) {
    filteredTags.value = knowledgeStore.tags.filter(tag =>
      tag.name.toLowerCase().includes(query.toLowerCase())
    )
  } else {
    filteredTags.value = knowledgeStore.tags
  }
}

const handleTagVisibleChange = (visible) => {
  if (visible) {
    filteredTags.value = knowledgeStore.tags
  }
}

const rules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入链接地址', trigger: 'blur' },
    { type: 'url', message: '请输入有效的链接地址', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const data = {
      type: 'link',
      title: form.title,
      url: form.url,
      description: form.description,
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
  await knowledgeStore.fetchTags()
  filteredTags.value = knowledgeStore.tags

  if (isEdit.value) {
    try {
      const item = await knowledgeStore.fetchItem(route.params.id)
      form.title = item.title
      form.url = item.url || ''
      form.description = item.description || ''
      form.tags = item.tags.map(t => t.name)
    } catch (error) {
      ElMessage.error('加载失败')
      router.push('/')
    }
  }
})
</script>

<style scoped>
.form-card {
  max-width: 600px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.form-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 24px 0;
  text-align: center;
}
</style>
