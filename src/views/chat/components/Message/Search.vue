<script lang="ts" setup>
import { useBasicLayout } from '@/hooks/useBasicLayout'
import Spinner from '@/icons/Spinner.vue'

const props = defineProps<Props>()

const { t } = useI18n()

interface Props {
  variant?: 'search' | 'knowledgeGraph'
  searchQuery?: string
  searchStatus?: 'hit' | 'miss' | 'error'
  searchMessage?: string
  searchResults?: Chat.SearchResult[]
  searchUsageTime?: number
  searchEnd?: boolean
  loading?: boolean
}

const { isMobile } = useBasicLayout()
const instance = getCurrentInstance()
const uid = instance?.uid || Date.now() + Math.random().toString(36).substring(2)

const textRef = ref<HTMLElement>()
const isCollapsed = ref(true)

const isKnowledgeGraph = computed(() => props.variant === 'knowledgeGraph')

const searchBtnTitle = computed(() => {
  return t('chat.expandCollapseSearchResults')
})

const searchHeadingText = computed(() => {
  if (props.searchQuery)
    return `${isKnowledgeGraph.value ? t('chat.knowledgeGraphQuery') : t('chat.searchQuery')}: ${props.searchQuery}`
  return isKnowledgeGraph.value ? t('chat.knowledgeGraphSearching') : t('chat.searching')
})

const shouldShowSearchingIndicator = computed(() => {
  return props.loading && !props.searchEnd
})

const hasSearchResults = computed(() => {
  return !!props.searchResults && props.searchResults.length > 0
})

const fallbackKnowledgeGraphMessage = computed(() => {
  if (!isKnowledgeGraph.value)
    return ''
  if (props.searchStatus === 'miss')
    return t('chat.knowledgeGraphMissDetail')
  if (props.searchStatus === 'error')
    return t('chat.knowledgeGraphErrorDetail')
  if (props.searchStatus === 'hit' && !hasSearchResults.value)
    return t('chat.knowledgeGraphHitDetail')
  return ''
})

const displayMessage = computed(() => {
  if (props.searchMessage)
    return props.searchMessage
  return fallbackKnowledgeGraphMessage.value
})

const hasDetailMessage = computed(() => {
  return !!displayMessage.value && !shouldShowSearchingIndicator.value
})

const statusLabel = computed(() => {
  if (!isKnowledgeGraph.value || !props.searchStatus)
    return ''

  if (props.searchStatus === 'hit')
    return t('chat.knowledgeGraphHit')
  if (props.searchStatus === 'miss')
    return t('chat.knowledgeGraphMiss')
  return t('chat.knowledgeGraphError')
})

const statusClass = computed(() => {
  if (!isKnowledgeGraph.value || !props.searchStatus)
    return ''

  if (props.searchStatus === 'hit')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200'
  if (props.searchStatus === 'miss')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200'
  return 'bg-red-100 text-red-700 dark:bg-red-400/20 dark:text-red-200'
})

const headerComputedClass = computed(() => {
  return [
    'flex items-center justify-between gap-2',
    'p-2 pl-3 w-fit',
    'bg-blue-100 dark:bg-green-300/30',
    'text-xs select-none font-medium',
    'transition-all duration-200 ease-in-out',
    hasSearchResults.value ? 'cursor-pointer hover:bg-blue-200 dark:hover:bg-green-100/40' : 'cursor-default',
    (isCollapsed.value || !hasSearchResults.value) ? 'rounded-md' : 'rounded-t-md',
    isMobile.value ? 'max-w-full' : 'max-w-full',
    'shadow-xs',
  ]
})

const contentWrapperComputedClass = computed(() => {
  return [
    'overflow-hidden',
    'transition-all duration-300 ease-in-out',
    (isCollapsed.value || !hasSearchResults.value) ? 'max-h-0 opacity-0' : 'max-h-none opacity-100',
  ]
})

const actualContentComputedClass = computed(() => {
  return [
    'p-3',
    'bg-blue-50 dark:bg-green-300/20',
    'rounded-b-md shadow-xs',
    'text-xs leading-relaxed break-words',
    'prose prose-sm dark:prose-invert max-w-none',
  ]
})

function toggleCollapse() {
  if (hasSearchResults.value)
    isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div class="my-2">
    <div
      :class="headerComputedClass"
      :role="hasSearchResults ? 'button' : undefined"
      :tabindex="hasSearchResults ? 0 : -1"
      :aria-expanded="hasSearchResults ? !isCollapsed : undefined"
      :aria-controls="hasSearchResults ? `search-details-${uid}` : undefined"
      @click="hasSearchResults ? toggleCollapse() : null"
      @keydown.enter="hasSearchResults ? toggleCollapse() : null"
      @keydown.space="hasSearchResults ? toggleCollapse() : null"
    >
      <div class="flex items-center pr-2 min-w-0 flex-1">
        <template v-if="shouldShowSearchingIndicator">
          <Spinner class="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span class="text-blue-700 dark:text-blue-200 truncate">{{ isKnowledgeGraph ? t('chat.knowledgeGraphSearching') : t('chat.searching') }}</span>
          <span class="ml-1.5 mr-3 text-blue-400 dark:text-blue-500">|</span>
        </template>
        <span class="text-blue-800 dark:text-blue-100 truncate">{{ searchHeadingText }}</span>
        <template v-if="statusLabel">
          <span class="mx-3 text-blue-400 dark:text-blue-500">|</span>
          <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px]" :class="statusClass">{{ statusLabel }}</span>
        </template>
        <template v-if="searchUsageTime">
          <span class="mr-1.5 ml-3 text-blue-400 dark:text-blue-500">|</span>
          <span class="text-blue-600 dark:text-blue-300 truncate">{{ `${isKnowledgeGraph ? t('chat.knowledgeGraphUsageTime') : t('chat.searchUsageTime')}: ${searchUsageTime.toFixed(2)}s` }}</span>
        </template>
      </div>
      <button
        v-if="hasSearchResults"
        type="button"
        class="ml-auto flex items-center text-blue-500 dark:text-green-400 hover:text-blue-700 dark:hover:text-green-200 focus:outline-hidden p-1 shrink-0 rounded-full hover:bg-blue-200 dark:hover:bg-green-800/40"
        :aria-expanded="!isCollapsed"
        :aria-controls="`search-details-${uid}`"
        :title="searchBtnTitle"
        @click.stop="toggleCollapse"
        @keydown.enter.stop="toggleCollapse"
        @keydown.space.stop="toggleCollapse"
      >
        <svg
          class="w-4 h-4 transform transition-transform duration-200"
          :class="{ 'rotate-180': !isCollapsed }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <div
      v-if="hasDetailMessage && !hasSearchResults"
      class="mt-1 rounded-md bg-blue-50 px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-xs dark:bg-green-300/20 dark:text-gray-200"
    >
      {{ displayMessage }}
    </div>

    <div :class="contentWrapperComputedClass">
      <div
        v-if="hasSearchResults"
        :id="`search-details-${uid}`"
        ref="textRef"
        :class="actualContentComputedClass"
        role="region"
        :aria-hidden="isCollapsed"
      >
        <div class="w-full space-y-3">
          <p v-if="hasDetailMessage" class="mb-3 text-xs leading-relaxed text-gray-700 dark:text-gray-200">
            {{ displayMessage }}
          </p>
          <div
            v-for="(result, index) in props.searchResults"
            :key="index"
            class="border-l-2 border-blue-300 dark:border-blue-300 pl-3"
          >
            <div class="flex items-start justify-between mb-1">
              <a
                v-if="result.url"
                :href="result.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-700 dark:text-red-200 hover:text-blue-900 dark:hover:text-blue-100 text-sm font-medium leading-tight block pr-2 hover:underline"
              >
                {{ result.title }}
              </a>
              <span
                v-else
                class="text-blue-700 dark:text-red-200 text-sm font-medium leading-tight block pr-2"
              >
                {{ result.title }}
              </span>
            </div>
            <p class="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mb-1">
              {{ result.content }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
