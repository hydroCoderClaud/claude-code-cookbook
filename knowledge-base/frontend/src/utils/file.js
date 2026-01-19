import { filesApi } from '../api'

// 格式化文件大小
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 下载文件
export const downloadFile = (file) => {
  const url = filesApi.getDownloadUrl(file.id)
  const link = document.createElement('a')
  link.href = url
  link.download = file.original_name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
