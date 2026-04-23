import type { ClientOptions } from 'openai'
import type { RequestInit } from 'undici'
import type { ChatInfo, ChatRoom, KeyConfig, MemoryFile, MemoryInfo, UserInfo } from '../storage/model'
import process from 'node:process'
import OpenAI from 'openai'
import * as undici from 'undici'
import { getCacheApiKeys, getCacheConfig } from '../storage/config'
import { Status } from '../storage/model'
import { clearUserMemory, clearUserMemoryFile, getChatRoom, getChatRooms, getChats, getUserMemory, upsertUserMemoryFile } from '../storage/mongo'
import { hasAnyRole, isNotEmptyString } from '../utils/is'

export type { MemoryFile } from '../storage/model'

export const MEMORY_FILES: MemoryFile[] = ['summary', 'profile']

const NO_CHANGE = 'NO_CHANGE'

export interface MemorySnapshot {
  summary: string
  profile: string
  summary_updated_at: string | null
  profile_updated_at: string | null
}

export interface MemoryUpdateResult {
  content: string
  changed: boolean
  updated_at: string | null
}

interface MemoryRefreshOptions {
  language?: string
  maxMessages?: number
  user?: UserInfo
  userId?: string
  chatModel?: string
}

interface RewriteLlmOptions {
  chatModel?: string
  user?: UserInfo
}

interface ResolvedMemoryKey {
  key: KeyConfig
  model: string
}

export class MemoryService {
  private toSnapshot(memory: MemoryInfo): MemorySnapshot {
    return {
      summary: memory.summary || '',
      profile: memory.profile || '',
      summary_updated_at: memory.summaryUpdatedAt || null,
      profile_updated_at: memory.profileUpdatedAt || null,
    }
  }

  async readFile(userId: string, which: MemoryFile): Promise<string> {
    const memory = await getUserMemory(userId)
    return String(memory[which] || '').trim()
  }

  async readSummary(userId: string): Promise<string> {
    return await this.readFile(userId, 'summary')
  }

  async readProfile(userId: string): Promise<string> {
    return await this.readFile(userId, 'profile')
  }

  async readSnapshot(userId: string): Promise<MemorySnapshot> {
    return this.toSnapshot(await getUserMemory(userId))
  }

  async writeFile(userId: string, which: MemoryFile, content: string): Promise<MemorySnapshot> {
    return this.toSnapshot(await upsertUserMemoryFile(userId, which, content))
  }

  async writeMemory(userId: string, content: string): Promise<MemorySnapshot> {
    return await this.writeFile(userId, 'profile', content)
  }

  async clearFile(userId: string, which: MemoryFile): Promise<MemorySnapshot> {
    return this.toSnapshot(await clearUserMemoryFile(userId, which))
  }

  async clearMemory(userId: string): Promise<MemorySnapshot> {
    return this.toSnapshot(await clearUserMemory(userId))
  }

  async buildMemoryContext(userId: string, maxChars = 4000): Promise<string> {
    const parts: string[] = []

    const profile = await this.readProfile(userId)
    if (profile)
      parts.push(`### User Profile\n${profile}`)

    const summary = await this.readSummary(userId)
    if (summary)
      parts.push(`### Learning Context\n${summary}`)

    if (parts.length === 0)
      return ''

    let combined = parts.join('\n\n')
    if (combined.length > maxChars)
      combined = `${combined.slice(0, maxChars).trimEnd()}\n...[truncated]`

    return [
      '## Background Memory',
      'Use this memory sparingly, only when directly relevant.',
      '',
      combined,
    ].join('\n')
  }

  async getPreferencesText(userId: string): Promise<string> {
    const profile = await this.readProfile(userId)
    return profile ? `## User Profile\n${profile}` : ''
  }

  async refreshFromTurn(options: {
    userMessage: string
    assistantMessage: string
    sessionId?: string
    capability?: string
    language?: string
    timestamp?: string
    user?: UserInfo
    userId?: string
    chatModel?: string
  }): Promise<MemoryUpdateResult> {
    const userId = resolveMemoryUserId(options.userId, options.user)
    const userMessage = options.userMessage.trim()
    const assistantMessage = options.assistantMessage.trim()
    if (!userMessage || !assistantMessage)
      return { content: '', changed: false, updated_at: null }

    const source = [
      `[Session] ${options.sessionId || '(unknown)'}`,
      `[Capability] ${options.capability || 'chat'}`,
      `[Timestamp] ${options.timestamp || new Date().toISOString()}`,
      '',
      `[User]\n${userMessage}`,
      '',
      `[Assistant]\n${assistantMessage}`,
    ].join('\n')

    const rewriteOptions = {
      chatModel: options.chatModel,
      user: options.user,
    }
    const profileChanged = await this.rewriteOne(userId, 'profile', source, options.language || 'en', rewriteOptions)
    const summaryChanged = await this.rewriteOne(userId, 'summary', source, options.language || 'en', rewriteOptions)

    const snapshot = await this.readSnapshot(userId)
    return {
      content: snapshot.profile,
      changed: profileChanged || summaryChanged,
      updated_at: snapshot.profile_updated_at,
    }
  }

  async refreshFromSession(
    sessionId?: string | null,
    options: MemoryRefreshOptions = {},
  ): Promise<MemoryUpdateResult> {
    const userId = resolveMemoryUserId(options.userId, options.user)
    const targetRoom = await resolveTargetRoom(sessionId, userId)
    if (!targetRoom)
      return { content: '', changed: false, updated_at: null }

    const chats = await getChats(targetRoom.roomId)
    const relevant = buildConversationMessages(chats).slice(-(options.maxMessages || 10))
    if (relevant.length === 0)
      return { content: '', changed: false, updated_at: null }

    const transcript = relevant
      .map(message => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
      .join('\n\n')

    const source = [
      `[Session] ${targetRoom.roomId}`,
      `[Capability] ${targetRoom.title || 'chat'}`,
      '',
      `[Recent Transcript]\n${transcript}`,
    ].join('\n')

    const rewriteOptions = {
      chatModel: options.chatModel || targetRoom.chatModel,
      user: options.user,
    }
    const profileChanged = await this.rewriteOne(userId, 'profile', source, options.language || 'en', rewriteOptions)
    const summaryChanged = await this.rewriteOne(userId, 'summary', source, options.language || 'en', rewriteOptions)

    const snapshot = await this.readSnapshot(userId)
    return {
      content: snapshot.profile,
      changed: profileChanged || summaryChanged,
      updated_at: snapshot.profile_updated_at,
    }
  }

  private async rewriteOne(
    userId: string,
    which: MemoryFile,
    source: string,
    language: string,
    options: RewriteLlmOptions,
  ): Promise<boolean> {
    const current = await this.readFile(userId, which)
    const zh = language.toLowerCase().startsWith('zh')
    const [systemPrompt, userPrompt] = which === 'profile'
      ? profilePrompts(current, source, zh)
      : summaryPrompts(current, source, zh)

    const raw = stripCodeFence(await completeMemoryRewrite(systemPrompt, userPrompt, options)).trim()
    if (!raw || raw === NO_CHANGE)
      return false
    if (raw === current)
      return false

    await this.writeFile(userId, which, raw)
    return true
  }
}

function resolveMemoryUserId(userId?: string, user?: UserInfo): string {
  const resolved = String(userId || user?._id || '').trim()
  if (!resolved)
    throw new Error('Missing user id for memory')
  return resolved
}

function stripCodeFence(content: string): string {
  let cleaned = String(content || '').trim()
  if (cleaned.startsWith('```')) {
    const firstNewlineIndex = cleaned.indexOf('\n')
    cleaned = firstNewlineIndex >= 0 ? cleaned.slice(firstNewlineIndex + 1) : ''
    if (cleaned.trimEnd().endsWith('```')) {
      cleaned = cleaned.trimEnd()
      cleaned = cleaned.slice(0, -3)
    }
  }
  return cleaned.trim()
}

function profilePrompts(current: string, source: string, zh: boolean): [string, string] {
  if (zh) {
    return [
      `You maintain a user profile document. Only keep stable identity, preferences, learning style, and knowledge levels. If nothing should change, return exactly ${NO_CHANGE}. Return rewritten content in Chinese.`,
      [
        'Rewrite the user profile if needed. Suggested sections:',
        '## Identity',
        '## Learning Style',
        '## Knowledge Level',
        '## Preferences',
        '',
        'Rules: keep it short, remove stale items, no transient chatter. Return the document in Chinese.',
        '',
        `[Current profile]\n${current || '(empty)'}`,
        '',
        `[New material]\n${source}`,
      ].join('\n'),
    ]
  }

  return [
    `You maintain a user profile document. Only keep stable identity, preferences, learning style, and knowledge levels. If nothing should change, return exactly ${NO_CHANGE}.`,
    [
      'Rewrite the user profile if needed. Suggested sections:',
      '## Identity',
      '## Learning Style',
      '## Knowledge Level',
      '## Preferences',
      '',
      'Rules: keep it short, remove stale items, no transient chatter.',
      '',
      `[Current profile]\n${current || '(empty)'}`,
      '',
      `[New material]\n${source}`,
    ].join('\n'),
  ]
}

function summaryPrompts(current: string, source: string, zh: boolean): [string, string] {
  if (zh) {
    return [
      `You maintain a learning journey summary. Track what the user is studying, what they have accomplished, and what open questions remain. If nothing should change, return exactly ${NO_CHANGE}. Return rewritten content in Chinese.`,
      [
        'Rewrite the learning summary if needed. Suggested sections:',
        '## Current Focus',
        '## Accomplishments',
        '## Open Questions',
        '',
        'Rules: keep it short, remove completed/stale items. Return the document in Chinese.',
        '',
        `[Current summary]\n${current || '(empty)'}`,
        '',
        `[New material]\n${source}`,
      ].join('\n'),
    ]
  }

  return [
    `You maintain a learning journey summary. Track what the user is studying, what they have accomplished, and what open questions remain. If nothing should change, return exactly ${NO_CHANGE}.`,
    [
      'Rewrite the learning summary if needed. Suggested sections:',
      '## Current Focus',
      '## Accomplishments',
      '## Open Questions',
      '',
      'Rules: keep it short, remove completed/stale items.',
      '',
      `[Current summary]\n${current || '(empty)'}`,
      '',
      `[New material]\n${source}`,
    ].join('\n'),
  ]
}

async function completeMemoryRewrite(
  systemPrompt: string,
  userPrompt: string,
  options: RewriteLlmOptions,
): Promise<string> {
  const resolved = await resolveMemoryKey(options)
  const openai = await createMemoryOpenAIClient(resolved.key)

  if (resolved.key.keyModel === 'ResponsesAPI') {
    const reasoning: OpenAI.Reasoning = resolved.model.startsWith('gpt') && resolved.model.endsWith('chat-latest')
      ? {}
      : {
          effort: resolved.model.startsWith('gpt-5.') ? 'none' : 'minimal',
        }
    const response = await openai.responses.create({
      model: resolved.model,
      instructions: systemPrompt,
      input: userPrompt,
      max_output_tokens: 900,
      reasoning,
      store: false,
    })
    return response.output_text || ''
  }

  const body: OpenAI.ChatCompletionCreateParamsNonStreaming = {
    model: resolved.model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 900,
  }

  if (resolved.key.keyModel === 'VLLM') {
    // @ts-expect-error vLLM supports this non-OpenAI extension.
    body.chat_template_kwargs = {
      enable_thinking: false,
    }
  }
  else if (resolved.key.keyModel === 'FastDeploy') {
    body.metadata = {
      // @ts-expect-error FastDeploy supports this non-OpenAI extension.
      enable_thinking: false,
    }
  }

  const completion = await openai.chat.completions.create(body)
  return completion.choices[0]?.message?.content || ''
}

async function createMemoryOpenAIClient(key: KeyConfig): Promise<OpenAI> {
  const config = await getCacheConfig()
  const clientOptions: ClientOptions = {
    baseURL: isNotEmptyString(key.baseUrl) ? key.baseUrl : config.apiBaseUrl,
    apiKey: key.key,
  }

  const httpsProxy = config.httpsProxy
  if (httpsProxy && isNotEmptyString(httpsProxy)) {
    clientOptions.fetch = (input: string | URL | Request, init: RequestInit) => {
      return undici.fetch(input, {
        ...init,
        dispatcher: new undici.ProxyAgent({
          uri: httpsProxy,
        }),
      })
    }
  }

  return new OpenAI(clientOptions)
}

async function resolveMemoryKey(options: RewriteLlmOptions): Promise<ResolvedMemoryKey> {
  const config = await getCacheConfig()
  const requested = parseChatModel(options.chatModel || process.env.MEMORY_MODEL || config.siteConfig?.chatModels?.split(',')[0] || '')
  const allKeys = (await getCacheApiKeys()).filter(key => key.status !== Status.Disabled)
  const roleKeys = options.user?.roles?.length
    ? allKeys.filter(key => hasAnyRole(key.userRoles, options.user.roles))
    : allKeys

  if (requested.keyId) {
    const specified = roleKeys.find(key => key._id?.toString() === requested.keyId && key.chatModel === requested.model)
    if (specified) {
      return {
        key: specified,
        model: requested.model || specified.chatModel,
      }
    }
  }

  const matching = roleKeys.find(key => key.chatModel === requested.model)
    || allKeys.find(key => key.chatModel === requested.model)
    || roleKeys[0]
    || allKeys[0]

  if (!matching || !isNotEmptyString(matching.key))
    throw new Error('No available API key for memory refresh')

  return {
    key: matching,
    model: requested.model || matching.chatModel,
  }
}

function parseChatModel(chatModel: string): { model: string, keyId?: string } {
  const [model, keyId] = String(chatModel || '').split('|')
  return {
    model: model || '',
    keyId,
  }
}

async function resolveTargetRoom(sessionId?: string | null, userId?: string): Promise<ChatRoom | null> {
  const target = String(sessionId || '').trim()
  if (target) {
    const roomId = Number(target)
    if (!Number.isFinite(roomId))
      return null
    if (userId)
      return await getChatRoom(userId, roomId)
    return { roomId, title: 'chat' } as ChatRoom
  }

  if (!userId)
    return null

  const rooms = await getChatRooms(userId)
  let latestRoom: ChatRoom | null = null
  let latestTime = 0
  for (const room of rooms) {
    const chats = await getChats(room.roomId)
    const lastChat = chats[chats.length - 1]
    if (lastChat && lastChat.dateTime > latestTime) {
      latestRoom = room
      latestTime = lastChat.dateTime
    }
  }
  return latestRoom
}

function buildConversationMessages(chats: ChatInfo[]): Array<{ role: 'user' | 'assistant', content: string }> {
  const messages: Array<{ role: 'user' | 'assistant', content: string }> = []
  for (const chat of chats) {
    if (chat.status !== Status.Deleted && chat.status !== Status.InversionDeleted && chat.prompt?.trim()) {
      messages.push({
        role: 'user',
        content: chat.prompt.trim(),
      })
    }
    if (chat.status !== Status.Deleted && chat.status !== Status.ResponseDeleted && chat.response?.trim()) {
      messages.push({
        role: 'assistant',
        content: chat.response.trim(),
      })
    }
  }
  return messages
}

let memoryService: MemoryService | null = null

export function getMemoryService(): MemoryService {
  if (!memoryService)
    memoryService = new MemoryService()
  return memoryService
}
