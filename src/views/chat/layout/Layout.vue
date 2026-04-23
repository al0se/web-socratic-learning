<script setup lang='ts'>
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useChatStore } from '@/store'
import Sider from './sider/index.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const chatStore = useChatStore()

if (route.name === 'Root')
  router.replace({ name: 'Chat', params: { uuid: chatStore.active } })

const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)
const sidebarOffset = computed(() => {
  if (isMobile.value)
    return ''
  return collapsed.value ? 'pl-[60px]' : 'pl-[220px]'
})

const getMobileClass = computed(() => {
  if (isMobile.value)
    return ['rounded-none', 'shadow-none']
  return []
})

const getContainerClass = computed(() => {
  return [
    'h-full',
    sidebarOffset.value,
  ]
})
</script>

<template>
  <div class="h-full bg-[var(--dt-background)] transition-all">
    <div class="h-full overflow-hidden" :class="getMobileClass">
      <NLayout class="z-40 transition" :class="getContainerClass" has-sider>
        <Sider />
        <NLayoutContent class="h-full bg-[var(--dt-background)]">
          <RouterView v-slot="{ Component, route: pageRoute }">
            <component :is="Component" :key="pageRoute.fullPath" />
          </RouterView>
        </NLayoutContent>
      </NLayout>
    </div>
  </div>
</template>
