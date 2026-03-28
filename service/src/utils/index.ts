import fs from 'node:fs'
import path from 'node:path'

interface SendResponseOptions<T = any> {
  type: 'Success' | 'Fail'
  message?: string
  data?: T
}

function resolvePromptFilePath() {
  const candidates = [
    path.resolve(process.cwd(), '..', 'prompt', 'prompt.txt'),
    path.resolve(process.cwd(), 'prompt', 'prompt.txt'),
  ]

  return candidates.find(filePath => fs.existsSync(filePath))
}

function loadDefaultRoomPrompt() {
  const promptFilePath = resolvePromptFilePath()
  if (!promptFilePath)
    return ''

  try {
    return fs.readFileSync(promptFilePath, 'utf8').trim()
  }
  catch (error) {
    globalThis.console.error('Failed to load default room prompt:', error)
    return ''
  }
}

export const DEFAULT_ROOM_PROMPT = loadDefaultRoomPrompt()

export function sendResponse<T>(options: SendResponseOptions<T>) {
  if (options.type === 'Success') {
    return Promise.resolve({
      message: options.message ?? null,
      data: options.data ?? null,
      status: options.type,
    })
  }

  // eslint-disable-next-line prefer-promise-reject-errors
  return Promise.reject({
    message: options.message ?? 'Failed',
    data: options.data ?? null,
    status: options.type,
  })
}
