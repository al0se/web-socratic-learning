<script setup lang='ts'>
import type { ConfigState, SearchServiceProvider } from './model'
import { fetchChatConfig, fetchTestSearch, fetchUpdateSearch } from '@/api'
import { SearchConfig } from './model'

const { t } = useI18n()

const ms = useMessage()

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testText = ref<string>('What is the latest news about artificial intelligence?')

const serviceOptions: { label: string, key: SearchServiceProvider, value: SearchServiceProvider }[] = [
  { label: 'Tavily', key: 'tavily', value: 'tavily' },
]

const DEFAULT_SEARCH_QUERY_SYSTEM_MESSAGE = 'Current time: {current_time}. Decide whether web search is needed for the user request. If web search is needed, return exactly one query wrapped in <search_query>...</search_query>. If web search is not needed, return <search_query></search_query>. Do not answer the user. Do not output any other text. Keep the query under 300 characters.'
const DEFAULT_SEARCH_RESULT_SYSTEM_MESSAGE = 'Current time: {current_time}. Web search results are provided in the conversation. Use them as the primary source for recent or time-sensitive facts. If the provided search results are sufficient, do not say that you cannot access real-time information. If the results are insufficient or conflicting, say what is missing or uncertain. Respond in the same language as the user.'

const config = ref<SearchConfig>()

async function fetchConfig() {
  try {
    loading.value = true
    const { data } = await fetchChatConfig<ConfigState>()
    if (!data.searchConfig)
      data.searchConfig = new SearchConfig(false, 'tavily', { apiKey: '' }, DEFAULT_SEARCH_RESULT_SYSTEM_MESSAGE, DEFAULT_SEARCH_QUERY_SYSTEM_MESSAGE)
    if (!data.searchConfig.options)
      data.searchConfig.options = { apiKey: '' }
    if (!data.searchConfig.options.maxResults)
      data.searchConfig.options.maxResults = 10
    if (data.searchConfig.options.includeRawContent === undefined)
      data.searchConfig.options.includeRawContent = false
    if (!data.searchConfig.provider)
      data.searchConfig.provider = 'tavily'
    if (!data.searchConfig.systemMessageWithSearchResult)
      data.searchConfig.systemMessageWithSearchResult = DEFAULT_SEARCH_RESULT_SYSTEM_MESSAGE
    if (!data.searchConfig.systemMessageGetSearchQuery)
      data.searchConfig.systemMessageGetSearchQuery = DEFAULT_SEARCH_QUERY_SYSTEM_MESSAGE
    config.value = data.searchConfig
  }
  finally {
    loading.value = false
  }
}

async function updateSearchInfo() {
  saving.value = true
  try {
    const { data } = await fetchUpdateSearch(config.value as SearchConfig)
    config.value = data
    ms.success(t('common.success'))
  }
  catch (error: any) {
    ms.error(error.message)
  }
  saving.value = false
}

async function testSearch() {
  testing.value = true
  try {
    const { message } = await fetchTestSearch(testText.value as string, config.value as SearchConfig) as { status: string, message: string }
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
          <span class="shrink-0 w-[100px]">{{ t('setting.searchEnabled') }}</span>
          <div class="flex-1">
            <NSwitch
              :round="false" :value="config && config.enabled"
              @update:value="(val) => { if (config) config.enabled = val }"
            />
          </div>
        </div>
        <div v-if="config && config.enabled" class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.searchProvider') }}</span>
          <div class="flex-1">
            <NSelect
              style="width: 140px"
              :value="config && config.provider"
              :options="serviceOptions"
              @update-value="(val) => { if (config) config.provider = val as SearchServiceProvider }"
            />
          </div>
        </div>
        <div v-if="config && config.enabled" class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.searchApiKey') }}</span>
          <div class="flex-1">
            <NInput
              v-model:value="config.options.apiKey"
              placeholder=""
              show-password-on="click"
            />
          </div>
        </div>
        <div v-if="config && config.enabled" class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.searchMaxResults') }}</span>
          <div class="flex-1">
            <NInputNumber
              v-model:value="config.options.maxResults"
              :min="1"
              :max="20"
              placeholder="1-20"
              style="width: 140px"
            />
          </div>
        </div>
        <div v-if="config && config.enabled" class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.searchIncludeRawContent') }}</span>
          <div class="flex-1">
            <NSwitch
              :round="false" :value="config && config.options.includeRawContent"
              @update:value="(val) => { if (config && config.options) config.options.includeRawContent = val }"
            />
          </div>
        </div>
        <div v-if="config && config.enabled" class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.searchTest') }}</span>
          <div class="flex-1">
            <NInput
              v-model:value="testText"
              placeholder=""
            />
          </div>
        </div>
        <div v-if="config && config.enabled" class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.systemMessageWithSearchResult') }}</span>
          <div class="flex-1">
            <NInput v-model:value="config.systemMessageWithSearchResult" type="textarea" :autosize="{ minRows: 2 }" :placeholder="t('setting.systemMessageWithSearchResultPlaceholder')" />
          </div>
        </div>
        <div v-if="config && config.enabled" class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.systemMessageGetSearchQuery') }}</span>
          <div class="flex-1">
            <NInput v-model:value="config.systemMessageGetSearchQuery" type="textarea" :autosize="{ minRows: 2 }" :placeholder="t('setting.systemMessageGetSearchQueryPlaceholder')" />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]" />
          <div class="flex flex-wrap items-center gap-4">
            <NButton :loading="saving" type="primary" @click="updateSearchInfo()">
              {{ t('common.save') }}
            </NButton>
            <NButton :loading="testing" type="info" @click="testSearch()">
              {{ t('common.test') }}
            </NButton>
          </div>
        </div>
      </div>
    </div>
  </NSpin>
</template>
