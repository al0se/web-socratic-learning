<script setup lang='ts'>
import { HoverButton, UserAvatar } from '@/components/common'
import { useAuthStore } from '@/store'

defineProps<{
  collapsed?: boolean
}>()

const { t } = useI18n()

const Setting = defineAsyncComponent(() => import('@/components/common/Setting/index.vue'))

const authStore = useAuthStore()

const show = ref(false)

async function handleLogout() {
  await authStore.removeToken()
}
</script>

<template>
  <footer
    class="min-w-0 overflow-hidden border-t border-[var(--dt-border)]/40"
    :class="collapsed ? 'flex w-full flex-col items-center gap-1 px-1.5 py-2' : 'flex items-center justify-between p-2 pl-4'"
  >
    <div v-if="!collapsed" class="flex-1 shrink-0 overflow-hidden">
      <UserAvatar />
    </div>
    <HoverButton v-if="!!authStore.token || !!authStore.session?.authProxyEnabled" class="-mr-1" :tooltip="t('common.logOut')" @click="handleLogout">
      <span class="text-lg font-semibold text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]">
        <IconUilExit />
      </span>
    </HoverButton>

    <HoverButton v-if="!!authStore.token || !!authStore.session?.authProxyEnabled" class="ml-0.5" :tooltip="t('setting.setting')" @click="show = true">
      <span class="text-lg font-semibold text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]">
        <IconRiSettings4Line />
      </span>
    </HoverButton>
    <Setting v-if="show" v-model:visible="show" />
  </footer>
</template>
