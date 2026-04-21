<script setup lang='ts'>
import type { ConfigState, KnowledgeGraphQueryMode } from './model'
import { fetchChatConfig, fetchTestKnowledgeGraph, fetchUpdateKnowledgeGraph } from '@/api'
import { KnowledgeGraphConfig } from './model'

const { t } = useI18n()

const ms = useMessage()

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testText = ref<string>('What learning methods are mentioned in the lessons?')
const defaultKnowledgeGraphRepoDir = 'knowledge-graph/LightRAG'
const defaultKnowledgeGraphPythonPath = 'python'
const defaultKnowledgeGraphWorkingDir = 'knowledge-graph/lesson_kb'

const queryModeOptions: { label: string, key: KnowledgeGraphQueryMode, value: KnowledgeGraphQueryMode }[] = [
  { label: 'Mix', key: 'mix', value: 'mix' },
  { label: 'Hybrid', key: 'hybrid', value: 'hybrid' },
  { label: 'Local', key: 'local', value: 'local' },
  { label: 'Global', key: 'global', value: 'global' },
  { label: 'Naive', key: 'naive', value: 'naive' },
]

const config = ref<KnowledgeGraphConfig>()

async function fetchConfig() {
  try {
    loading.value = true
    const { data } = await fetchChatConfig<ConfigState>()
    if (!data.knowledgeGraphConfig) {
      data.knowledgeGraphConfig = new KnowledgeGraphConfig(false, {
        repoDir: defaultKnowledgeGraphRepoDir,
        pythonPath: defaultKnowledgeGraphPythonPath,
        workingDir: defaultKnowledgeGraphWorkingDir,
        workspace: '',
        queryMode: 'mix',
        maxResults: 10,
        topK: 10,
        chunkTopK: 10,
        maxEntityTokens: 6000,
        maxRelationTokens: 8000,
        maxTotalTokens: 30000,
        timeoutMs: 120000,
        enableRerank: true,
      })
    }
    if (!data.knowledgeGraphConfig.options)
      data.knowledgeGraphConfig.options = {}
    if (!data.knowledgeGraphConfig.options.repoDir)
      data.knowledgeGraphConfig.options.repoDir = defaultKnowledgeGraphRepoDir
    if (!data.knowledgeGraphConfig.options.pythonPath)
      data.knowledgeGraphConfig.options.pythonPath = defaultKnowledgeGraphPythonPath
    if (!data.knowledgeGraphConfig.options.workingDir)
      data.knowledgeGraphConfig.options.workingDir = defaultKnowledgeGraphWorkingDir
    if (data.knowledgeGraphConfig.options.workspace === undefined)
      data.knowledgeGraphConfig.options.workspace = ''
    if (!data.knowledgeGraphConfig.options.queryMode)
      data.knowledgeGraphConfig.options.queryMode = 'mix'
    if (!data.knowledgeGraphConfig.options.maxResults)
      data.knowledgeGraphConfig.options.maxResults = 10
    if (!data.knowledgeGraphConfig.options.topK)
      data.knowledgeGraphConfig.options.topK = 10
    if (!data.knowledgeGraphConfig.options.chunkTopK)
      data.knowledgeGraphConfig.options.chunkTopK = 10
    if (!data.knowledgeGraphConfig.options.maxEntityTokens)
      data.knowledgeGraphConfig.options.maxEntityTokens = 6000
    if (!data.knowledgeGraphConfig.options.maxRelationTokens)
      data.knowledgeGraphConfig.options.maxRelationTokens = 8000
    if (!data.knowledgeGraphConfig.options.maxTotalTokens)
      data.knowledgeGraphConfig.options.maxTotalTokens = 30000
    if (!data.knowledgeGraphConfig.options.timeoutMs)
      data.knowledgeGraphConfig.options.timeoutMs = 120000
    if (data.knowledgeGraphConfig.options.enableRerank === undefined)
      data.knowledgeGraphConfig.options.enableRerank = true
    config.value = data.knowledgeGraphConfig
  }
  finally {
    loading.value = false
  }
}

async function updateKnowledgeGraphInfo() {
  saving.value = true
  try {
    const { data } = await fetchUpdateKnowledgeGraph(config.value as KnowledgeGraphConfig)
    config.value = data
    ms.success(t('common.success'))
  }
  catch (error: any) {
    ms.error(error.message)
  }
  saving.value = false
}

async function testKnowledgeGraph() {
  testing.value = true
  try {
    const { message } = await fetchTestKnowledgeGraph(testText.value, config.value as KnowledgeGraphConfig) as { status: string, message: string }
    ms.success(message)
  }
  catch (error: any) {
    ms.error(error.message)
  }
  testing.value = false
}

onMounted(() => {
  fetchConfig()
})
</script>

<template>
  <NSpin :show="loading">
    <div class="p-4 space-y-5 min-h-[200px]">
      <div class="space-y-6">
        <div class="flex items-center space-x-4">
          <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphEnabled') }}</span>
          <div class="flex-1">
            <NSwitch
              :round="false" :value="config && config.enabled"
              @update:value="(val) => { if (config) config.enabled = val }"
            />
          </div>
        </div>
        <template v-if="config && config.enabled">
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphRepoDir') }}</span>
            <div class="flex-1">
              <NInput v-model:value="config.options.repoDir" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphPythonPath') }}</span>
            <div class="flex-1">
              <NInput v-model:value="config.options.pythonPath" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphWorkingDir') }}</span>
            <div class="flex-1">
              <NInput v-model:value="config.options.workingDir" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphWorkspace') }}</span>
            <div class="flex-1">
              <NInput v-model:value="config.options.workspace" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphQueryMode') }}</span>
            <div class="flex-1">
              <NSelect
                style="width: 140px"
                :value="config.options.queryMode"
                :options="queryModeOptions"
                @update-value="(val) => { if (config) config.options.queryMode = val as KnowledgeGraphQueryMode }"
              />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphMaxResults') }}</span>
            <div class="flex-1">
              <NInputNumber v-model:value="config.options.maxResults" :min="1" :max="20" style="width: 140px" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphTopK') }}</span>
            <div class="flex-1">
              <NInputNumber v-model:value="config.options.topK" :min="1" :max="100" style="width: 140px" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphChunkTopK') }}</span>
            <div class="flex-1">
              <NInputNumber v-model:value="config.options.chunkTopK" :min="1" :max="100" style="width: 140px" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphMaxEntityTokens') }}</span>
            <div class="flex-1">
              <NInputNumber v-model:value="config.options.maxEntityTokens" :min="100" :max="50000" style="width: 160px" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphMaxRelationTokens') }}</span>
            <div class="flex-1">
              <NInputNumber v-model:value="config.options.maxRelationTokens" :min="100" :max="50000" style="width: 160px" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphMaxTotalTokens') }}</span>
            <div class="flex-1">
              <NInputNumber v-model:value="config.options.maxTotalTokens" :min="1000" :max="100000" style="width: 160px" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphTimeoutMs') }}</span>
            <div class="flex-1">
              <NInputNumber v-model:value="config.options.timeoutMs" :min="1000" :max="300000" style="width: 160px" />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphEnableRerank') }}</span>
            <div class="flex-1">
              <NSwitch
                :round="false" :value="config.options.enableRerank"
                @update:value="(val) => { if (config) config.options.enableRerank = val }"
              />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <span class="shrink-0 w-[160px]">{{ t('setting.knowledgeGraphTest') }}</span>
            <div class="flex-1">
              <NInput v-model:value="testText" />
            </div>
          </div>
        </template>
        <div class="flex items-center space-x-4">
          <span class="shrink-0 w-[160px]" />
          <div class="flex flex-wrap items-center gap-4">
            <NButton :loading="saving" type="primary" @click="updateKnowledgeGraphInfo()">
              {{ t('common.save') }}
            </NButton>
            <NButton :loading="testing" type="info" @click="testKnowledgeGraph()">
              {{ t('common.test') }}
            </NButton>
          </div>
        </div>
      </div>
    </div>
  </NSpin>
</template>
