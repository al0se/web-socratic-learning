<script setup lang="ts">
import type { SelectOption } from 'naive-ui'
import type { QuizAnswerHistoryItem } from '@/api'
import { fetchDeleteQuizQuestion, fetchQuizQuestions } from '@/api'

type TabKey = 'knowledge' | 'questions'
type KnowledgeStatus = 'ready' | 'indexing' | 'draft'
type QuestionFilter = 'all' | 'bookmarked' | 'wrong'

interface KnowledgeBaseItem {
  id: number
  name: string
  description: string
  provider: string
  status: KnowledgeStatus
  documents: number
  chunks: number
  updatedAt: string
  files: string[]
  isDefault: boolean
}

interface QuestionChoice {
  key: string
  text: string
}

interface QuestionItem {
  id: number
  sourceKey?: string
  title: string
  prompt: string
  category: string | null
  bookmarked: boolean
  isCorrect: boolean
  options?: QuestionChoice[]
  userAnswer: string
  correctAnswer: string
  explanation: string
  sessionTitle: string
  createdAt: string
}

const HIDDEN_SAMPLE_QUESTION_KEYS_STORAGE = 'deepTutor:hiddenSampleQuestionKeys'
const CLEARED_SAMPLE_CATEGORIES_STORAGE = 'deepTutor:clearedSampleQuestionCategories'

const { t } = useI18n()
const message = useMessage()

function hasLocalStorage() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function loadStringList(key: string) {
  if (!hasLocalStorage())
    return []

  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  }
  catch {
    return []
  }
}

function saveStringList(key: string, values: string[]) {
  if (!hasLocalStorage())
    return

  window.localStorage.setItem(key, JSON.stringify([...new Set(values)]))
}

function hideSampleQuestion(sourceKey: string) {
  saveStringList(HIDDEN_SAMPLE_QUESTION_KEYS_STORAGE, [
    ...loadStringList(HIDDEN_SAMPLE_QUESTION_KEYS_STORAGE),
    sourceKey,
  ])
}

function clearSampleCategory(category: string) {
  saveStringList(CLEARED_SAMPLE_CATEGORIES_STORAGE, [
    ...loadStringList(CLEARED_SAMPLE_CATEGORIES_STORAGE),
    category,
  ])
}

function iso(hoursAgo = 0) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
}

function buildKnowledgeBases(): KnowledgeBaseItem[] {
  return [
    {
      id: 1,
      name: 'Linear Algebra Midterm',
      description: 'Lecture slides, worked examples, and short review notes for the midterm sprint.',
      provider: 'llamaindex',
      status: 'ready',
      documents: 18,
      chunks: 246,
      updatedAt: iso(2),
      files: ['week-01-notes.pdf', 'matrix-review.md', 'practice-set-a.pdf'],
      isDefault: true,
    },
    {
      id: 2,
      name: 'Socratic Tutoring Primer',
      description: 'Prompting patterns, tutoring policies, and intervention checklists for mentor workflows.',
      provider: 'hybrid',
      status: 'indexing',
      documents: 9,
      chunks: 132,
      updatedAt: iso(6),
      files: ['primer.docx', 'dialogue-patterns.md', 'rubrics.pdf'],
      isDefault: false,
    },
    {
      id: 3,
      name: 'Physics Lab Archive',
      description: 'Experiment reports and troubleshooting notes grouped by instrument and semester.',
      provider: 'vectorlite',
      status: 'draft',
      documents: 5,
      chunks: 64,
      updatedAt: iso(20),
      files: ['pendulum-lab.pdf', 'sensor-log.csv', 'qa-checklist.md'],
      isDefault: false,
    },
  ]
}

function buildQuestions(): QuestionItem[] {
  const clearedSampleCategories = new Set(loadStringList(CLEARED_SAMPLE_CATEGORIES_STORAGE))
  const hiddenSampleQuestionKeys = new Set(loadStringList(HIDDEN_SAMPLE_QUESTION_KEYS_STORAGE))
  const questions: QuestionItem[] = [
    {
      id: 1,
      sourceKey: 'sample:linear-algebra-invertible-matrix',
      title: 'Which matrix is invertible?',
      prompt: 'Select the option that guarantees the matrix has full rank.',
      category: clearedSampleCategories.has('Linear Algebra') ? null : 'Linear Algebra',
      bookmarked: true,
      isCorrect: false,
      options: [
        { key: 'A', text: 'A matrix with a zero row.' },
        { key: 'B', text: 'A square matrix with non-zero determinant.' },
        { key: 'C', text: 'A matrix with two identical columns.' },
      ],
      userAnswer: 'A',
      correctAnswer: 'B',
      explanation: 'A non-zero determinant is the strongest direct indicator in the options that the matrix is invertible.',
      sessionTitle: 'Midterm practice',
      createdAt: iso(5),
    },
    {
      id: 2,
      sourceKey: 'sample:physics-momentum-conservation',
      title: 'Explain momentum conservation',
      prompt: 'Write a short explanation for why total momentum stays constant in an isolated system.',
      category: clearedSampleCategories.has('Physics') ? null : 'Physics',
      bookmarked: false,
      isCorrect: true,
      userAnswer: 'Because internal forces cancel in equal and opposite pairs, so the total momentum does not change when no external force acts on the system.',
      correctAnswer: 'In an isolated system, external net force is zero. Since the time rate of change of total momentum equals net external force, total momentum remains constant.',
      explanation: 'The learner explanation is correct; the model answer adds the formal force-momentum relationship.',
      sessionTitle: 'Lab debrief',
      createdAt: iso(18),
    },
    {
      id: 3,
      sourceKey: 'sample:coding-factorial-base-case',
      title: 'Trace a recursive function',
      prompt: 'Fix the base case so the function returns the factorial of n.',
      category: null,
      bookmarked: true,
      isCorrect: false,
      userAnswer: 'if n == 0: return 0',
      correctAnswer: 'if n == 0: return 1',
      explanation: 'Factorial uses 1 as the multiplicative identity, so returning 0 collapses every recursive branch to 0.',
      sessionTitle: 'Coding warm-up',
      createdAt: iso(30),
    },
  ]

  return questions.filter(item => !item.sourceKey || !hiddenSampleQuestionKeys.has(item.sourceKey))
}

const activeTab = ref<TabKey>('knowledge')
const searchKeyword = ref('')
const createForm = reactive({
  name: '',
  provider: 'llamaindex',
  files: 'syllabus.pdf\nweek-01-slides.pdf\nquiz-bank.md',
})
const categoryDraft = ref('')
const customQuestionCategories = ref<string[]>([])
const questionFilter = ref<QuestionFilter>('all')
const activeQuestionCategory = ref('all')

const knowledgeBases = ref<KnowledgeBaseItem[]>(buildKnowledgeBases())
const questionEntries = ref<QuestionItem[]>([
  ...buildQuestions(),
])
const selectedKnowledgeBaseId = ref<number | null>(knowledgeBases.value[0]?.id ?? null)
const uploadForm = reactive({
  targetId: selectedKnowledgeBaseId.value,
  files: 'week-02-worksheet.pdf\nexam-faq.md',
})

watch(selectedKnowledgeBaseId, (value) => {
  uploadForm.targetId = value
})

const providerOptions = computed<SelectOption[]>(() => [
  { label: 'LlamaIndex', value: 'llamaindex' },
  { label: 'VectorLite', value: 'vectorlite' },
  { label: 'Hybrid RAG', value: 'hybrid' },
])

const uploadTargetOptions = computed<SelectOption[]>(() => {
  return knowledgeBases.value.map(item => ({
    label: item.name,
    value: item.id,
  }))
})

const filteredKnowledgeBases = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const sorted = [...knowledgeBases.value].sort((left, right) => Number(right.isDefault) - Number(left.isDefault))

  if (!keyword)
    return sorted

  return sorted.filter(item =>
    item.name.toLowerCase().includes(keyword)
    || item.description.toLowerCase().includes(keyword)
    || item.provider.toLowerCase().includes(keyword),
  )
})

const selectedKnowledgeBase = computed(() => {
  return knowledgeBases.value.find(item => item.id === selectedKnowledgeBaseId.value) ?? null
})

const questionCategories = computed(() => {
  const dynamicCategories = questionEntries.value
    .map(item => item.category)
    .filter((value): value is string => Boolean(value))

  return [...new Set([...customQuestionCategories.value, ...dynamicCategories])]
})

const filteredQuestions = computed(() => {
  return questionEntries.value.filter((item) => {
    const matchFilter
      = questionFilter.value === 'all'
        || (questionFilter.value === 'bookmarked' && item.bookmarked)
        || (questionFilter.value === 'wrong' && !item.isCorrect)

    const matchCategory = activeQuestionCategory.value === 'all' || item.category === activeQuestionCategory.value
    return matchFilter && matchCategory
  })
})

const dashboardStats = computed(() => {
  const totalDocuments = knowledgeBases.value.reduce((sum, item) => sum + item.documents, 0)

  return [
    {
      key: 'knowledge-bases',
      label: t('knowledge.stats.knowledgeBases'),
      value: knowledgeBases.value.length,
      meta: `${totalDocuments} ${t('knowledge.documents').toLowerCase()}`,
      icon: 'knowledge',
    },
    {
      key: 'questions',
      label: t('knowledge.stats.questions'),
      value: questionEntries.value.length,
      meta: `${questionEntries.value.filter(item => item.bookmarked).length} ${t('knowledge.questions.bookmarked').toLowerCase()}`,
      icon: 'questions',
    },
  ]
})

const questionFilterOptions = computed(() => [
  { label: t('knowledge.questions.filters.all'), value: 'all' },
  { label: t('knowledge.questions.filters.bookmarked'), value: 'bookmarked' },
  { label: t('knowledge.questions.filters.wrong'), value: 'wrong' },
])

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

function numericHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1)
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0

  return Math.abs(hash)
}

function quizRecordToQuestionItem(record: QuizAnswerHistoryItem): QuestionItem | null {
  if (!record.sourceKey || !record.question || !record.correctAnswer)
    return null

  return {
    id: numericHash(record.sourceKey),
    sourceKey: record.sourceKey,
    title: record.question.length > 72 ? `${record.question.slice(0, 72)}...` : record.question,
    prompt: record.question,
    category: record.category ?? t('knowledge.questions.generatedCategory'),
    bookmarked: false,
    isCorrect: !!record.isCorrect,
    options: record.options
      ? Object.entries(record.options).map(([key, text]) => ({ key, text }))
      : undefined,
    userAnswer: record.selected || record.typed || '',
    correctAnswer: record.correctAnswer,
    explanation: record.explanation || '',
    sessionTitle: record.sessionTitle || t('knowledge.questions.generatedSessionTitle'),
    createdAt: new Date(record.createTime || record.updateTime || Date.now()).toISOString(),
  }
}

async function syncQuizQuestions() {
  try {
    const response = await fetchQuizQuestions()
    const generatedQuestions = (response.data || [])
      .map(quizRecordToQuestionItem)
      .filter((item): item is QuestionItem => item !== null)
    const sampleQuestions = questionEntries.value.filter(item => item.sourceKey?.startsWith('sample:'))

    questionEntries.value = [...generatedQuestions, ...sampleQuestions]
  }
  catch (error) {
    console.error(error)
  }
}

function parseFiles(value: string) {
  return value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
}

function nextId(values: number[]) {
  return values.length ? Math.max(...values) + 1 : 1
}

function providerDescription(provider: string) {
  return t(`knowledge.providers.${provider}`)
}

function statusType(status: KnowledgeStatus) {
  if (status === 'ready')
    return 'success'
  if (status === 'indexing')
    return 'warning'
  return 'default'
}

function statusLabel(status: KnowledgeStatus) {
  return t(`knowledge.status.${status}`)
}

function createKnowledgeBase() {
  const name = createForm.name.trim()
  const files = parseFiles(createForm.files)

  if (!name || !files.length)
    return

  const id = nextId(knowledgeBases.value.map(item => item.id))
  knowledgeBases.value.unshift({
    id,
    name,
    description: 'A newly staged knowledge base card created from the frontend workspace.',
    provider: createForm.provider,
    status: 'indexing',
    documents: files.length,
    chunks: files.length * 14,
    updatedAt: new Date().toISOString(),
    files,
    isDefault: false,
  })

  selectedKnowledgeBaseId.value = id
  createForm.name = ''
  createForm.files = 'reading-guide.pdf\nseminar-notes.md'
  message.success(t('knowledge.messages.created'))

  setTimeout(() => {
    const target = knowledgeBases.value.find(item => item.id === id)
    if (target)
      target.status = 'ready'
  }, 900)
}

function uploadMockFiles() {
  const files = parseFiles(uploadForm.files)
  const target = knowledgeBases.value.find(item => item.id === uploadForm.targetId)

  if (!target || !files.length)
    return

  target.files.unshift(...files)
  target.documents += files.length
  target.chunks += files.length * 11
  target.status = 'indexing'
  target.updatedAt = new Date().toISOString()
  message.success(t('knowledge.messages.uploaded'))

  setTimeout(() => {
    target.status = 'ready'
  }, 900)
}

function setDefaultKnowledgeBase(id: number) {
  knowledgeBases.value = knowledgeBases.value.map(item => ({
    ...item,
    isDefault: item.id === id,
  }))
  message.success(t('knowledge.messages.defaultChanged'))
}

function removeKnowledgeBase(id: number) {
  knowledgeBases.value = knowledgeBases.value.filter(item => item.id !== id)

  if (selectedKnowledgeBaseId.value === id)
    selectedKnowledgeBaseId.value = knowledgeBases.value[0]?.id ?? null

  if (uploadForm.targetId === id)
    uploadForm.targetId = knowledgeBases.value[0]?.id ?? null

  message.success(t('knowledge.messages.deleted'))
}

function addQuestionCategory() {
  const name = categoryDraft.value.trim()
  if (!name || questionCategories.value.includes(name))
    return

  customQuestionCategories.value.push(name)
  categoryDraft.value = ''
  message.success(t('knowledge.messages.categoryCreated'))
}

function clearQuestionCategory(category: string) {
  clearSampleCategory(category)

  questionEntries.value = questionEntries.value.map((item) => {
    if (item.category !== category)
      return item

    return {
      ...item,
      category: null,
    }
  })

  customQuestionCategories.value = customQuestionCategories.value.filter(item => item !== category)

  if (activeQuestionCategory.value === category)
    activeQuestionCategory.value = 'all'

  message.success(t('knowledge.messages.categoryCleared'))
}

function toggleQuestionBookmark(id: number) {
  const target = questionEntries.value.find(item => item.id === id)
  if (target)
    target.bookmarked = !target.bookmarked
}

function removeQuestionCategory(id: number) {
  const target = questionEntries.value.find(item => item.id === id)
  if (target)
    target.category = null
}

async function removeQuestion(id: number) {
  const target = questionEntries.value.find(item => item.id === id)
  if (target?.sourceKey) {
    if (target.sourceKey.startsWith('sample:'))
      hideSampleQuestion(target.sourceKey)
    else
      await fetchDeleteQuizQuestion(target.sourceKey)
  }

  questionEntries.value = questionEntries.value.filter(item => item.id !== id)
  message.success(t('knowledge.messages.questionDeleted'))
}

onMounted(() => {
  void syncQuizQuestions()
})
</script>

<template>
  <div class="knowledge-page flex h-full flex-col overflow-hidden bg-[var(--dt-background)] text-[var(--dt-foreground)]">
    <main class="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <section class="mx-auto flex max-w-7xl flex-col gap-5">
        <header class="overflow-hidden rounded-3xl border border-[var(--dt-border)] bg-[var(--dt-secondary)] p-6 shadow-sm">
          <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div class="max-w-3xl">
              <h1 class="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {{ t('knowledge.title') }}
              </h1>
            </div>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div
              v-for="stat in dashboardStats"
              :key="stat.key"
              class="knowledge-stat rounded-2xl border border-[var(--dt-border)] bg-[var(--dt-muted)]/55 p-4"
            >
              <div class="mb-3 flex items-center justify-between gap-3">
                <div class="text-xs uppercase tracking-[0.14em] text-[var(--dt-muted-foreground)]">
                  {{ stat.label }}
                </div>
                <IconRiBookOpenLine v-if="stat.icon === 'knowledge'" class="text-lg text-[var(--dt-primary)]" />
                <IconRiQuestionAnswerLine v-else class="text-lg text-[var(--dt-primary)]" />
              </div>
              <div class="text-3xl font-semibold tracking-[-0.04em]">
                {{ stat.value }}
              </div>
              <p class="mt-2 text-xs text-[var(--dt-muted-foreground)]">
                {{ stat.meta }}
              </p>
            </div>
          </div>
        </header>

        <section class="rounded-3xl border border-[var(--dt-border)] bg-[var(--dt-secondary)] p-4 shadow-sm sm:p-5">
          <NTabs v-model:value="activeTab" type="segment" animated>
            <NTabPane name="knowledge" :tab="t('knowledge.tabs.knowledge')" />
            <NTabPane name="questions" :tab="t('knowledge.tabs.questions')" />
          </NTabs>

          <div v-if="activeTab === 'knowledge'" class="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside class="knowledge-shell__panel">
              <div class="mb-4">
                <p class="text-sm font-semibold">
                  {{ t('knowledge.listTitle') }}
                </p>
                <p class="mt-1 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                  {{ t('knowledge.listDescription') }}
                </p>
              </div>

              <NInput v-model:value="searchKeyword" :placeholder="t('knowledge.searchPlaceholder')">
                <template #prefix>
                  <IconRiSearchLine />
                </template>
              </NInput>

              <div class="mt-4 space-y-3">
                <button
                  v-for="item in filteredKnowledgeBases"
                  :key="item.id"
                  class="knowledge-list-card w-full rounded-2xl border p-4 text-left transition-all duration-200"
                  :class="item.id === selectedKnowledgeBaseId ? 'knowledge-list-card--active' : ''"
                  @click="selectedKnowledgeBaseId = item.id"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="truncate text-sm font-semibold">
                          {{ item.name }}
                        </p>
                        <NTag v-if="item.isDefault" round size="small">
                          {{ t('knowledge.default') }}
                        </NTag>
                      </div>
                      <p class="mt-2 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                        {{ item.description }}
                      </p>
                    </div>
                    <NTag size="small" :type="statusType(item.status)">
                      {{ statusLabel(item.status) }}
                    </NTag>
                  </div>
                  <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--dt-muted-foreground)]">
                    <span>{{ item.documents }} {{ t('knowledge.documents').toLowerCase() }}</span>
                    <span class="opacity-50">•</span>
                    <span>{{ item.chunks }} {{ t('knowledge.chunks').toLowerCase() }}</span>
                    <span class="opacity-50">•</span>
                    <span>{{ formatTimestamp(item.updatedAt) }}</span>
                  </div>
                </button>
              </div>

              <NEmpty v-if="!filteredKnowledgeBases.length" :description="t('knowledge.noKnowledgeBases')" class="py-12" />
            </aside>

            <div class="flex flex-col gap-4">
              <section class="knowledge-shell__panel">
                <div v-if="selectedKnowledgeBase" class="flex flex-col gap-5">
                  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h2 class="text-xl font-semibold tracking-[-0.03em]">
                          {{ selectedKnowledgeBase.name }}
                        </h2>
                        <NTag size="small" :type="statusType(selectedKnowledgeBase.status)">
                          {{ statusLabel(selectedKnowledgeBase.status) }}
                        </NTag>
                      </div>
                      <p class="mt-2 max-w-3xl text-sm leading-6 text-[var(--dt-muted-foreground)]">
                        {{ selectedKnowledgeBase.description }}
                      </p>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <NButton
                        secondary
                        :disabled="selectedKnowledgeBase.isDefault"
                        @click="setDefaultKnowledgeBase(selectedKnowledgeBase.id)"
                      >
                        {{ t('knowledge.setDefault') }}
                      </NButton>

                      <NPopconfirm @positive-click="removeKnowledgeBase(selectedKnowledgeBase.id)">
                        <template #trigger>
                          <NButton tertiary type="error">
                            <template #icon>
                              <IconRiDeleteBinLine />
                            </template>
                            {{ t('common.delete') }}
                          </NButton>
                        </template>
                        {{ t('common.confirm') }}
                      </NPopconfirm>
                    </div>
                  </div>

                  <div class="grid gap-3 md:grid-cols-3">
                    <div class="rounded-2xl bg-[var(--dt-muted)] px-4 py-3">
                      <div class="text-xs uppercase tracking-[0.14em] text-[var(--dt-muted-foreground)]">
                        {{ t('knowledge.providerLabel') }}
                      </div>
                      <div class="mt-2 text-sm font-medium">
                        {{ providerOptions.find(option => option.value === selectedKnowledgeBase?.provider)?.label }}
                      </div>
                    </div>
                    <div class="rounded-2xl bg-[var(--dt-muted)] px-4 py-3">
                      <div class="text-xs uppercase tracking-[0.14em] text-[var(--dt-muted-foreground)]">
                        {{ t('knowledge.documents') }}
                      </div>
                      <div class="mt-2 text-sm font-medium">
                        {{ selectedKnowledgeBase.documents }}
                      </div>
                    </div>
                    <div class="rounded-2xl bg-[var(--dt-muted)] px-4 py-3">
                      <div class="text-xs uppercase tracking-[0.14em] text-[var(--dt-muted-foreground)]">
                        {{ t('knowledge.chunks') }}
                      </div>
                      <div class="mt-2 text-sm font-medium">
                        {{ selectedKnowledgeBase.chunks }}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div class="mb-2 flex items-center justify-between gap-3">
                      <p class="text-sm font-semibold">
                        {{ t('knowledge.files') }}
                      </p>
                      <span class="text-xs text-[var(--dt-muted-foreground)]">
                        {{ t('knowledge.updatedAt') }}: {{ formatTimestamp(selectedKnowledgeBase.updatedAt) }}
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <NTag
                        v-for="file in selectedKnowledgeBase.files"
                        :key="file"
                        round
                        size="small"
                      >
                        {{ file }}
                      </NTag>
                    </div>
                  </div>
                </div>

                <NEmpty v-else :description="t('knowledge.noKnowledgeBases')" class="py-12" />
              </section>

              <div class="grid gap-4 lg:grid-cols-2">
                <section class="knowledge-shell__panel">
                  <div class="mb-4">
                    <p class="text-sm font-semibold">
                      {{ t('knowledge.createTitle') }}
                    </p>
                    <p class="mt-1 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                      {{ t('knowledge.createDescription') }}
                    </p>
                  </div>

                  <div class="space-y-4">
                    <div>
                      <label class="knowledge-label">{{ t('knowledge.nameLabel') }}</label>
                      <NInput v-model:value="createForm.name" :placeholder="t('knowledge.namePlaceholder')" />
                    </div>

                    <div>
                      <label class="knowledge-label">{{ t('knowledge.providerLabel') }}</label>
                      <NSelect v-model:value="createForm.provider" :options="providerOptions" />
                      <p class="mt-2 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                        {{ providerDescription(createForm.provider) }}
                      </p>
                    </div>

                    <div>
                      <label class="knowledge-label">{{ t('knowledge.filesLabel') }}</label>
                      <NInput
                        v-model:value="createForm.files"
                        type="textarea"
                        :autosize="{ minRows: 5 }"
                        :placeholder="t('knowledge.filesPlaceholder')"
                      />
                    </div>

                    <NButton type="primary" block @click="createKnowledgeBase">
                      <template #icon>
                        <IconRiAddLine />
                      </template>
                      {{ t('knowledge.createButton') }}
                    </NButton>
                  </div>
                </section>

                <section class="knowledge-shell__panel">
                  <div class="mb-4">
                    <p class="text-sm font-semibold">
                      {{ t('knowledge.uploadTitle') }}
                    </p>
                    <p class="mt-1 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                      {{ t('knowledge.uploadDescription') }}
                    </p>
                  </div>

                  <div class="space-y-4">
                    <div>
                      <label class="knowledge-label">{{ t('knowledge.uploadTargetLabel') }}</label>
                      <NSelect v-model:value="uploadForm.targetId" :options="uploadTargetOptions" />
                    </div>

                    <div>
                      <label class="knowledge-label">{{ t('knowledge.filesLabel') }}</label>
                      <NInput
                        v-model:value="uploadForm.files"
                        type="textarea"
                        :autosize="{ minRows: 5 }"
                        :placeholder="t('knowledge.filesPlaceholder')"
                      />
                    </div>

                    <p class="rounded-2xl bg-[var(--dt-muted)] px-4 py-3 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                      {{ t('knowledge.mockHint') }}
                    </p>

                    <NButton block @click="uploadMockFiles">
                      <template #icon>
                        <IconRiUpload2Fill />
                      </template>
                      {{ t('knowledge.uploadButton') }}
                    </NButton>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === 'questions'" class="mt-5 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside class="knowledge-shell__panel">
              <div class="mb-4">
                <p class="text-sm font-semibold">
                  {{ t('knowledge.questions.title') }}
                </p>
                <p class="mt-1 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                  {{ t('knowledge.questions.description') }}
                </p>
              </div>

              <NButtonGroup class="w-full">
                <NButton
                  v-for="item in questionFilterOptions"
                  :key="item.value"
                  class="flex-1"
                  :type="questionFilter === item.value ? 'primary' : 'default'"
                  @click="questionFilter = item.value as QuestionFilter"
                >
                  {{ item.label }}
                </NButton>
              </NButtonGroup>

              <NDivider />

              <div>
                <p class="text-sm font-semibold">
                  {{ t('knowledge.questions.categories') }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    class="knowledge-chip"
                    :class="activeQuestionCategory === 'all' ? 'knowledge-chip--active' : ''"
                    @click="activeQuestionCategory = 'all'"
                  >
                    {{ t('knowledge.questions.allCategories') }}
                  </button>
                  <button
                    v-for="category in questionCategories"
                    :key="category"
                    class="knowledge-chip"
                    :class="activeQuestionCategory === category ? 'knowledge-chip--active' : ''"
                    @click="activeQuestionCategory = category"
                  >
                    {{ category }}
                  </button>
                </div>
              </div>

              <div class="mt-4 space-y-3 rounded-2xl bg-[var(--dt-muted)] p-4">
                <label class="knowledge-label">{{ t('knowledge.questions.addCategory') }}</label>
                <NInput v-model:value="categoryDraft" :placeholder="t('knowledge.questions.newCategoryPlaceholder')" />
                <NButton block @click="addQuestionCategory">
                  <template #icon>
                    <IconRiAddLine />
                  </template>
                  {{ t('knowledge.questions.addCategory') }}
                </NButton>
              </div>

              <div v-if="questionCategories.length" class="mt-4 space-y-2">
                <div
                  v-for="category in questionCategories"
                  :key="`clear-${category}`"
                  class="flex items-center justify-between rounded-2xl border border-[var(--dt-border)] px-3 py-2"
                >
                  <span class="text-sm">{{ category }}</span>
                  <NButton text type="error" @click="clearQuestionCategory(category)">
                    {{ t('knowledge.questions.removeCategory') }}
                  </NButton>
                </div>
              </div>
            </aside>

            <section class="knowledge-shell__panel">
              <div v-if="filteredQuestions.length" class="space-y-4">
                <article
                  v-for="item in filteredQuestions"
                  :key="item.id"
                  class="rounded-2xl border border-[var(--dt-border)] bg-[var(--dt-muted)]/35 p-5"
                >
                  <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-base font-semibold">
                          {{ item.title }}
                        </h3>
                        <NTag size="small" :type="item.isCorrect ? 'success' : 'warning'">
                          {{ item.isCorrect ? t('knowledge.questions.correct') : t('knowledge.questions.incorrect') }}
                        </NTag>
                        <NTag v-if="item.bookmarked" size="small">
                          {{ t('knowledge.questions.bookmarked') }}
                        </NTag>
                        <NTag v-if="item.category" size="small" type="info">
                          {{ item.category }}
                        </NTag>
                      </div>
                      <p class="mt-2 text-sm leading-6 text-[var(--dt-muted-foreground)]">
                        {{ item.prompt }}
                      </p>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <NButton text @click="toggleQuestionBookmark(item.id)">
                        <template #icon>
                          <IconRiBookOpenLine />
                        </template>
                        {{ t('knowledge.questions.bookmark') }}
                      </NButton>

                      <NButton v-if="item.category" text @click="removeQuestionCategory(item.id)">
                        <template #icon>
                          <IconRiCloseCircleLine />
                        </template>
                        {{ t('knowledge.questions.removeCategory') }}
                      </NButton>

                      <NPopconfirm @positive-click="removeQuestion(item.id)">
                        <template #trigger>
                          <NButton text type="error">
                            <template #icon>
                              <IconRiDeleteBinLine />
                            </template>
                            {{ t('common.delete') }}
                          </NButton>
                        </template>
                        {{ t('common.confirm') }}
                      </NPopconfirm>
                    </div>
                  </div>

                  <div v-if="item.options?.length" class="mt-4 space-y-2">
                    <div
                      v-for="option in item.options"
                      :key="option.key"
                      class="question-option rounded-2xl border px-4 py-3 text-sm"
                      :class="[
                        item.correctAnswer === option.key ? 'question-option--correct' : '',
                        item.userAnswer === option.key && !item.isCorrect ? 'question-option--wrong' : '',
                      ]"
                    >
                      <div class="flex items-start gap-3">
                        <span class="font-semibold">
                          {{ option.key }}.
                        </span>
                        <span class="flex-1">{{ option.text }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-else class="mt-4 grid gap-3 lg:grid-cols-2">
                    <div class="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm dark:border-red-950/40 dark:bg-red-950/10">
                      <div class="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-red-600 dark:text-red-300">
                        {{ t('knowledge.questions.yourAnswer') }}
                      </div>
                      <p class="whitespace-pre-wrap leading-6 text-[var(--dt-foreground)]">
                        {{ item.userAnswer }}
                      </p>
                    </div>
                    <div class="rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3 text-sm dark:border-green-950/40 dark:bg-green-950/10">
                      <div class="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-green-700 dark:text-green-300">
                        {{ t('knowledge.questions.referenceAnswer') }}
                      </div>
                      <p class="whitespace-pre-wrap leading-6 text-[var(--dt-foreground)]">
                        {{ item.correctAnswer }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm dark:border-blue-950/40 dark:bg-blue-950/10">
                    <div class="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
                      {{ t('knowledge.questions.explanation') }}
                    </div>
                    <p class="leading-6 text-[var(--dt-foreground)]">
                      {{ item.explanation }}
                    </p>
                  </div>

                  <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--dt-muted-foreground)]">
                    <span>{{ item.sessionTitle }}</span>
                    <span>{{ formatTimestamp(item.createdAt) }}</span>
                  </div>
                </article>
              </div>

              <NEmpty v-else :description="t('knowledge.questions.noQuestions')" class="py-16" />
            </section>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.knowledge-page {
  --dt-background: #FFFFFF;
  --dt-foreground: #1F2937;
  --dt-secondary: #FFFFFF;
  --dt-muted: #F3F4F6;
  --dt-muted-foreground: #6B7280;
  --dt-border: #E5E7EB;
  --dt-primary: #4B8F5A;
  --dt-primary-soft: rgba(75, 143, 90, 0.12);
}

:global(.dark) .knowledge-page {
  --dt-background: #24272E;
  --dt-foreground: #F9FAFB;
  --dt-secondary: #202329;
  --dt-muted: #2F333B;
  --dt-muted-foreground: #A1A1AA;
  --dt-border: #3F444D;
  --dt-primary: #79C37F;
  --dt-primary-soft: rgba(121, 195, 127, 0.16);
}

.knowledge-shell__panel {
  border-radius: 24px;
  border: 1px solid var(--dt-border);
  background: var(--dt-secondary);
  padding: 20px;
}

.knowledge-stat {
  background-image: linear-gradient(135deg, color-mix(in srgb, var(--dt-primary) 7%, transparent), transparent 58%);
}

.knowledge-label {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dt-muted-foreground);
}

.knowledge-list-card {
  border-color: var(--dt-border);
  background: var(--dt-secondary);
}

.knowledge-list-card:hover,
.knowledge-list-card--active {
  border-color: var(--dt-primary);
  background: var(--dt-primary-soft);
}

.knowledge-chip {
  border-radius: 999px;
  border: 1px solid var(--dt-border);
  background: var(--dt-secondary);
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1.2;
  transition: all 0.2s ease;
}

.knowledge-chip:hover,
.knowledge-chip--active {
  border-color: var(--dt-primary);
  background: var(--dt-primary-soft);
  color: var(--dt-foreground);
}

.question-option {
  border-color: var(--dt-border);
  background: var(--dt-secondary);
}

.question-option--correct {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.1);
}

.question-option--wrong {
  border-color: rgba(239, 68, 68, 0.36);
  background: rgba(239, 68, 68, 0.08);
}
</style>
