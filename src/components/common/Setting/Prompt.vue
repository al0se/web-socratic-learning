<script lang="ts" setup>
import { fetchUpdateChatRoomPrompt } from '@/api'
import { useChatStore } from '@/store'
import defaultPromptText from '../../../../prompt/prompt.txt?raw'

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const { t } = useI18n()

const chatStore = useChatStore()
const currentChatHistory = computed(() => chatStore.getChatRoomByCurrentActive)
const ms = useMessage()
const testing = ref(false)
const promptDraft = ref('')
const fallbackPrompt = defaultPromptText.trim() || defaultPromptText
const title = computed(() => `Prompt For [${currentChatHistory.value?.title ?? ''}]`)

interface Props {
  visible: boolean
  roomId: string
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
}

const show = computed({
  get() {
    return props.visible
  },
  set(visible: boolean) {
    emit('update:visible', visible)
  },
})

function syncPromptDraft() {
  const roomPrompt = currentChatHistory.value?.prompt
  promptDraft.value = roomPrompt && roomPrompt.trim() !== '' ? roomPrompt : fallbackPrompt
}

watch(
  [show, () => currentChatHistory.value?.roomId],
  ([visible]) => {
    if (visible)
      syncPromptDraft()
  },
  { immediate: true },
)

async function handleSaveChatRoomPrompt() {
  if (!currentChatHistory.value)
    return

  const promptToSave = promptDraft.value.trim() !== '' ? promptDraft.value : fallbackPrompt

  testing.value = true
  try {
    const { message } = await fetchUpdateChatRoomPrompt(promptToSave, +props.roomId) as { status: string, message: string }
    currentChatHistory.value.prompt = promptToSave
    ms.success(message)
    show.value = false
  }
  catch (error: any) {
    ms.error(error.message)
  }
  testing.value = false
}
</script>

<template>
  <NModal
    v-model:show="show"
    :auto-focus="false"
    class="custom-card"
    preset="card"
    :style="{ width: '600px' }"
    :title="title"
    size="huge"
    :bordered="false"
  >
    <NInput
      v-model:value="promptDraft"
      type="textarea"
      :autosize="{ minRows: 4, maxRows: 10 }"
      placeholder="Defaults to prompt/prompt.txt. Saving an empty value falls back to that file."
    />
    <template #footer>
      <NSpace justify="end">
        <NButton :loading="testing" type="success" @click="handleSaveChatRoomPrompt">
          {{ t('common.save') }}
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
