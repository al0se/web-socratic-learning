<script lang="ts" setup>
import defaultAvatar from '@/assets/avatar.svg'
import { useUserStore } from '@/store'
import { isString } from '@/utils/is'

interface Props {
  image?: boolean
  onlyDefault?: boolean
}
defineProps<Props>()

const userStore = useUserStore()

const avatar = computed(() => userStore.userInfo.avatar)
const hasCustomAvatar = computed(() => isString(avatar.value) && avatar.value.length > 0)
const ignoreAvatarForExport = computed(() => /^https?:\/\//.test(avatar.value ?? ''))
</script>

<template>
  <template v-if="image">
    <NAvatar
      v-if="hasCustomAvatar && !onlyDefault"
      :src="avatar"
      :fallback-src="defaultAvatar"
      :data-html2canvas-ignore="ignoreAvatarForExport ? 'true' : undefined"
    />
    <NAvatar v-else round :src="defaultAvatar" />
  </template>
  <span v-else class="text-[28px] dark:text-white">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" width="1em" height="1em">
      <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="8" width="20" height="16" rx="3" />
        <circle cx="12.5" cy="16" r="2" />
        <circle cx="19.5" cy="16" r="2" />
        <path d="M16 6v-3" />
      </g>
    </svg>
  </span>
</template>
