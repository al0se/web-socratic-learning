import type { JwtPayload } from 'jsonwebtoken'

export interface ImageGenerationTool {
  type: 'image_generation'
  input_fidelity?: 'low' | 'medium' | 'high'
  quality?: 'low' | 'medium' | 'high'
  model?: 'gpt-image-1' | 'gpt-image-1.5'
}

export interface RequestProps {
  roomId: number
  uuid: number
  regenerate: boolean
  prompt: string
  uploadFileKeys?: string[]
  options?: ChatContext
  tools?: ImageGenerationTool[]
  previousResponseId?: string
  clientMode?: 'chat' | 'quiz'
  quizConfig?: QuizConfig
}

export interface ChatContext {
  conversationId?: string
  parentMessageId?: string
}

export interface QuizConfig {
  mode: 'custom'
  num_questions: number
  difficulty: 'auto' | 'easy' | 'medium' | 'hard'
  question_type: 'auto' | 'choice' | 'written' | 'coding'
}

export interface AuthJwtPayload extends JwtPayload {
  name: string
  avatar: string
  description: string
  userId: string
  root: boolean
  config: any
}

export class TwoFAConfig {
  enaled: boolean
  userName: string
  secretKey: string
  otpauthUrl: string
  constructor() {
    this.enaled = false
    this.userName = ''
    this.secretKey = ''
    this.otpauthUrl = ''
  }
}
