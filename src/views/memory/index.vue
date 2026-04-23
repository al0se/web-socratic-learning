<script setup lang="ts">
import type { MemoryFile, MemorySnapshot } from '@/api'
import { fetchClearMemory, fetchMemory, fetchRefreshMemory, fetchUpdateMemory } from '@/api'

const { t, locale } = useI18n()
const message = useMessage()

const loading = ref(false)
const saving = ref(false)
const refreshing = ref(false)
const clearing = ref<MemoryFile | 'all' | null>(null)
const activeFile = ref<MemoryFile>('summary')
const snapshot = ref<MemorySnapshot>({
  summary: '',
  profile: '',
  summary_updated_at: null,
  profile_updated_at: null,
})

const drafts = reactive<Record<MemoryFile, string>>({
  summary: '',
  profile: '',
})

const activeContent = computed({
  get: () => drafts[activeFile.value],
  set: value => drafts[activeFile.value] = value,
})

const activeUpdatedAt = computed(() => {
  return activeFile.value === 'summary'
    ? snapshot.value.summary_updated_at
    : snapshot.value.profile_updated_at
})

const hasUnsavedChanges = computed(() => {
  return drafts.summary !== snapshot.value.summary || drafts.profile !== snapshot.value.profile
})

const memoryStats = computed(() => [
  {
    key: 'summary',
    label: t('memory.summaryLabel'),
    description: t('memory.summaryDescription'),
    updatedAt: snapshot.value.summary_updated_at,
  },
  {
    key: 'profile',
    label: t('memory.profileLabel'),
    description: t('memory.profileDescription'),
    updatedAt: snapshot.value.profile_updated_at,
  },
])

const previewLines = computed(() => {
  const content = activeContent.value.trim()
  return content ? content.split('\n') : []
})

function applySnapshot(next: MemorySnapshot) {
  snapshot.value = next
  drafts.summary = next.summary || ''
  drafts.profile = next.profile || ''
}

async function loadMemory() {
  loading.value = true
  try {
    const { data } = await fetchMemory()
    applySnapshot(data)
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : t('common.wrong'))
  }
  finally {
    loading.value = false
  }
}

async function saveActiveFile() {
  saving.value = true
  try {
    const { data } = await fetchUpdateMemory(activeFile.value, activeContent.value)
    applySnapshot(data)
    message.success(t('common.success'))
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : t('common.wrong'))
  }
  finally {
    saving.value = false
  }
}

async function refreshMemory() {
  refreshing.value = true
  try {
    const language = locale.value.toLowerCase().startsWith('zh') ? 'zh' : 'en'
    const { data } = await fetchRefreshMemory(undefined, language)
    applySnapshot(data)
    message.success(data.changed ? t('memory.refreshChanged') : t('memory.refreshNoChange'))
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : t('common.wrong'))
  }
  finally {
    refreshing.value = false
  }
}

async function clearMemory(file?: MemoryFile) {
  clearing.value = file || 'all'
  try {
    const { data } = await fetchClearMemory(file)
    applySnapshot(data)
    message.success(t('common.clearSuccess'))
  }
  catch (error) {
    message.error(error instanceof Error ? error.message : t('common.wrong'))
  }
  finally {
    clearing.value = null
  }
}

function formatTime(value: string | null) {
  if (!value)
    return t('memory.neverUpdated')
  return new Date(value).toLocaleString()
}

onMounted(loadMemory)
</script>

<template>
  <div class="memory-page flex h-full flex-col overflow-hidden bg-[var(--dt-background)] text-[var(--dt-foreground)]">
    <main class="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <section class="mx-auto flex max-w-7xl flex-col gap-5">
        <header class="overflow-hidden rounded-3xl border border-[var(--dt-border)] bg-[var(--dt-secondary)] p-6 shadow-sm">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--dt-muted-foreground)]">
                DeepTutor Memory
              </p>
              <h1 class="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                {{ t('memory.title') }}
              </h1>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-[var(--dt-muted-foreground)]">
                {{ t('memory.description') }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <NButton :loading="loading" @click="loadMemory">
                <template #icon>
                  <IconRiRefreshLine />
                </template>
                {{ t('memory.reload') }}
              </NButton>
              <NButton type="primary" :loading="refreshing" @click="refreshMemory">
                <template #icon>
                  <IconRiSparkling2Line />
                </template>
                {{ t('memory.refreshFromChat') }}
              </NButton>
            </div>
          </div>
        </header>

        <div class="grid gap-4 md:grid-cols-2">
          <button
            v-for="item in memoryStats"
            :key="item.key"
            class="group w-full rounded-2xl border p-5 text-left transition-all duration-200"
            :class="activeFile === item.key
              ? 'border-[var(--dt-primary)] bg-[var(--dt-primary-soft)] shadow-sm'
              : 'border-[var(--dt-border)] bg-[var(--dt-secondary)] hover:border-[var(--dt-primary)]/50 hover:bg-[var(--dt-muted)]/60'"
            @click="activeFile = item.key as MemoryFile"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-mono text-sm font-semibold">
                  {{ item.label }}
                </p>
                <p class="mt-2 text-sm leading-6 text-[var(--dt-muted-foreground)]">
                  {{ item.description }}
                </p>
              </div>
              <IconRiBrainLine v-if="item.key === 'profile'" class="text-2xl text-[var(--dt-primary)]" />
              <IconRiFileList3Line v-else class="text-2xl text-[var(--dt-primary)]" />
            </div>
            <div class="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--dt-muted-foreground)]">
              <span>{{ formatTime(item.updatedAt) }}</span>
            </div>
          </button>
        </div>

        <NSpin :show="loading">
          <section class="grid min-h-[560px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
            <div class="rounded-3xl border border-[var(--dt-border)] bg-[var(--dt-secondary)] p-4 shadow-sm sm:p-5">
              <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <NTabs v-model:value="activeFile" type="segment" animated class="sm:max-w-[360px]">
                  <NTabPane name="summary" :tab="t('memory.summaryLabel')" />
                  <NTabPane name="profile" :tab="t('memory.profileLabel')" />
                </NTabs>

                <div class="flex flex-wrap gap-2">
                  <NButton type="primary" :disabled="!hasUnsavedChanges" :loading="saving" @click="saveActiveFile">
                    <template #icon>
                      <IconRiSave3Line />
                    </template>
                    {{ t('common.save') }}
                  </NButton>
                  <NPopconfirm @positive-click="clearMemory(activeFile)">
                    <template #trigger>
                      <NButton tertiary type="error" :loading="clearing === activeFile">
                        <template #icon>
                          <IconRiDeleteBinLine />
                        </template>
                        {{ t('memory.clearCurrent') }}
                      </NButton>
                    </template>
                    {{ t('memory.clearCurrentConfirm') }}
                  </NPopconfirm>
                </div>
              </div>

              <div class="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--dt-muted-foreground)]">
                <NTag v-if="hasUnsavedChanges" type="warning" size="small" round>
                  {{ t('memory.unsaved') }}
                </NTag>
                <span>{{ t('memory.updatedAt') }}: {{ formatTime(activeUpdatedAt) }}</span>
              </div>

              <NInput
                v-model:value="activeContent"
                type="textarea"
                class="memory-editor"
                :placeholder="activeFile === 'summary' ? t('memory.summaryPlaceholder') : t('memory.profilePlaceholder')"
                :autosize="{ minRows: 24 }"
                show-count
              />
            </div>

            <aside class="rounded-3xl border border-[var(--dt-border)] bg-[var(--dt-secondary)] p-5 shadow-sm">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold">
                    {{ t('memory.preview') }}
                  </p>
                  <p class="mt-1 text-xs text-[var(--dt-muted-foreground)]">
                    {{ t('memory.previewDescription') }}
                  </p>
                </div>
                <NPopconfirm @positive-click="clearMemory()">
                  <template #trigger>
                    <NButton quaternary type="error" size="small" :loading="clearing === 'all'">
                      {{ t('memory.clearAll') }}
                    </NButton>
                  </template>
                  {{ t('memory.clearAllConfirm') }}
                </NPopconfirm>
              </div>

              <div v-if="previewLines.length" class="memory-preview">
                <template v-for="(line, index) in previewLines" :key="`${index}-${line}`">
                  <h2 v-if="line.startsWith('## ')" class="memory-preview__heading">
                    {{ line.slice(3) }}
                  </h2>
                  <p v-else-if="line.trim()" class="memory-preview__line">
                    {{ line }}
                  </p>
                  <div v-else class="h-3" />
                </template>
              </div>
              <NEmpty v-else :description="t('memory.empty')" class="py-16" />
            </aside>
          </section>
        </NSpin>
      </section>
    </main>
  </div>
</template>

<style scoped>
.memory-page {
  --dt-background: #FFFFFF;
  --dt-foreground: #1F2937;
  --dt-secondary: #FFFFFF;
  --dt-muted: #F3F4F6;
  --dt-muted-foreground: #6B7280;
  --dt-border: #E5E7EB;
  --dt-primary: #4B8F5A;
  --dt-primary-soft: rgba(75, 143, 90, 0.12);
}

:global(.dark) .memory-page {
  --dt-background: #24272E;
  --dt-foreground: #F9FAFB;
  --dt-secondary: #202329;
  --dt-muted: #2F333B;
  --dt-muted-foreground: #A1A1AA;
  --dt-border: #3F444D;
  --dt-primary: #79C37F;
  --dt-primary-soft: rgba(121, 195, 127, 0.16);
}

:deep(.memory-editor textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  line-height: 1.65;
}

.memory-preview {
  max-height: 650px;
  overflow-y: auto;
  border-radius: 18px;
  background: var(--dt-muted);
  padding: 18px;
}

.memory-preview__heading {
  margin: 18px 0 8px;
  color: var(--dt-foreground);
  font-size: 16px;
  font-weight: 700;
}

.memory-preview__heading:first-child {
  margin-top: 0;
}

.memory-preview__line {
  color: var(--dt-muted-foreground);
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
}
</style>
