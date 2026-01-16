import { defineStore } from 'pinia'
import { ref } from 'vue'
import { itemsApi, tagsApi } from '../api'

export const useKnowledgeStore = defineStore('knowledge', () => {
  const items = ref([])
  const tags = ref([])
  const total = ref(0)
  const loading = ref(false)
  const currentItem = ref(null)

  // 获取列表
  async function fetchItems(params = {}) {
    loading.value = true
    try {
      const data = await itemsApi.getList(params)
      items.value = data.items
      total.value = data.total
      return data
    } finally {
      loading.value = false
    }
  }

  // 获取单条详情
  async function fetchItem(id) {
    loading.value = true
    try {
      const data = await itemsApi.getById(id)
      currentItem.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  // 创建条目
  async function createItem(data) {
    const result = await itemsApi.create(data)
    return result
  }

  // 更新条目
  async function updateItem(id, data) {
    const result = await itemsApi.update(id, data)
    return result
  }

  // 删除条目
  async function deleteItem(id) {
    await itemsApi.delete(id)
    items.value = items.value.filter(item => item.id !== id)
  }

  // 获取所有标签
  async function fetchTags() {
    const data = await tagsApi.getAll()
    tags.value = data
    return data
  }

  return {
    items,
    tags,
    total,
    loading,
    currentItem,
    fetchItems,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    fetchTags
  }
})
