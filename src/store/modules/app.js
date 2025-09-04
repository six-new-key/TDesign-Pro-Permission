import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './user'
import {
  THEME_MODE,
  setThemeMode as applyThemeMode,
  getThemeFromStorage,
  saveThemeToStorage,
  getSystemThemeMode,
  watchSystemThemeChange
} from '@/utils/theme'

export const useAppStore = defineStore('app', () => {
  // state
  const title = ref('')
  const sidebarTheme = ref('dark') // 菜单栏主题

  // 新的主题系统状态
  const themeMode = ref(THEME_MODE.LIGHT) // 主题模式: light, dark, auto
  const actualThemeMode = ref('light') // 实际应用的主题模式
  const sidebarCollapsed = ref(false) // 侧边栏折叠状态
  const shouldRefresh = ref(false) // 页面刷新标志
  const menuItems = ref([]) // 缓存的菜单项数据
  const isLocked = ref(false) // 锁屏状态
  const lockPassword = ref('') // 锁屏密码
  const showBreadcrumb = ref(true) // 面包屑导航显示状态
  const showPageTags = ref(true) // 页签组件显示状态
  const showPageTagsElevation = ref(true) // 页签组件抬高效果显示状态

  // getters
  const currentTitle = computed(() => title.value)
  const currentSidebarTheme = computed(() => sidebarTheme.value)
  const isSidebarCollapsed = computed(() => sidebarCollapsed.value)
  const lockStatus = computed(() => isLocked.value)
  const currentLockPassword = computed(() => lockPassword.value)
  const breadcrumbVisible = computed(() => showBreadcrumb.value)
  const pageTagsVisible = computed(() => showPageTags.value)
  const pageTagsElevationVisible = computed(() => showPageTagsElevation.value)

  // 新的主题系统 getters
  const currentThemeMode = computed(() => themeMode.value)
  const currentActualThemeMode = computed(() => actualThemeMode.value)
  const isDarkMode = computed(() => actualThemeMode.value === 'dark')
  const isAutoMode = computed(() => themeMode.value === THEME_MODE.AUTO)

  // actions
  const setTitle = (newTitle) => {
    title.value = newTitle
  }

  // 新的主题系统方法
  const setThemeMode = (mode) => {
    themeMode.value = mode
    updateActualThemeMode()
    saveThemeConfig()
  }

  const updateActualThemeMode = () => {
    let newActualMode = themeMode.value

    if (themeMode.value === THEME_MODE.AUTO) {
      newActualMode = getSystemThemeMode()
    }

    actualThemeMode.value = newActualMode
    applyThemeMode(newActualMode)
  }

  const applyCurrentTheme = () => {
    applyThemeMode(actualThemeMode.value)
  }

  const saveThemeConfig = () => {
    saveThemeToStorage({
      mode: themeMode.value
    })
  }

  const loadThemeConfig = () => {
    const config = getThemeFromStorage()
    themeMode.value = config.mode
    updateActualThemeMode()
  }

  const toggleThemeMode = () => {
    if (themeMode.value === THEME_MODE.LIGHT) {
      setThemeMode(THEME_MODE.DARK)
    } else if (themeMode.value === THEME_MODE.DARK) {
      setThemeMode(THEME_MODE.AUTO)
    } else {
      setThemeMode(THEME_MODE.LIGHT)
    }
  }

  const setSidebarTheme = (newTheme) => {
    sidebarTheme.value = newTheme
  }

  const toggleSidebarTheme = () => {
    const newTheme = sidebarTheme.value === 'dark' ? 'light' : 'dark'
    setSidebarTheme(newTheme)
  }

  const setSidebarCollapsed = (collapsed) => {
    sidebarCollapsed.value = collapsed
  }

  const toggleSidebarCollapsed = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  const initNewThemeSystem = () => {
    // 加载保存的主题配置
    loadThemeConfig()

    // 如果是自动模式，监听系统主题变化
    if (themeMode.value === THEME_MODE.AUTO) {
      watchSystemThemeChange((systemMode) => {
        if (themeMode.value === THEME_MODE.AUTO) {
          actualThemeMode.value = systemMode
          applyCurrentTheme()
        }
      })
    }
  }

  // 锁屏相关方法
  const setLockStatus = (status) => {
    isLocked.value = status
  }

  const lockScreen = () => {
    isLocked.value = true
  }

  const unlockScreen = () => {
    isLocked.value = false
  }

  // 设置锁屏密码
  const setLockPassword = (password) => {
    lockPassword.value = password
  }

  // 清除锁屏密码
  const clearLockPassword = () => {
    lockPassword.value = ''
  }

  // 刷新相关方法
  const triggerRefresh = () => {
    // 先重置状态，确保状态变化能被监听到
    shouldRefresh.value = false
    // 使用nextTick确保状态重置后再设置为true
    setTimeout(() => {
      shouldRefresh.value = true
    }, 0)
  }

  const resetRefresh = () => {
    shouldRefresh.value = false
  }

  // 初始化菜单数据
  const initMenuItems = () => {
    const userStore = useUserStore()
    const items = []

    // 递归提取菜单项，只缓存最深层的子菜单
    const extractMenuItems = (routes, parentPath = '') => {
      routes.forEach(route => {
        // 跳过隐藏的菜单项、Layout根路由、登录页面、404页面等
        if (route.meta?.hide ||
          route.meta?.hidden ||
          route.name === 'Layout' ||
          route.name === 'Login' ||
          route.name === 'NotFound' ||
          (route.path && route.path.includes('pathMatch'))) {
          if (route.children) {
            extractMenuItems(route.children, parentPath)
          }
          return
        }

        // 如果有子路由，递归处理子路由，不添加当前路由
        if (route.children && route.children.length > 0) {
          extractMenuItems(route.children, route.path)
        } else {
          // 只有没有子路由的最深层菜单项才添加到缓存中
          if (route.meta?.title) {
            items.push({
              title: route.meta.title,
              icon: route.meta.icon || 'default',
              path: route.path,
              name: route.name
            })
          }
        }
      })
    }

    // 使用用户的完整菜单路由（包含权限过滤后的动态路由）
    extractMenuItems(userStore.menuRoutes)
    menuItems.value = items
  }

  // 搜索菜单项
  const searchMenuItems = (keyword) => {
    if (!keyword.trim()) {
      return []
    }

    const lowerKeyword = keyword.toLowerCase()
    return menuItems.value.filter(item =>
      item.title.toLowerCase().includes(lowerKeyword)
    )
  }

  // 面包屑导航显示控制
  const setBreadcrumbVisible = (visible) => {
    showBreadcrumb.value = visible
  }

  const toggleBreadcrumbVisible = () => {
    showBreadcrumb.value = !showBreadcrumb.value
  }

  // 页签组件显示控制
  const setPageTagsVisible = (visible) => {
    showPageTags.value = visible
  }

  const togglePageTagsVisible = () => {
    showPageTags.value = !showPageTags.value
  }

  // 页签组件抬高效果控制
  const setPageTagsElevation = (visible) => {
    showPageTagsElevation.value = visible
  }

  const togglePageTagsElevation = () => {
    showPageTagsElevation.value = !showPageTagsElevation.value
  }

  return {
    title,
    sidebarTheme,
    sidebarCollapsed,
    shouldRefresh,
    menuItems,
    isLocked,
    lockPassword,
    themeMode,
    actualThemeMode,
    currentTitle,
    currentSidebarTheme,
    isSidebarCollapsed,
    lockStatus,
    currentLockPassword,
    currentThemeMode,
    currentActualThemeMode,
    isDarkMode,
    isAutoMode,
    setTitle,
    setSidebarTheme,
    toggleSidebarTheme,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
    setThemeMode,
    toggleThemeMode,
    updateActualThemeMode,
    applyCurrentTheme,
    saveThemeConfig,
    loadThemeConfig,
    initNewThemeSystem,
    setLockStatus,
    lockScreen,
    unlockScreen,
    setLockPassword,
    clearLockPassword,
    triggerRefresh,
    resetRefresh,
    initMenuItems,
    searchMenuItems,
    showBreadcrumb,
    showPageTags,
    showPageTagsElevation,
    breadcrumbVisible,
    pageTagsVisible,
    pageTagsElevationVisible,
    setBreadcrumbVisible,
    toggleBreadcrumbVisible,
    setPageTagsVisible,
    togglePageTagsVisible,
    setPageTagsElevation,
    togglePageTagsElevation
  }
})