export type QuizQuestionType = 'choice' | 'written'
export type QuizDifficulty = 'auto' | 'easy' | 'medium' | 'hard'

export interface QuizConfig {
  mode: 'custom'
  num_questions: number
  difficulty: QuizDifficulty
  question_type: 'auto' | QuizQuestionType
}

export interface QuizQuestion {
  question_id: string
  question: string
  question_type: QuizQuestionType
  options?: Record<string, string>
  correct_answer: string
  explanation: string
  difficulty?: string
  concentration?: string
  knowledge_context?: string
}

export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  mode: 'custom',
  num_questions: 3,
  difficulty: 'auto',
  question_type: 'auto',
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

export function summarizeQuizConfig(config: QuizConfig, translate: (key: string) => string) {
  return [
    translate('chat.quiz.custom'),
    `${config.num_questions} ${translate('chat.quiz.questions')}`,
    translate(`chat.quiz.${config.difficulty}`),
    translate(`chat.quiz.${config.question_type}`),
  ].join(' · ')
}

function normalizeQuestionType(value: unknown): QuizQuestionType {
  const type = String(value || '').toLowerCase()
  if (type === 'choice' || type === 'multiple_choice')
    return 'choice'
  return 'written'
}

function normalizeOptions(value: unknown): Record<string, string> | undefined {
  if (!value)
    return undefined

  if (Array.isArray(value)) {
    const entries = value
      .map((item, index) => [String.fromCharCode(65 + index), String(item)] as const)
      .filter(([, text]) => text.trim())
    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, text]) => [key.toUpperCase(), String(text)] as const)
      .filter(([, text]) => text.trim())
    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }

  return undefined
}

function normalizeQuestion(item: Record<string, unknown>, index: number): QuizQuestion | null {
  const qa = ((item.qa_pair ?? item) || {}) as Record<string, unknown>
  const question = String(qa.question ?? '').trim()
  if (!question)
    return null

  return {
    question_id: String(qa.question_id ?? `q_${index + 1}`),
    question,
    question_type: normalizeQuestionType(qa.question_type),
    options: normalizeOptions(qa.options),
    correct_answer: String(qa.correct_answer ?? '').trim(),
    explanation: String(qa.explanation ?? '').trim(),
    difficulty: qa.difficulty ? String(qa.difficulty) : undefined,
    concentration: qa.concentration ? String(qa.concentration) : undefined,
    knowledge_context:
      qa.metadata && typeof qa.metadata === 'object' && 'knowledge_context' in qa.metadata
        ? String((qa.metadata as Record<string, unknown>).knowledge_context ?? '')
        : undefined,
  }
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value)
  }
  catch {
    return null
  }
}

function collectJsonCandidates(text: string) {
  const candidates = [text.trim()]

  const fenceParts = text.split('```')
  for (let index = 1; index < fenceParts.length; index += 2) {
    const rawBlock = fenceParts[index].trim()
    const block = rawBlock.toLowerCase().startsWith('json')
      ? rawBlock.slice(4).trim()
      : rawBlock
    if (block)
      candidates.push(block)
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace)
    candidates.push(text.slice(firstBrace, lastBrace + 1))

  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket >= 0 && lastBracket > firstBracket)
    candidates.push(text.slice(firstBracket, lastBracket + 1))

  return candidates
}

export function extractQuizQuestions(text: string | undefined): QuizQuestion[] | null {
  if (!text)
    return null

  for (const candidate of collectJsonCandidates(text)) {
    const parsed = tryParseJson(candidate)
    if (!parsed)
      continue

    const root = parsed as Record<string, unknown>
    const summary = root.summary as Record<string, unknown> | undefined
    const rawQuestions = Array.isArray(parsed)
      ? parsed as Record<string, unknown>[]
      : Array.isArray(root.questions)
        ? root.questions as Record<string, unknown>[]
        : Array.isArray(summary?.results)
          ? summary.results as Record<string, unknown>[]
          : []

    const questions = rawQuestions
      .map((item, index) => normalizeQuestion(item, index))
      .filter((item): item is QuizQuestion => item !== null)

    if (questions.length > 0)
      return questions
  }

  return null
}

export function quizTypeLabel(type: string, translate: (key: string) => string) {
  const normalized = normalizeQuestionType(type)
  return translate(`chat.quiz.${normalized}`) || titleCase(normalized)
}
