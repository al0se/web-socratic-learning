<script setup lang='ts'>
import { fetchUpdateUserPassword } from '@/api'
import { UserPassword } from './model'

const { t } = useI18n()

const ms = useMessage()

const loading = ref(false)
const saving = ref(false)

const config = ref(new UserPassword())

const saveDisabledReason = computed(() => {
  const { oldPassword, newPassword, confirmPassword } = config.value

  if (!oldPassword)
    return t('setting.oldPasswordRequired')
  if (!newPassword)
    return t('setting.newPasswordRequired')
  if (!confirmPassword)
    return t('setting.confirmNewPasswordRequired')
  if (newPassword.length < 6)
    return t('setting.passwordMinLength')
  if (confirmPassword !== newPassword)
    return t('setting.validatePasswordStartWith')
  if (oldPassword === newPassword)
    return t('setting.passwodSame')

  return ''
})

const isSaveDisabled = computed(() => !!saveDisabledReason.value)

async function updatePassword() {
  saving.value = true
  try {
    if (config.value.newPassword !== config.value.confirmPassword)
      throw new Error(t('setting.validatePasswordStartWith'))
    if (config.value.oldPassword === config.value.newPassword)
      throw new Error(t('setting.passwodSame'))
    await fetchUpdateUserPassword(config.value as UserPassword)
    ms.success(t('common.success'))
    config.value = new UserPassword()
  }
  catch (error: any) {
    ms.error(error.message)
  }
  saving.value = false
}
</script>

<template>
  <NSpin :show="loading">
    <div class="p-4 space-y-5 min-h-[200px]">
      <div class="space-y-6">
        <div class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.oldPassword') }}</span>
          <div class="w-[200px]">
            <NInput
              v-model:value="config.oldPassword"
              type="password"
              :placeholder="t('setting.oldPassword')"
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.newPassword') }}</span>
          <div class="w-[200px]">
            <NInput
              v-model:value="config.newPassword"
              type="password"
              :placeholder="t('setting.newPassword')"
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]">{{ t('setting.confirmNewPassword') }}</span>
          <div class="w-[200px]">
            <NInput
              v-model:value="config.confirmPassword"
              type="password"
              :disabled="!config.newPassword"
              :placeholder="t('setting.confirmNewPassword')"
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="shrink-0 w-[100px]" />
          <div class="flex max-w-[320px] flex-col items-start gap-2">
            <NButton
              :loading="saving" type="primary" :disabled="isSaveDisabled"
              @click="updatePassword()"
            >
              {{ t('common.save') }}
            </NButton>
            <div
              v-if="saveDisabledReason"
              class="text-[12px] leading-5 text-[#d97706]"
            >
              {{ saveDisabledReason }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </NSpin>
</template>
