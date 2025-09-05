<template>
  <t-config-provider :global-config="globalConfig">
    <router-view />
  </t-config-provider>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAppStore } from '@/store/modules/app'

const appStore = useAppStore()

// 从 store 中获取语言配置
const globalConfig = appStore.globalConfig

// 组件挂载时初始化主题系统
onMounted(() => {
  // 初始化新的主题系统
  appStore.initNewThemeSystem()
})
</script>

<style scoped>
</style>
