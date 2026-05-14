<script setup lang="ts">
import type { QuizConfig } from '../utils/quiz'
import { summarizeQuizConfig } from '../utils/quiz'

const props = defineProps<{
  value: QuizConfig
}>()

const emit = defineEmits<{
  (ev: 'update:value', value: QuizConfig): void
}>()

const { t } = useI18n()

const collapsed = ref(false)

const countValue = computed({
  get: () => props.value.num_questions,
  set: value => updateConfig('num_questions', Math.max(1, Math.min(50, Number(value) || 1))),
})

function updateConfig<K extends keyof QuizConfig>(key: K, value: QuizConfig[K]) {
  emit('update:value', { ...props.value, [key]: value })
}
</script>

<template>
  <div class="rounded-lg border border-[#e5e7eb] bg-white/95 dark:border-[#414755] dark:bg-[#2f3440]">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
    >
      <span class="flex min-w-0 items-center gap-2 text-sm font-semibold text-[#1f2937] dark:text-white">
        <IconRiQuestionnaireLine class="shrink-0 text-base" />
        <span>{{ t('chat.quiz.settings') }}</span>
      </span>
      <span class="flex min-w-0 items-center gap-2 text-xs text-[#6b7280] dark:text-[#c2c8d1]">
        <span class="truncate">{{ summarizeQuizConfig(value, t) }}</span>
        <IconRiArrowDownSLine
          class="shrink-0 text-lg transition-transform duration-200"
          :class="{ 'rotate-180': !collapsed }"
        />
      </span>
    </button>

    <div v-show="!collapsed" class="flex flex-wrap items-end gap-3 border-t border-[#e5e7eb] px-3 py-3 dark:border-[#414755]">
      <div class="flex w-[92px] flex-col gap-1">
        <span class="text-xs text-[#6b7280] dark:text-[#c2c8d1]">{{ t('chat.quiz.count') }}</span>
        <NInputNumber
          v-model:value="countValue"
          size="small"
          :min="1"
          :max="50"
          button-placement="both"
        />
      </div>

      <div class="flex w-[132px] flex-col gap-1">
        <span class="text-xs text-[#6b7280] dark:text-[#c2c8d1]">{{ t('chat.quiz.difficulty') }}</span>
        <NSelect
          size="small"
          :value="value.difficulty"
          :options="[
            { label: t('chat.quiz.auto'), value: 'auto' },
            { label: t('chat.quiz.easy'), value: 'easy' },
            { label: t('chat.quiz.medium'), value: 'medium' },
            { label: t('chat.quiz.hard'), value: 'hard' },
          ]"
          @update:value="value => updateConfig('difficulty', value)"
        />
      </div>

      <div class="flex w-[148px] flex-col gap-1">
        <span class="text-xs text-[#6b7280] dark:text-[#c2c8d1]">{{ t('chat.quiz.type') }}</span>
        <NSelect
          size="small"
          :value="value.question_type"
          :options="[
            { label: t('chat.quiz.auto'), value: 'auto' },
            { label: t('chat.quiz.choice'), value: 'choice' },
            { label: t('chat.quiz.written'), value: 'written' },
          ]"
          @update:value="value => updateConfig('question_type', value)"
        />
      </div>
    </div>
  </div>
</template>
