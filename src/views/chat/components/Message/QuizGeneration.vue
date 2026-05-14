<script setup lang="ts">
import type { QuizConfig } from '../../utils/quiz'
import { extractQuizQuestions } from '../../utils/quiz'
import QuizViewer from './QuizViewer.vue'

const props = defineProps<{
  text?: string
  loading?: boolean
  quizConfig?: QuizConfig
  roomId?: number
  chatUuid?: number
}>()

const { t } = useI18n()

const questions = computed(() => extractQuizQuestions(props.text))
const targetCount = computed(() => questions.value?.length || props.quizConfig?.num_questions || 3)
const hasQuestions = computed(() => !!questions.value?.length)
const showFormatWarning = computed(() => !props.loading && !!props.text?.trim() && !hasQuestions.value)

const stageRows = computed(() => {
  const rows = [
    {
      key: 'knowledge',
      label: t('chat.quiz.stage.retrieveKnowledge'),
      done: true,
      active: false,
    },
    {
      key: 'templates',
      label: t('chat.quiz.stage.generateTemplates'),
      done: hasQuestions.value || !!props.text?.trim(),
      active: props.loading && !hasQuestions.value,
    },
  ]

  for (let index = 0; index < targetCount.value; index++) {
    rows.push({
      key: `question-${index + 1}`,
      label: t('chat.quiz.stage.generateQuestion', { index: index + 1 }),
      done: hasQuestions.value ? index < (questions.value?.length || 0) : false,
      active: props.loading && !hasQuestions.value && index === 0,
    })
  }

  return rows
})
</script>

<template>
  <div class="w-full min-w-[280px] max-w-[920px] space-y-3 text-[#1f2937] dark:text-white">
    <div class="space-y-2 text-xs text-[#6b7280] dark:text-[#c2c8d1]">
      <div
        v-for="row in stageRows"
        :key="row.key"
        class="flex items-center gap-2"
      >
        <IconRiLoader4Line v-if="row.active" class="shrink-0 animate-spin text-sm" />
        <IconRiCheckLine v-else-if="row.done" class="shrink-0 text-sm text-[#16a34a]" />
        <IconRiArrowRightSLine v-else class="shrink-0 text-sm text-[#9ca3af]" />
        <span>{{ row.label }}</span>
      </div>
    </div>

    <QuizViewer
      v-if="questions"
      :questions="questions"
      :room-id="roomId"
      :chat-uuid="chatUuid"
    />

    <div
      v-else-if="showFormatWarning"
      class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
    >
      {{ t('chat.quiz.formatWarning') }}
    </div>

    <div
      v-else
      class="rounded-xl border border-[#e5e7eb] bg-white px-4 py-6 text-sm text-[#6b7280] dark:border-[#414755] dark:bg-[#151923] dark:text-[#c2c8d1]"
    >
      {{ t('chat.quiz.generating') }}
    </div>
  </div>
</template>
