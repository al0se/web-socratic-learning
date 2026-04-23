import { enUS, zhCN } from 'naive-ui'
import { setLocale } from '@/locales'
import { useAppStore } from '@/store'

export function useLanguage() {
  const appStore = useAppStore()

  const language = computed(() => {
    switch (appStore.language) {
      case 'en-US':
        setLocale('en-US')
        return enUS
      case 'zh-CN':
        setLocale('zh-CN')
        return zhCN
      default:
        setLocale('zh-CN')
        return zhCN
    }
  })

  return { language }
}
