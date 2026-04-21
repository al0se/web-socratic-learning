import type { KnowledgeGraphConfig, KnowledgeGraphStatus, SearchResult } from './storage/model'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import * as process from 'node:process'
import { fileURLToPath } from 'node:url'
import { KnowledgeGraphQueryMode } from './storage/model'
import { isNotEmptyString } from './utils/is'

interface LightRAGScriptResponse {
  status: string
  message?: string
  prompt?: string
  data?: {
    entities?: Array<{ entity_name?: string, description?: string, file_path?: string }>
    relationships?: Array<{ src_id?: string, tgt_id?: string, description?: string, file_path?: string }>
    chunks?: Array<{ content?: string, file_path?: string }>
  }
  metadata?: Record<string, any>
}

export interface KnowledgeGraphQueryOutput {
  status: KnowledgeGraphStatus
  message?: string
  prompt: string
  results: SearchResult[]
  usageTime: number
  metadata?: Record<string, any>
}

export function normalizeKnowledgeGraphQuery(query: string, maxLength = 1000) {
  let normalized = query.replace(/\s+/g, ' ').trim()
  if (normalized.length > maxLength)
    normalized = normalized.slice(0, maxLength).trim()
  return normalized
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  const finalValue = value ?? fallback
  return Math.min(Math.max(finalValue, min), max)
}

function buildKnowledgeGraphResults(data: LightRAGScriptResponse['data'], maxResults: number): SearchResult[] {
  if (!data)
    return []

  const results: SearchResult[] = []

  for (const chunk of data.chunks || []) {
    if (results.length >= maxResults)
      break
    results.push({
      title: chunk.file_path || `Chunk ${results.length + 1}`,
      url: '',
      content: chunk.content || '',
    })
  }

  for (const entity of data.entities || []) {
    if (results.length >= maxResults)
      break
    results.push({
      title: entity.entity_name ? `Entity: ${entity.entity_name}` : `Entity ${results.length + 1}`,
      url: '',
      content: entity.description || entity.file_path || '',
    })
  }

  for (const relation of data.relationships || []) {
    if (results.length >= maxResults)
      break
    const title = relation.src_id && relation.tgt_id
      ? `Relation: ${relation.src_id} -> ${relation.tgt_id}`
      : `Relation ${results.length + 1}`
    results.push({
      title,
      url: '',
      content: relation.description || relation.file_path || '',
    })
  }

  return results.filter(result => isNotEmptyString(result.content))
}

function isNoContextResponse(response: LightRAGScriptResponse, prompt: string, results: SearchResult[]) {
  if (prompt.includes('[no-context]'))
    return true

  return !isNotEmptyString(response.message) && !isNotEmptyString(prompt) && results.length === 0
}

function getKnowledgeGraphProjectRoot(currentDirPath: string) {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(currentDirPath, '..'),
    path.resolve(currentDirPath, '..', '..'),
    path.resolve(currentDirPath, '..', '..', '..'),
  ]

  return candidates.find(candidate => existsSync(path.resolve(candidate, 'knowledge-graph')))
    ?? process.cwd()
}

function resolveKnowledgeGraphPath(projectRoot: string, value: string | undefined, fallback: string) {
  const finalValue = value || fallback
  return path.isAbsolute(finalValue) ? finalValue : path.resolve(projectRoot, finalValue)
}

function resolvePythonCommand(projectRoot: string, value: string | undefined, fallback: string) {
  const finalValue = value || fallback
  if (path.isAbsolute(finalValue))
    return finalValue

  // Relative script paths should resolve from the project root, but bare commands
  // like "python" / "python3" should still use the system PATH.
  if (finalValue.includes('/') || finalValue.includes('\\'))
    return path.resolve(projectRoot, finalValue)

  return finalValue
}

export async function runKnowledgeGraphQuery(query: string, knowledgeGraphConfig: KnowledgeGraphConfig): Promise<KnowledgeGraphQueryOutput> {
  const options = knowledgeGraphConfig.options || {}
  const currentFilePath = fileURLToPath(import.meta.url)
  const currentDirPath = path.dirname(currentFilePath)
  const projectRoot = getKnowledgeGraphProjectRoot(currentDirPath)
  const repoDir = resolveKnowledgeGraphPath(projectRoot, options.repoDir, 'knowledge-graph/LightRAG')
  const pythonPath = resolvePythonCommand(projectRoot, options.pythonPath, process.platform === 'win32' ? 'python' : 'python3')
  const workingDir = resolveKnowledgeGraphPath(projectRoot, options.workingDir, 'knowledge-graph/lesson_kb')
  const scriptPath = path.resolve(currentDirPath, '../scripts/lightrag_query.py')
  const timeoutMs = clampNumber(options.timeoutMs, 120000, 1000, 300000)
  const maxResults = clampNumber(options.maxResults, 10, 1, 20)

  const payload = JSON.stringify({
    repoDir,
    workingDir,
    workspace: options.workspace || '',
    query,
    mode: options.queryMode || KnowledgeGraphQueryMode.Mix,
    topK: clampNumber(options.topK, 10, 1, 100),
    chunkTopK: clampNumber(options.chunkTopK, 10, 1, 100),
    maxEntityTokens: clampNumber(options.maxEntityTokens, 6000, 100, 50000),
    maxRelationTokens: clampNumber(options.maxRelationTokens, 8000, 100, 50000),
    maxTotalTokens: clampNumber(options.maxTotalTokens, 30000, 1000, 100000),
    enableRerank: options.enableRerank !== false,
  })

  const start = Date.now()

  const response = await new Promise<LightRAGScriptResponse>((resolve, reject) => {
    const child = spawn(pythonPath, [scriptPath], {
      cwd: repoDir,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const finish = (handler: () => void) => {
      if (settled)
        return
      settled = true
      handler()
    }

    const timer = setTimeout(() => {
      child.kill()
      finish(() => reject(new Error(`LightRAG query timed out after ${timeoutMs}ms`)))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      finish(() => reject(error))
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      finish(() => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || `LightRAG process exited with code ${code}`))
        }
        else {
          try {
            resolve(JSON.parse(stdout.trim()))
          }
          catch (error) {
            reject(new Error(`Failed to parse LightRAG output: ${(error as Error).message}\n${stderr.trim()}`.trim()))
          }
        }
      })
    })

    child.stdin.write(payload)
    child.stdin.end()
  })

  const prompt = response.prompt || ''
  const results = buildKnowledgeGraphResults(response.data, maxResults)
  const usageTime = (Date.now() - start) / 1000

  if (response.status !== 'success') {
    if (isNoContextResponse(response, prompt, results)) {
      return {
        status: 'miss',
        message: '',
        prompt: '',
        results: [],
        usageTime,
        metadata: response.metadata,
      }
    }

    throw new Error(response.message || 'LightRAG query failed')
  }

  if (isNoContextResponse(response, prompt, results)) {
    return {
      status: 'miss',
      message: '',
      prompt: '',
      results: [],
      usageTime,
      metadata: response.metadata,
    }
  }

  return {
    status: 'hit',
    message: results.length > 0 ? '' : 'LightRAG retrieved context, but there are no displayable knowledge graph items.',
    prompt,
    results,
    usageTime,
    metadata: response.metadata,
  }
}
