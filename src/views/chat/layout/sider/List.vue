<script setup lang='ts'>
import { fetchRenameChatRoom } from '@/api'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useChatStore } from '@/store'
import { useAuthStoreWithout } from '@/store/modules/auth'
import { debounce } from '@/utils/functions/debounce'

const { t } = useI18n()

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const chatStore = useChatStore()
const authStore = useAuthStoreWithout()

const loadingRoom = ref(false)

const dataSources = computed(() => chatStore.chatRooms)

function groupLabel(timestamp?: number | string) {
  if (!timestamp)
    return t('sidebar.earlier')

  const numeric = Number(timestamp)
  const date = new Date(numeric > 100000000000 ? numeric : numeric * 1000)
  if (Number.isNaN(date.getTime()))
    return t('sidebar.earlier')

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfItemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diffDays = Math.floor((startOfToday - startOfItemDay) / 86400000)

  if (diffDays <= 0)
    return t('sidebar.today')
  if (diffDays === 1)
    return t('sidebar.yesterday')
  if (diffDays < 7)
    return t('sidebar.last7Days')
  return t('sidebar.earlier')
}

const groupedDataSources = computed(() => {
  const groups: { label: string, items: { item: Chat.ChatRoom, index: number }[] }[] = []
  dataSources.value.forEach((item, index) => {
    const label = groupLabel((item as any).updated_at || (item as any).updatedAt || item.roomId)
    const group = groups.find(group => group.label === label)
    if (group) {
      group.items.push({ item, index })
    }
    else {
      groups.push({ label, items: [{ item, index }] })
    }
  })
  return groups
})

onMounted(async () => {
  if (authStore.session == null || !authStore.session.auth || authStore.token || authStore.session?.authProxyEnabled)
    await handleSyncChatRoom()
})

async function handleSyncChatRoom() {
  loadingRoom.value = true
  await chatStore.syncHistory()
  loadingRoom.value = false
}

async function handleSelect({ roomId }: Chat.ChatRoom) {
  if (isActive(roomId))
    return

  await chatStore.setActive(roomId)

  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

async function handleEdit(chatRoom: Chat.ChatRoom, isEdit: boolean) {
  chatRoom.isEdit = isEdit
  if (!chatRoom.isEdit)
    await fetchRenameChatRoom(chatRoom.title, chatRoom.roomId)
}

function handleDelete(index: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  chatStore.deleteChatRoom(index)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

const handleDeleteDebounce = debounce(handleDelete, 600)

function isActive(uuid: number) {
  return chatStore.active === uuid
}
</script>

<template>
  <div class="ml-5 border-l border-[var(--dt-border)]/30 py-1">
    <NSpin :show="loadingRoom" size="small">
      <div class="text-sm">
        <template v-if="!dataSources.length">
          <div class="flex flex-col items-center py-4 pr-3 text-center text-[var(--dt-muted-foreground)]/70">
            <IconRiInboxLine class="mb-2 text-2xl" />
            <span>{{ t('common.noData') }}</span>
          </div>
        </template>
        <template v-else>
          <div v-for="(group, groupIndex) in groupedDataSources" :key="group.label">
            <div v-if="groupIndex > 0" class="my-1 ml-3 mr-2 border-t border-[var(--dt-border)]/20" />
            <div class="px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--dt-muted-foreground)]/40">
              {{ group.label }}
            </div>
            <div
              v-for="{ item, index } in group.items"
              :key="item.roomId"
              class="group flex cursor-pointer items-center gap-2 rounded-r-lg py-1 pl-3 pr-2 transition-colors"
              :class="isActive(item.roomId)
                ? 'bg-[var(--dt-primary-soft)] text-[var(--dt-primary)]'
                : 'text-[var(--dt-muted-foreground)] hover:bg-[var(--dt-background)]/40 hover:text-[var(--dt-foreground)]'"
              @click="handleSelect(item)"
            >
              <span
                class="block h-1.5 w-1.5 shrink-0 rounded-full"
                :class="isActive(item.roomId) ? 'bg-[var(--dt-primary)]' : 'bg-[var(--dt-muted-foreground)]/25'"
              />
              <NInput
                v-if="item.isEdit"
                v-model:value="item.title"
                size="tiny"
                class="min-w-0 flex-1"
                @click.stop
                @keydown.enter.stop="handleEdit(item, false)"
              />
              <span v-else class="min-w-0 flex-1 truncate text-[13px]" :class="{ 'font-medium': isActive(item.roomId) }">
                {{ item.title || t('sidebar.untitledChat') }}
              </span>
              <div class="flex shrink-0 items-center gap-px opacity-0 transition-opacity group-hover:opacity-100" :class="{ 'opacity-100': isActive(item.roomId) }">
                <template v-if="item.isEdit">
                  <button
                    class="rounded p-0.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]"
                    :aria-label="t('common.save')"
                    @click.stop="handleEdit(item, false)"
                  >
                    <IconRiSaveLine class="text-[10px]" />
                  </button>
                </template>
                <template v-else>
                  <button
                    class="rounded p-0.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)]"
                    :aria-label="t('common.edit')"
                    @click.stop="handleEdit(item, true)"
                  >
                    <IconRiEditLine class="text-[10px]" />
                  </button>
                  <NPopconfirm placement="bottom" @positive-click="handleDeleteDebounce(index, $event)">
                    <template #trigger>
                      <button
                        class="rounded p-0.5 text-[var(--dt-muted-foreground)] hover:text-[var(--dt-destructive)]"
                        :aria-label="t('common.delete')"
                        @click.stop
                      >
                        <IconRiDeleteBinLine class="text-[10px]" />
                      </button>
                    </template>
                    {{ t('chat.deleteHistoryConfirm') }}
                  </NPopconfirm>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
    </NSpin>
  </div>
</template>
