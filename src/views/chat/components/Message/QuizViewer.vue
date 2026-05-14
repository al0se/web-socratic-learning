<script setup lang="ts">
import type { QuizQuestion } from '../../utils/quiz'
import mdKatex from '@vscode/markdown-it-katex'
import MarkdownIt from 'markdown-it'
import mila from 'markdown-it-link-attributes'
import { fetchQuizAnswerHistory, fetchSaveQuizAnswerHistory } from '@/api'
import { quizTypeLabel } from '../../utils/quiz'

interface AnswerState {
  selected: string | null
  typed: string
  submitted: boolean
}

const props = defineProps<{
  questions: QuizQuestion[]
  roomId?: number
  chatUuid?: number
}>()

const { t } = useI18n()

const currentIndex = ref(0)
const answers = reactive<Record<number, AnswerState>>({})
const saveTimers = new Map<number, ReturnType<typeof setTimeout>>()

const mdi = new MarkdownIt({
  html: false,
  linkify: true,
})

mdi.use(mila, { attrs: { target: '_blank', rel: 'noopener' } })
mdi.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })

const currentQuestion = computed(() => props.questions[currentIndex.value])
const currentAnswer = computed(() => answers[currentIndex.value] ?? { selected: null, typed: '', submitted: false })
const completedCount = computed(() => Object.values(answers).filter(answer => answer.submitted).length)
const progress = computed(() => props.questions.length ? ((currentIndex.value + 1) / props.questions.length) * 100 : 0)
const isChoice = computed(() => {
  const question = currentQuestion.value
  return question?.question_type === 'choice' && question.options && Object.keys(question.options).length > 0
})
const isCorrect = computed(() => {
  const question = currentQuestion.value
  const answer = currentAnswer.value
  if (!question || !answer.submitted)
    return null
  return isAnswerCorrect(question, answer)
})

function renderMarkdown(value: string | undefined) {
  return mdi.render(value || '')
}

function ensureAnswer(index = currentIndex.value) {
  if (!answers[index])
    answers[index] = { selected: null, typed: '', submitted: false }
  return answers[index]
}

function setSelected(value: string) {
  ensureAnswer().selected = value
  saveAnswer(currentIndex.value)
}

function setTyped(value: string) {
  ensureAnswer().typed = value
  saveAnswer(currentIndex.value, 500)
}

function submitAnswer() {
  const answer = ensureAnswer()
  answer.submitted = true
  saveAnswer(currentIndex.value)
}

function resetAnswer() {
  answers[currentIndex.value] = { selected: null, typed: '', submitted: false }
  saveAnswer(currentIndex.value)
}

function getUserAnswer(question: QuizQuestion | undefined, answer: AnswerState) {
  if (!question)
    return ''
  if (question.question_type === 'choice' && question.options && Object.keys(question.options).length > 0)
    return answer.selected ?? ''
  return answer.typed.trim()
}

function isAnswerCorrect(question: QuizQuestion, answer: AnswerState) {
  const value = getUserAnswer(question, answer)
  if (!value)
    return false

  const correct = question.correct_answer.trim()
  if (question.question_type === 'choice') {
    return value.toUpperCase() === correct.toUpperCase()
      || value.toUpperCase() === correct.charAt(0).toUpperCase()
  }

  return value.toLowerCase() === correct.toLowerCase()
}

function optionClass(key: string) {
  const question = currentQuestion.value
  const answer = currentAnswer.value
  const selected = answer.selected === key
  const correctKey = question?.correct_answer.trim().charAt(0).toUpperCase()
  const correct = key.toUpperCase() === correctKey

  if (!answer.submitted && selected)
    return 'border-[#2563eb] bg-[#eff6ff] text-[#1f2937] ring-1 ring-[#2563eb]/20 dark:border-[#60a5fa] dark:bg-[#1d2a44] dark:text-white'
  if (answer.submitted && correct)
    return 'border-[#22c55e] bg-[#f0fdf4] text-[#166534] dark:border-[#15803d] dark:bg-[#052e16] dark:text-[#bbf7d0]'
  if (answer.submitted && selected && !correct)
    return 'border-[#f87171] bg-[#fef2f2] text-[#991b1b] dark:border-[#b91c1c] dark:bg-[#450a0a] dark:text-[#fecaca]'
  return 'border-[#e5e7eb] bg-white text-[#1f2937] hover:border-[#2563eb]/30 hover:bg-[#eff6ff]/40 dark:border-[#414755] dark:bg-[#111827] dark:text-white dark:hover:border-[#60a5fa]/40'
}

function questionStorageKey(question: QuizQuestion, index: number) {
  let hash = 0
  for (let charIndex = 0; charIndex < question.question.length; charIndex += 1)
    hash = Math.imul(31, hash) + question.question.charCodeAt(charIndex) | 0

  return `${question.question_id || `q_${index + 1}`}:${Math.abs(hash).toString(36)}`
}

function clearAnswers() {
  Object.keys(answers).forEach((key) => {
    delete answers[Number(key)]
  })
}

async function loadAnswers() {
  clearAnswers()

  if (!props.roomId || !props.chatUuid)
    return

  const response = await fetchQuizAnswerHistory(props.roomId, props.chatUuid)
  const savedAnswers = response.data || []

  props.questions.forEach((question, index) => {
    const questionId = questionStorageKey(question, index)
    const saved = savedAnswers.find(item =>
      item.questionIndex === index && item.questionId === questionId,
    )
    if (saved) {
      answers[index] = {
        selected: saved.selected,
        typed: saved.typed || '',
        submitted: !!saved.submitted,
      }
    }
  })
}

function saveAnswer(index: number, delay = 0) {
  const existingTimer = saveTimers.get(index)
  if (existingTimer)
    clearTimeout(existingTimer)

  const run = () => {
    saveTimers.delete(index)

    const question = props.questions[index]
    const answer = answers[index]
    if (!props.roomId || !props.chatUuid || !question || !answer)
      return

    void fetchSaveQuizAnswerHistory({
      roomId: props.roomId,
      chatUuid: props.chatUuid,
      questionId: questionStorageKey(question, index),
      questionIndex: index,
      selected: answer.selected,
      typed: answer.typed,
      submitted: answer.submitted,
      isCorrect: answer.submitted ? isAnswerCorrect(question, answer) : null,
    })
  }

  if (delay > 0) {
    saveTimers.set(index, setTimeout(run, delay))
    return
  }

  run()
}

watch(
  () => [props.roomId, props.chatUuid, props.questions.map(questionStorageKey).join('|')],
  () => {
    void loadAnswers()
  },
  { immediate: true },
)

onUnmounted(() => {
  saveTimers.forEach(timer => clearTimeout(timer))
  saveTimers.clear()
})
</script>

<template>
  <div v-if="currentQuestion" class="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white text-[#1f2937] shadow-sm dark:border-[#414755] dark:bg-[#151923] dark:text-white">
    <div class="flex items-center gap-2 border-b border-[#e5e7eb] px-3 py-2 dark:border-[#414755]">
      <span class="mr-1 text-xs font-semibold text-[#6b7280] dark:text-[#c2c8d1]">
        {{ completedCount }}/{{ questions.length }}
      </span>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="(_, index) in questions"
          :key="index"
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition"
          :class="[
            index === currentIndex
              ? 'bg-[#2563eb] text-white shadow-sm'
              : answers[index]?.submitted
                ? 'bg-[#dbeafe] text-[#2563eb] dark:bg-[#1d4ed8]/20 dark:text-[#93c5fd]'
                : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] dark:bg-[#2f3440] dark:text-[#c2c8d1] dark:hover:bg-[#414755]',
          ]"
          @click="currentIndex = index"
        >
          <IconRiCheckLine v-if="answers[index]?.submitted && index !== currentIndex" class="text-sm" />
          <span v-else>{{ index + 1 }}</span>
        </button>
      </div>
    </div>

    <div class="px-4 py-3">
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="rounded-md bg-[#f3f4f6] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#6b7280] dark:bg-[#2f3440] dark:text-[#c2c8d1]">
            Q{{ currentIndex + 1 }}
          </span>
          <span
            v-if="currentQuestion.difficulty"
            class="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase"
            :class="[
              currentQuestion.difficulty === 'hard'
                ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
                : currentQuestion.difficulty === 'medium'
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400',
            ]"
          >
            {{ t(`chat.quiz.${currentQuestion.difficulty}`) }}
          </span>
          <span class="rounded-md bg-[#f3f4f6] px-1.5 py-0.5 text-[10px] font-semibold text-[#6b7280] dark:bg-[#2f3440] dark:text-[#c2c8d1]">
            {{ quizTypeLabel(currentQuestion.question_type, t) }}
          </span>
        </div>
      </div>

      <div class="mb-3 text-[14px] leading-relaxed markdown-body" v-html="renderMarkdown(currentQuestion.question)" />

      <div v-if="isChoice" class="space-y-1.5">
        <button
          v-for="(option, key) in currentQuestion.options"
          :key="key"
          type="button"
          :disabled="currentAnswer.submitted"
          class="flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] transition"
          :class="optionClass(String(key))"
          @click="setSelected(String(key))"
        >
          <span class="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold">
            <IconRiCheckLine v-if="currentAnswer.submitted && String(key).toUpperCase() === currentQuestion.correct_answer.trim().charAt(0).toUpperCase()" class="text-xs" />
            <span v-else>{{ key }}</span>
          </span>
          <span class="leading-relaxed">{{ option }}</span>
        </button>
      </div>

      <div v-else>
        <NInput
          :value="currentAnswer.typed"
          type="textarea"
          :disabled="currentAnswer.submitted"
          :autosize="{ minRows: 3, maxRows: 8 }"
          :placeholder="t('chat.quiz.answerPlaceholder')"
          @update:value="setTyped"
        />
      </div>

      <div class="mt-3 flex items-center gap-2">
        <NButton
          v-if="!currentAnswer.submitted"
          type="primary"
          size="small"
          :disabled="isChoice ? !currentAnswer.selected : !currentAnswer.typed.trim()"
          @click="submitAnswer"
        >
          <template #icon>
            <IconRiEyeLine />
          </template>
          {{ t('chat.quiz.checkAnswer') }}
        </NButton>
        <template v-else>
          <span
            v-if="isChoice && isCorrect !== null"
            class="rounded-md px-2 py-0.5 text-[11px] font-semibold"
            :class="isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'"
          >
            {{ isCorrect ? t('chat.quiz.correct') : t('chat.quiz.incorrect') }}
          </span>
          <NButton size="small" secondary @click="resetAnswer">
            <template #icon>
              <IconRiRestartLine />
            </template>
            {{ t('chat.quiz.retry') }}
          </NButton>
        </template>
      </div>

      <div v-if="currentAnswer.submitted" class="mt-3 space-y-2 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 dark:border-[#414755] dark:bg-[#111827]">
        <div v-if="!isChoice && currentQuestion.correct_answer">
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#c2c8d1]">
            {{ t('chat.quiz.referenceAnswer') }}
          </div>
          <div class="text-[13px] leading-relaxed markdown-body" v-html="renderMarkdown(currentQuestion.correct_answer)" />
        </div>
        <div v-if="currentQuestion.explanation">
          <div class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#c2c8d1]">
            {{ t('chat.quiz.explanation') }}
          </div>
          <div class="text-[13px] leading-relaxed markdown-body" v-html="renderMarkdown(currentQuestion.explanation)" />
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-[#e5e7eb] px-3 py-2 dark:border-[#414755]">
      <NButton size="tiny" quaternary :disabled="currentIndex === 0" @click="currentIndex = Math.max(0, currentIndex - 1)">
        <template #icon>
          <IconRiArrowLeftSLine />
        </template>
        {{ t('chat.quiz.previous') }}
      </NButton>
      <div class="mx-3 h-1 flex-1 overflow-hidden rounded-full bg-[#e5e7eb] dark:bg-[#2f3440]">
        <div class="h-full rounded-full bg-[#2563eb] transition-all duration-300" :style="{ width: `${progress}%` }" />
      </div>
      <NButton size="tiny" quaternary :disabled="currentIndex === questions.length - 1" @click="currentIndex = Math.min(questions.length - 1, currentIndex + 1)">
        {{ t('chat.quiz.next') }}
        <template #icon>
          <IconRiArrowRightSLine />
        </template>
      </NButton>
    </div>
  </div>
</template>
