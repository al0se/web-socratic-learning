import type { MemoryFile } from './index'
import Router from 'express'
import { auth } from '../middleware/auth'
import { existsChatRoom, getUserById } from '../storage/mongo'
import { getMemoryService, MEMORY_FILES } from './index'

interface FileUpdateRequest {
  file: MemoryFile
  content?: string
}

interface MemoryRefreshRequest {
  session_id?: string
  roomId?: number
  language?: string
}

interface MemoryClearRequest {
  file?: MemoryFile
}

export const router = Router()

router.get('/memory', auth, async (_req, res) => {
  try {
    res.send({
      status: 'Success',
      message: null,
      data: getMemoryService().readSnapshot(),
    })
  }
  catch (error) {
    res.send({
      status: 'Fail',
      message: error instanceof Error ? error.message : 'Load memory error',
      data: null,
    })
  }
})

async function updateMemory(req, res) {
  try {
    const payload = req.body as FileUpdateRequest
    if (!isMemoryFile(payload.file)) {
      res.send({
        status: 'Fail',
        message: `Invalid file: ${payload.file}`,
        data: null,
      })
      return
    }

    const snapshot = getMemoryService().writeFile(payload.file, payload.content || '')
    res.send({
      status: 'Success',
      message: null,
      data: {
        ...snapshot,
        saved: true,
      },
    })
  }
  catch (error) {
    res.send({
      status: 'Fail',
      message: error instanceof Error ? error.message : 'Save memory error',
      data: null,
    })
  }
}

router.put('/memory', auth, updateMemory)
router.post('/memory', auth, updateMemory)

router.post('/memory/refresh', auth, async (req, res) => {
  try {
    const userId = req.headers.userId as string
    const payload = req.body as MemoryRefreshRequest
    const sessionId = String(payload.session_id || payload.roomId || '').trim()

    if (sessionId) {
      const roomId = Number(sessionId)
      if (!Number.isFinite(roomId) || !await existsChatRoom(userId, roomId)) {
        res.send({
          status: 'Fail',
          message: 'Session not found',
          data: null,
        })
        return
      }
    }

    const user = await getUserById(userId)
    const result = await getMemoryService().refreshFromSession(sessionId || null, {
      language: payload.language || 'en',
      user,
      userId,
    })
    const snapshot = getMemoryService().readSnapshot()

    res.send({
      status: 'Success',
      message: null,
      data: {
        ...snapshot,
        changed: result.changed,
      },
    })
  }
  catch (error) {
    res.send({
      status: 'Fail',
      message: error instanceof Error ? error.message : 'Refresh memory error',
      data: null,
    })
  }
})

router.post('/memory/clear', auth, async (req, res) => {
  try {
    const payload = req.body as MemoryClearRequest | undefined
    if (payload?.file && !isMemoryFile(payload.file)) {
      res.send({
        status: 'Fail',
        message: `Invalid file: ${payload.file}`,
        data: null,
      })
      return
    }

    const snapshot = payload?.file
      ? getMemoryService().clearFile(payload.file)
      : getMemoryService().clearMemory()

    res.send({
      status: 'Success',
      message: null,
      data: {
        ...snapshot,
        cleared: true,
      },
    })
  }
  catch (error) {
    res.send({
      status: 'Fail',
      message: error instanceof Error ? error.message : 'Clear memory error',
      data: null,
    })
  }
})

function isMemoryFile(file: unknown): file is MemoryFile {
  return MEMORY_FILES.includes(file as MemoryFile)
}
