<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { AnnounceConfig } from '@/components/common/Setting/model'
import { fetchAnnouncement } from '@/api'
import { Watermark } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useAuthStore, useChatStore } from '@/store'
import Footer from './Footer.vue'
import List from './List.vue'

const { t } = useI18n()

const config = ref<AnnounceConfig>()

const appStore = useAppStore()
const authStore = useAuthStore()
const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)

const navItems = computed(() => [
  {
    key: 'knowledge',
    label: t('sidebar.knowledge'),
    path: '/knowledge',
  },
  {
    key: 'memory',
    label: t('sidebar.memory'),
    path: '/memory',
  },
  {
    key: 'chat',
    label: t('sidebar.chat'),
    path: '/chat',
  },
])

const isDesktopCollapsed = computed(() => collapsed.value && !isMobile.value)

async function handleAdd() {
  await chatStore.addNewChatRoom()
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

async function handleNavigate(to: RouteLocationRaw) {
  await router.push(to)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function isActive(path: string) {
  return path === '/chat'
    ? route.path.startsWith('/chat')
    : route.path.startsWith(path)
}

const getMobileClass = computed<CSSProperties>(() => {
  if (isMobile.value) {
    return {
      position: 'fixed',
      zIndex: 50,
    }
  }
  return {}
})

const mobileSafeArea = computed(() => {
  if (isMobile.value) {
    return {
      paddingBottom: 'env(safe-area-inset-bottom)',
    }
  }
  return {}
})

watch(
  isMobile,
  (val) => {
    appStore.setSiderCollapsed(val)
  },
  {
    immediate: true,
    flush: 'post',
  },
)

const notice_text = ref('')
const showNotice = ref(false)

function closeModal() {
  showNotice.value = false
}

function doNotShowToday() {
  const today = new Date().toDateString()
  localStorage.setItem('announcementLastClosed', today)
  closeModal()
}

function checkDoNotShowToday() {
  const today = new Date().toDateString()
  const lastClosed = localStorage.getItem('announcementLastClosed')
  if (lastClosed === today)
    showNotice.value = false
}

async function fetchAnnounce() {
  try {
    // Load announcement config from the database.
    const { data } = await fetchAnnouncement()
    config.value = data
    if (config.value) {
      if (config.value.enabled)
        showNotice.value = true
      checkDoNotShowToday()
      return config.value
    }
  }
  catch (error) {
    console.error('Error fetching the announcement:', error)
  }
}

onMounted(async () => {
  const data = await fetchAnnounce()
  notice_text.value = `${data?.announceWords}`
})
</script>

<template>
  <NLayoutSider
    class="deeptutor-sidebar"
    :class="{ 'deeptutor-sidebar--collapsed': isDesktopCollapsed }"
    :collapsed="collapsed"
    :collapsed-width="isMobile ? 0 : 60"
    :width="220"
    :show-trigger="false"
    collapse-mode="width"
    position="absolute"
    :bordered="false"
    :style="getMobileClass"
    @update-collapsed="handleUpdateCollapsed"
  >
    <div class="flex h-full flex-col overflow-hidden bg-[var(--dt-secondary)] text-[var(--dt-foreground)] transition-all duration-200" :style="mobileSafeArea">
      <template v-if="isDesktopCollapsed">
        <div class="group/sb flex h-full flex-col items-center py-3">
          <div class="relative mb-2 flex h-9 w-9 items-center justify-center">
            <button
              class="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-opacity duration-150 group-hover/sb:opacity-0"
              :aria-label="t('sidebar.catHome')"
              @click="handleNavigate({ path: '/chat' })"
            >
              🐱
            </button>
            <button
              class="absolute inset-0 flex items-center justify-center rounded-lg text-[var(--dt-muted-foreground)] opacity-0 transition-all duration-150 hover:bg-[var(--dt-background)]/60 hover:text-[var(--dt-foreground)] group-hover/sb:opacity-100"
              :aria-label="t('sidebar.expand')"
              @click="handleUpdateCollapsed"
            >
              <IconRiSidebarUnfoldLine class="text-base" />
            </button>
          </div>

          <button
            class="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--dt-border)]/50 bg-[var(--dt-background)]/40 text-[var(--dt-foreground)] shadow-sm transition-all duration-150 hover:border-[var(--dt-border)] hover:bg-[var(--dt-background)]/80"
            :title="t('sidebar.newChat')"
            :aria-label="t('sidebar.newChat')"
            :disabled="!!authStore.session?.auth && !authStore.token && !authStore.session?.authProxyEnabled"
            @click="handleAdd"
          >
            <IconRiAddLine class="text-base" />
          </button>

          <div class="my-1.5 h-px w-7 bg-[var(--dt-border)]/40" />

          <nav class="flex w-full flex-col items-center gap-1 px-1.5">
            <button
              v-for="item in navItems"
              :key="item.key"
              class="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-150"
              :class="isActive(item.path)
                ? 'bg-[var(--dt-primary-soft)] text-[var(--dt-primary)] shadow-sm'
                : 'text-[var(--dt-muted-foreground)] hover:bg-[var(--dt-background)]/50 hover:text-[var(--dt-foreground)]'"
              :title="item.label"
              @click="handleNavigate({ path: item.path })"
            >
              <span v-if="isActive(item.path)" class="absolute -left-1.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--dt-primary)]" />
              <IconRiMessage3Line v-if="item.key === 'chat'" class="text-lg" />
              <IconRiBookOpenLine v-else-if="item.key === 'knowledge'" class="text-lg" />
              <IconRiBrainLine v-else class="text-lg" />
            </button>
          </nav>

          <div class="flex-1" />
          <Footer collapsed />
        </div>
      </template>

      <template v-else>
        <div class="flex h-14 items-center justify-between px-4">
          <button class="group flex min-w-0 items-center gap-2" @click="handleNavigate({ path: '/chat' })">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl transition-transform duration-200 group-hover:scale-105">
              🐱
            </span>
          </button>
          <button
            v-if="!isMobile"
            class="rounded-md p-1 text-[var(--dt-muted-foreground)] transition-colors hover:text-[var(--dt-foreground)]"
            :aria-label="t('sidebar.collapse')"
            @click="handleUpdateCollapsed"
          >
            <IconRiSidebarFoldLine class="text-base" />
          </button>
        </div>

        <main class="flex min-h-0 flex-1 flex-col">
          <nav class="px-2 pt-1">
            <div class="space-y-px">
              <button
                class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] text-[var(--dt-muted-foreground)] transition-colors hover:bg-[var(--dt-background)]/60 hover:text-[var(--dt-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!!authStore.session?.auth && !authStore.token && !authStore.session?.authProxyEnabled"
                @click="handleAdd"
              >
                <IconRiAddLine class="text-base" />
                <span>{{ t('sidebar.newChat') }}</span>
              </button>

              <div v-for="item in navItems" :key="item.key">
                <button
                  class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors"
                  :class="isActive(item.path)
                    ? 'bg-[var(--dt-primary-soft)] font-medium text-[var(--dt-primary)]'
                    : 'text-[var(--dt-muted-foreground)] hover:bg-[var(--dt-background)]/50 hover:text-[var(--dt-foreground)]'"
                  @click="handleNavigate({ path: item.path })"
                >
                  <IconRiMessage3Line v-if="item.key === 'chat'" class="text-base" />
                  <IconRiBookOpenLine v-else-if="item.key === 'knowledge'" class="text-base" />
                  <IconRiBrainLine v-else class="text-base" />
                  <span>{{ item.label }}</span>
                </button>
                <div v-if="item.key === 'chat' && (route.path.startsWith('/chat') || chatStore.chatRooms.length)" class="max-h-[calc(100vh-332px)] min-h-0 overflow-y-auto">
                  <List />
                </div>
              </div>
            </div>
          </nav>
        </main>

        <Footer />
      </template>
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="fixed inset-0 z-40 bg-black/40" @click="handleUpdateCollapsed" />
  </template>
  <NModal v-model:show="showNotice" :auto-focus="false" preset="card" :style="{ width: !isMobile ? '33%' : '90%' }">
    <div class="p-4 space-y-5 min-h-[200px]">
      <div class="w-full markdown-body" v-html="notice_text" />
    </div>
    <div class="buttons-container">
      <div class="button-wrapper">
        <NButton type="primary" @click="closeModal">
          关闭公告
        </NButton>
      </div>
      <div class="button-wrapper">
        <NButton type="default" @click="doNotShowToday">
          今日不再提示
        </NButton>
      </div>
    </div>
  </NModal>
  <Watermark v-if="authStore.session?.showWatermark" />
</template>

<style scoped>
.deeptutor-sidebar {
  --dt-background: #FFFFFF;
  --dt-foreground: #1F2937;
  --dt-secondary: #FFFFFF;
  --dt-muted: #F3F4F6;
  --dt-muted-foreground: #6B7280;
  --dt-border: #E5E7EB;
  --dt-primary: #4B9E5F;
  --dt-primary-soft: rgba(75, 158, 95, 0.12);
  --dt-destructive: #C53A2C;
  height: 100%;
  transition: width 0.2s ease;
}

:global(.dark) .deeptutor-sidebar {
  --dt-background: #24272E;
  --dt-foreground: #F9FAFB;
  --dt-secondary: #202329;
  --dt-muted: #2F333B;
  --dt-muted-foreground: #A1A1AA;
  --dt-border: #3F444D;
  --dt-primary: #63B876;
  --dt-primary-soft: rgba(99, 184, 118, 0.16);
  --dt-destructive: #D44A3C;
}

:deep(.n-layout-sider-scroll-container) {
  overflow: hidden;
}

.buttons-container {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}

.button-wrapper {
  margin-left: 10px;
}
</style>
