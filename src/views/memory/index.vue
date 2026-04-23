<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-[var(--dt-background)] text-[var(--dt-foreground)]">
    <main class="h-full overflow-y-auto px-6 py-8">
      <section class="mx-auto max-w-5xl">
        <div class="mb-6">
          <p class="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--dt-muted-foreground)]">
            DeepTutor
          </p>
          <h1 class="mt-2 text-3xl font-semibold tracking-[-0.03em]">
            {{ t('sidebar.memory') }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[var(--dt-muted-foreground)]">
            {{ t('sidebar.memoryPlaceholder') }}
          </p>
        </div>

        <div class="rounded-2xl border border-dashed border-[var(--dt-border)] bg-[var(--dt-secondary)]/30 px-8 py-16 text-center">
          <IconRiBrainLine class="mx-auto mb-4 text-4xl text-[var(--dt-muted-foreground)]" />
          <p class="text-sm text-[var(--dt-muted-foreground)]">
            {{ t('sidebar.frontendOnly') }}
          </p>
        </div>
      </section>
    </main>
  </div>
</template>
