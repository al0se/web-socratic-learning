<script setup lang='ts'>
import defaultAvatar from '@/assets/avatar.svg'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAuthStore, useUserStore } from '@/store'
import { isString } from '@/utils/is'
import Permission from '@/views/chat/layout/Permission.vue'
import { UserRole } from '../Setting/model'

const { t } = useI18n()
const route = useRoute()
const userStore = useUserStore()
const authStore = useAuthStore()
const { isMobile } = useBasicLayout()
const showPermission = ref(false)

const needPermission = computed(() => !!authStore.session?.auth && !authStore.token && !authStore.session?.authProxyEnabled && (isMobile.value || showPermission.value))

const userInfo = computed(() => userStore.userInfo)

onMounted(async () => {
  const sign = route.query.verifyresetpassword as string
  if (sign)
    showPermission.value = true
})
</script>

<template>
  <div class="flex items-center overflow-hidden">
    <div class="w-8 h-8 overflow-hidden rounded-full shrink-0">
      <template v-if="isString(userInfo.avatar) && userInfo.avatar.length > 0">
        <NAvatar
          size="medium"
          round
          :src="userInfo.avatar"
          :fallback-src="defaultAvatar"
        />
      </template>
      <template v-else>
        <NAvatar size="medium" round :src="defaultAvatar" />
      </template>
    </div>
    <div class="flex-1 min-w-0 ml-1.5">
      <h2 v-if="userInfo.name" class="text-sm leading-tight">
        <span class="block" :title="userInfo.name">{{ userInfo.name }}</span>
        <span v-if="userInfo.roles.length > 0" class="mt-1 inline-flex origin-left scale-90">
          <NTag size="tiny" class="text-[4px] leading-none" :bordered="false" type="success">
            {{ UserRole[userInfo.roles[0]] }}
          </NTag>
        </span>
      </h2>
      <p v-if="userInfo.name" class="overflow-hidden text-[9px] text-gray-500 text-ellipsis whitespace-nowrap">
        <span
          v-if="isString(userInfo.description) && userInfo.description !== ''"
          v-html="userInfo.description"
        />
      </p>
      <button
        v-else
        type="button"
        class="group flex min-w-0 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium text-[var(--dt-primary)] transition-colors hover:bg-[var(--dt-primary-soft)]"
        @click="showPermission = true"
      >
        <span v-if="!!authStore.session?.auth && !authStore.token" class="truncate">
          {{ t('common.notLoggedIn') }}
        </span>
        <span v-else class="truncate">
          {{ authStore.session?.title }}
        </span>
      </button>
    </div>
    <Permission :visible="needPermission" @update:visible="(newValue) => showPermission = newValue" />
  </div>
</template>
