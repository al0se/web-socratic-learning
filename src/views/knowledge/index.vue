<script setup lang="ts">
type TabKey = 'knowledge' | 'notebooks' | 'questions' | 'skills'
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

interface NotebookRecordItem {
  id: number
  title: string
  type: string
  summary: string
  output: string
  updatedAt: string
}

interface NotebookItem {
  id: number
  name: string
  description: string
  color: string
  records: NotebookRecordItem[]
}

interface QuestionChoice {
  key: string
  text: string
}

interface QuestionItem {
  id: number
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

interface SkillItem {
  id: number
  name: string
  description: string
  content: string
}

interface SelectOption {
  label: string
  value: string | number
}

const { t } = useI18n()
const message = useMessage()

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

function buildNotebooks(): NotebookItem[] {
  return [
    {
      id: 1,
      name: 'Exam Repair',
      description: 'A notebook for weak spots, review loops, and model-generated outlines.',
      color: '#4B8F5A',
      records: [
        {
          id: 101,
          title: 'Gaussian elimination recap',
          type: 'summary',
          summary: 'Condenses the elimination workflow into three repeatable checkpoints.',
          output: '1. Normalize the pivot row.\n2. Eliminate downward before eliminating upward.\n3. Re-check rank when the system looks inconsistent.',
          updatedAt: iso(4),
        },
        {
          id: 102,
          title: 'Review session outline',
          type: 'outline',
          summary: 'A 45-minute sequence for warm-up, guided practice, and self-explanation.',
          output: 'Warm-up with two quick determinant checks, then solve one row-reduction example out loud, and finish with a peer-teaching recap.',
          updatedAt: iso(10),
        },
      ],
    },
    {
      id: 2,
      name: 'Office Hours',
      description: 'Collected snippets from common learner questions and follow-up prompts.',
      color: '#3A6EA5',
      records: [
        {
          id: 201,
          title: 'Prompt bank for misconceptions',
          type: 'prompt',
          summary: 'Reusable questions for surfacing hidden assumptions before giving hints.',
          output: 'What did you assume was preserved in this transformation? Which step would still hold if the coefficient became zero?',
          updatedAt: iso(28),
        },
      ],
    },
  ]
}

function buildQuestions(): QuestionItem[] {
  return [
    {
      id: 1,
      title: 'Which matrix is invertible?',
      prompt: 'Select the option that guarantees the matrix has full rank.',
      category: 'Linear Algebra',
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
      title: 'Explain momentum conservation',
      prompt: 'Write a short explanation for why total momentum stays constant in an isolated system.',
      category: 'Physics',
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
}

function buildSkills(): SkillItem[] {
  return [
    {
      id: 1,
      name: 'exam-coach',
      description: 'Bias the assistant toward timed-practice feedback and concise remediation steps.',
      content: '# Exam Coach\n\nAsk the learner to show their intermediate reasoning before revealing the final answer.\n\nPrefer short, timed, checkpoint-style feedback.',
    },
    {
      id: 2,
      name: 'concept-scaffold',
      description: 'Slow down explanations and break them into compact concept ladders.',
      content: '# Concept Scaffold\n\nStart from the prerequisite idea, then move one abstraction level at a time.\n\nEnd each response with a one-line self-check question.',
    },
  ]
}

const activeTab = ref<TabKey>('knowledge')
const searchKeyword = ref('')
const createForm = reactive({
  name: '',
  provider: 'llamaindex',
  files: 'syllabus.pdf\nweek-01-slides.pdf\nquiz-bank.md',
})
const notebookDraft = reactive({
  name: '',
  description: '',
})
const categoryDraft = ref('')
const customQuestionCategories = ref<string[]>([])
const questionFilter = ref<QuestionFilter>('all')
const activeQuestionCategory = ref('all')
const expandedNotebookRecordIds = ref<number[]>([])
const skillModalVisible = ref(false)
const skillDraft = reactive({
  id: null as number | null,
  name: '',
  description: '',
  content: '',
})

const knowledgeBases = ref<KnowledgeBaseItem[]>(buildKnowledgeBases())
const notebooks = ref<NotebookItem[]>(buildNotebooks())
const questionEntries = ref<QuestionItem[]>(buildQuestions())
const skills = ref<SkillItem[]>(buildSkills())
const selectedKnowledgeBaseId = ref<number | null>(knowledgeBases.value[0]?.id ?? null)
const selectedNotebookId = ref<number | null>(notebooks.value[0]?.id ?? null)
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

const selectedNotebook = computed(() => {
  return notebooks.value.find(item => item.id === selectedNotebookId.value) ?? null
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
  const totalRecords = notebooks.value.reduce((sum, item) => sum + item.records.length, 0)

  return [
    {
      key: 'knowledge-bases',
      label: t('knowledge.stats.knowledgeBases'),
      value: knowledgeBases.value.length,
      meta: `${totalDocuments} ${t('knowledge.documents').toLowerCase()}`,
      icon: 'knowledge',
    },
    {
      key: 'notebooks',
      label: t('knowledge.stats.notebooks'),
      value: notebooks.value.length,
      meta: `${totalRecords} ${t('knowledge.notebooks.recordCount')}`,
      icon: 'notebooks',
    },
    {
      key: 'questions',
      label: t('knowledge.stats.questions'),
      value: questionEntries.value.length,
      meta: `${questionEntries.value.filter(item => item.bookmarked).length} ${t('knowledge.questions.bookmarked').toLowerCase()}`,
      icon: 'questions',
    },
    {
      key: 'skills',
      label: t('knowledge.stats.skills'),
      value: skills.value.length,
      meta: t('knowledge.frontendOnly'),
      icon: 'skills',
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

function createNotebook() {
  const name = notebookDraft.name.trim()
  if (!name)
    return

  const id = nextId(notebooks.value.map(item => item.id))
  notebooks.value.unshift({
    id,
    name,
    description: notebookDraft.description.trim() || 'A fresh notebook ready for generated summaries and reusable study prompts.',
    color: '#4B8F5A',
    records: [],
  })
  selectedNotebookId.value = id
  notebookDraft.name = ''
  notebookDraft.description = ''
  message.success(t('knowledge.messages.notebookCreated'))
}

function removeNotebook(id: number) {
  notebooks.value = notebooks.value.filter(item => item.id !== id)

  if (selectedNotebookId.value === id)
    selectedNotebookId.value = notebooks.value[0]?.id ?? null

  message.success(t('knowledge.messages.notebookDeleted'))
}

function toggleNotebookRecord(id: number) {
  expandedNotebookRecordIds.value = expandedNotebookRecordIds.value.includes(id)
    ? expandedNotebookRecordIds.value.filter(item => item !== id)
    : [...expandedNotebookRecordIds.value, id]
}

function removeNotebookRecord(recordId: number) {
  notebooks.value = notebooks.value.map((item) => {
    if (item.id !== selectedNotebookId.value)
      return item

    return {
      ...item,
      records: item.records.filter(record => record.id !== recordId),
    }
  })

  expandedNotebookRecordIds.value = expandedNotebookRecordIds.value.filter(item => item !== recordId)
  message.success(t('knowledge.messages.recordDeleted'))
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

function removeQuestion(id: number) {
  questionEntries.value = questionEntries.value.filter(item => item.id !== id)
  message.success(t('knowledge.messages.questionDeleted'))
}

function openCreateSkill() {
  skillDraft.id = null
  skillDraft.name = ''
  skillDraft.description = ''
  skillDraft.content = '# New Skill\n\nDescribe how the assistant should behave here.'
  skillModalVisible.value = true
}

function openEditSkill(skill: SkillItem) {
  skillDraft.id = skill.id
  skillDraft.name = skill.name
  skillDraft.description = skill.description
  skillDraft.content = skill.content
  skillModalVisible.value = true
}

function saveSkill() {
  const name = skillDraft.name.trim()
  if (!name)
    return

  if (skillDraft.id === null) {
    skills.value.unshift({
      id: nextId(skills.value.map(item => item.id)),
      name,
      description: skillDraft.description.trim(),
      content: skillDraft.content.trim(),
    })
    message.success(t('knowledge.messages.skillCreated'))
  }
  else {
    skills.value = skills.value.map((item) => {
      if (item.id !== skillDraft.id)
        return item

      return {
        ...item,
        name,
        description: skillDraft.description.trim(),
        content: skillDraft.content.trim(),
      }
    })
    message.success(t('knowledge.messages.skillUpdated'))
  }

  skillModalVisible.value = false
}

function removeSkill(id: number) {
  skills.value = skills.value.filter(item => item.id !== id)
  message.success(t('knowledge.messages.skillDeleted'))
}
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

            <NTooltip trigger="hover">
              <template #trigger>
                <NTag round size="small" type="info">
                  {{ t('knowledge.frontendOnly') }}
                </NTag>
              </template>
              {{ t('knowledge.mockHint') }}
            </NTooltip>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <IconRiFileList3Line v-else-if="stat.icon === 'notebooks'" class="text-lg text-[var(--dt-primary)]" />
                <IconRiQuestionAnswerLine v-else-if="stat.icon === 'questions'" class="text-lg text-[var(--dt-primary)]" />
                <IconRiSettings4Line v-else class="text-lg text-[var(--dt-primary)]" />
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
            <NTabPane name="notebooks" :tab="t('knowledge.tabs.notebooks')" />
            <NTabPane name="questions" :tab="t('knowledge.tabs.questions')" />
            <NTabPane name="skills" :tab="t('knowledge.tabs.skills')" />
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
                        {{ providerOptions.find(option => option.value === selectedKnowledgeBase.provider)?.label }}
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

          <div v-else-if="activeTab === 'notebooks'" class="mt-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside class="knowledge-shell__panel">
              <div class="mb-4">
                <p class="text-sm font-semibold">
                  {{ t('knowledge.notebooks.title') }}
                </p>
                <p class="mt-1 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                  {{ t('knowledge.notebooks.description') }}
                </p>
              </div>

              <div class="space-y-3 rounded-2xl bg-[var(--dt-muted)] p-4">
                <label class="knowledge-label">{{ t('knowledge.notebooks.createTitle') }}</label>
                <NInput v-model:value="notebookDraft.name" :placeholder="t('knowledge.notebooks.namePlaceholder')" />
                <NInput
                  v-model:value="notebookDraft.description"
                  type="textarea"
                  :autosize="{ minRows: 3 }"
                  :placeholder="t('knowledge.notebooks.descriptionPlaceholder')"
                />
                <NButton block type="primary" @click="createNotebook">
                  <template #icon>
                    <IconRiAddLine />
                  </template>
                  {{ t('knowledge.notebooks.createTitle') }}
                </NButton>
              </div>

              <div class="mt-4 space-y-3">
                <button
                  v-for="item in notebooks"
                  :key="item.id"
                  class="knowledge-list-card w-full rounded-2xl border p-4 text-left transition-all duration-200"
                  :class="item.id === selectedNotebookId ? 'knowledge-list-card--active' : ''"
                  @click="selectedNotebookId = item.id"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold">
                        {{ item.name }}
                      </p>
                      <p class="mt-2 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                        {{ item.description }}
                      </p>
                    </div>
                    <NPopconfirm @positive-click="removeNotebook(item.id)">
                      <template #trigger>
                        <NButton text type="error">
                          <IconRiDeleteBinLine />
                        </NButton>
                      </template>
                      {{ t('common.confirm') }}
                    </NPopconfirm>
                  </div>
                  <div class="mt-4 text-xs text-[var(--dt-muted-foreground)]">
                    {{ item.records.length }} {{ t('knowledge.notebooks.recordCount') }}
                  </div>
                </button>
              </div>
            </aside>

            <section class="knowledge-shell__panel">
              <div v-if="selectedNotebook" class="flex flex-col gap-4">
                <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 class="text-xl font-semibold tracking-[-0.03em]">
                      {{ selectedNotebook.name }}
                    </h2>
                    <p class="mt-2 text-sm leading-6 text-[var(--dt-muted-foreground)]">
                      {{ selectedNotebook.description }}
                    </p>
                  </div>
                  <NTag round size="small">
                    {{ selectedNotebook.records.length }} {{ t('knowledge.notebooks.recordCount') }}
                  </NTag>
                </div>

                <div v-if="selectedNotebook.records.length" class="space-y-3">
                  <article
                    v-for="record in selectedNotebook.records"
                    :key="record.id"
                    class="rounded-2xl border border-[var(--dt-border)] bg-[var(--dt-muted)]/40 p-4"
                  >
                    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="text-sm font-semibold">
                            {{ record.title }}
                          </p>
                          <NTag size="small" type="success">
                            {{ record.type }}
                          </NTag>
                        </div>
                        <p class="mt-2 text-sm leading-6 text-[var(--dt-muted-foreground)]">
                          {{ record.summary }}
                        </p>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        <NButton text @click="toggleNotebookRecord(record.id)">
                          <template #icon>
                            <IconRiArrowDownSLine
                              class="transition-transform"
                              :class="expandedNotebookRecordIds.includes(record.id) ? '' : '-rotate-90'"
                            />
                          </template>
                          {{ expandedNotebookRecordIds.includes(record.id) ? t('knowledge.notebooks.collapse') : t('knowledge.notebooks.expand') }}
                        </NButton>

                        <NPopconfirm @positive-click="removeNotebookRecord(record.id)">
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

                    <div
                      v-if="expandedNotebookRecordIds.includes(record.id)"
                      class="mt-4 rounded-2xl bg-[var(--dt-background)] px-4 py-3 text-sm leading-6 text-[var(--dt-foreground)]"
                    >
                      {{ record.output }}
                    </div>

                    <div class="mt-3 text-xs text-[var(--dt-muted-foreground)]">
                      {{ formatTimestamp(record.updatedAt) }}
                    </div>
                  </article>
                </div>

                <NEmpty v-else :description="t('knowledge.notebooks.noRecords')" class="py-12" />
              </div>

              <NEmpty v-else :description="t('knowledge.notebooks.selectNotebook')" class="py-16" />
            </section>
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

          <div v-else class="mt-5 space-y-4">
            <section class="knowledge-shell__panel">
              <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="text-sm font-semibold">
                    {{ t('knowledge.skills.title') }}
                  </p>
                  <p class="mt-1 text-xs leading-5 text-[var(--dt-muted-foreground)]">
                    {{ t('knowledge.skills.description') }}
                  </p>
                </div>

                <NButton type="primary" @click="openCreateSkill">
                  <template #icon>
                    <IconRiAddLine />
                  </template>
                  {{ t('knowledge.skills.newSkill') }}
                </NButton>
              </div>

              <div v-if="skills.length" class="mt-5 grid gap-4 lg:grid-cols-2">
                <article
                  v-for="skill in skills"
                  :key="skill.id"
                  class="rounded-2xl border border-[var(--dt-border)] bg-[var(--dt-muted)]/40 p-5"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <h3 class="truncate text-base font-semibold">
                        {{ skill.name }}
                      </h3>
                      <p class="mt-2 text-sm leading-6 text-[var(--dt-muted-foreground)]">
                        {{ skill.description }}
                      </p>
                    </div>

                    <div class="flex gap-1">
                      <NButton text @click="openEditSkill(skill)">
                        <template #icon>
                          <IconRiEditLine />
                        </template>
                      </NButton>
                      <NPopconfirm @positive-click="removeSkill(skill.id)">
                        <template #trigger>
                          <NButton text type="error">
                            <template #icon>
                              <IconRiDeleteBinLine />
                            </template>
                          </NButton>
                        </template>
                        {{ t('common.confirm') }}
                      </NPopconfirm>
                    </div>
                  </div>

                  <pre class="mt-4 overflow-x-auto rounded-2xl bg-[var(--dt-background)] p-4 text-xs leading-6 text-[var(--dt-muted-foreground)]">{{ skill.content }}</pre>
                </article>
              </div>

              <NEmpty v-else :description="t('knowledge.skills.noSkills')" class="py-16" />
            </section>
          </div>
        </section>
      </section>
    </main>

    <NModal v-model:show="skillModalVisible" :mask-closable="false">
      <div class="knowledge-modal mx-auto mt-[8vh] w-[min(720px,calc(100vw-2rem))] rounded-3xl border border-[var(--dt-border)] bg-[var(--dt-secondary)] shadow-2xl">
        <div class="flex items-center justify-between border-b border-[var(--dt-border)] px-5 py-4">
          <div>
            <p class="text-base font-semibold">
              {{ skillDraft.id === null ? t('knowledge.skills.newSkill') : t('knowledge.skills.editSkill') }}
            </p>
            <p class="mt-1 text-xs text-[var(--dt-muted-foreground)]">
              {{ t('knowledge.frontendOnly') }}
            </p>
          </div>

          <NButton text @click="skillModalVisible = false">
            <template #icon>
              <IconRiCloseCircleLine />
            </template>
          </NButton>
        </div>

        <div class="space-y-4 px-5 py-5">
          <div>
            <label class="knowledge-label">{{ t('knowledge.nameLabel') }}</label>
            <NInput v-model:value="skillDraft.name" :placeholder="t('knowledge.skills.namePlaceholder')" />
          </div>

          <div>
            <label class="knowledge-label">{{ t('setting.description') }}</label>
            <NInput v-model:value="skillDraft.description" :placeholder="t('knowledge.skills.descriptionPlaceholder')" />
          </div>

          <div>
            <label class="knowledge-label">{{ t('knowledge.skills.bodyLabel') }}</label>
            <NInput
              v-model:value="skillDraft.content"
              type="textarea"
              :autosize="{ minRows: 12 }"
              :placeholder="t('knowledge.skills.bodyPlaceholder')"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[var(--dt-border)] px-5 py-4">
          <NButton @click="skillModalVisible = false">
            {{ t('knowledge.cancel') }}
          </NButton>
          <NButton type="primary" @click="saveSkill">
            {{ t('common.save') }}
          </NButton>
        </div>
      </div>
    </NModal>
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
