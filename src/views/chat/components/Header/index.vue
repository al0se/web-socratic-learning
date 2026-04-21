<script lang="ts" setup>
import { HoverButton } from '@/components/common'
import IconPrompt from '@/icons/Prompt.vue'
import { useAppStore, useChatStore } from '@/store'

defineProps<Props>()

const emit = defineEmits<Emit>()

interface Props {
  showPrompt: boolean
}

interface Emit {
  (ev: 'export'): void
  (ev: 'toggleShowPrompt'): void
}

const appStore = useAppStore()
const chatStore = useChatStore()

const collapsed = computed(() => appStore.siderCollapsed)
const currentChatHistory = computed(() => chatStore.getChatRoomByCurrentActive)

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function onScrollToTop() {
  const scrollRef = document.querySelector('#scrollRef')
  if (scrollRef)
    nextTick(() => scrollRef.scrollTop = 0)
}

function handleExport() {
  emit('export')
}
</script>

<template>
  <header
    class="sticky top-0 left-0 right-0 z-30 border-b dark:border-neutral-800 bg-white/80 dark:bg-black/20 backdrop-blur-sm"
  >
    <div class="relative flex items-center justify-between min-w-0 overflow-hidden h-14">
      <div class="flex items-center">
        <button
          class="flex items-center justify-center w-11 h-11"
          @click="handleUpdateCollapsed"
        >
          <IconRiAlignJustify v-if="collapsed" class="text-2xl" />
          <IconRiAlignRight v-else class="text-2xl" />
        </button>
      </div>
      <h1
        class="flex-1 px-4 pr-6 overflow-hidden cursor-pointer select-none text-ellipsis whitespace-nowrap"
        @dblclick="onScrollToTop"
      >
        {{ currentChatHistory?.title ?? '' }}
      </h1>
      <div class="flex items-center space-x-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          class="flex items-center justify-center h-10 cursor-not-allowed opacity-60"
          style="flex-flow:row nowrap;min-width:2.5em;padding:.5em;border-radius:.5em;"
        >
          <span class="text-xl text-[#9ca3af] dark:text-neutral-500">
            <IconPrompt class="w-[20px] m-auto" />
          </span>
        </button>
        <HoverButton @click="handleExport">
          <span class="text-xl text-[#4f555e] dark:text-white">
            <IconRiDownload2Line />
          </span>
        </HoverButton>
      </div>
    </div>
  </header>
</template>
