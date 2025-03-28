export interface Question {
    id: string
    question: string
    options: string[]
    correctAnswer: number
    category: string
    difficulty: 'easy' | 'medium' | 'hard'
}

export interface GameStats {
    totalGames: number
    wins: number
    losses: number
    totalQuestions: number
    correctAnswers: number
    incorrectAnswers: number
    categories: Record<string, {
        total: number
        correct: number
    }>
    difficulty: Record<'easy' | 'medium' | 'hard', {
        total: number
        correct: number
    }>
    history: GameSession[]
}

export interface GameSession {
    id: string
    date: string
    mode: 'solo' | 'multiplayer'
    result: 'win' | 'loss' | 'draw'
    score: number
    totalQuestions: number
    correctAnswers: number
    opponentName?: string
}

export interface GameState {
    stats: GameStats
    currentSession: GameSession | null
    questions: Question[]
    currentQuestionIndex: number
    gameMode: 'solo' | 'multiplayer'
    gameStatus: 'idle' | 'playing' | 'finished'
    timePerQuestion: number
    multiplayer: {
        connected: boolean
        roomId: string | null
        opponentName: string | null
        opponentScore: number
    }
}

export interface MultiplayerMessage {
    type: 'join' | 'answer' | 'next' | 'result' | 'leave'
    roomId?: string
    questionId?: string
    answer?: number
    score?: number
    name?: string
}