import { createContext, ReactNode, useCallback, useContext, useReducer, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import localforage from 'localforage'
import { GameSession, GameState, GameStats, Question } from '../types'
import { sampleQuestions } from '../utils/sampleData'

// Initialer GameStats-Zustand
const initialStats: GameStats = {
    totalGames: 0,
    wins: 0,
    losses: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    categories: {},
    difficulty: {
        easy: { total: 0, correct: 0 },
        medium: { total: 0, correct: 0 },
        hard: { total: 0, correct: 0 },
    },
    history: [],
}

// Initialer Spielzustand
const initialState: GameState = {
    stats: initialStats,
    currentSession: null,
    questions: sampleQuestions, // Load sample questions immediately
    currentQuestionIndex: 0,
    gameMode: 'solo',
    gameStatus: 'idle',
    timePerQuestion: 20, // Sekunden pro Frage
    multiplayer: {
        connected: false,
        roomId: null,
        opponentName: null,
        opponentScore: 0,
    },
}

// Action-Typen
type GameAction =
    | { type: 'INIT_GAME_STATE'; payload: Partial<GameState> }
    | { type: 'START_GAME'; payload: { mode: 'solo' | 'multiplayer'; questions: Question[] } }
    | { type: 'ANSWER_QUESTION'; payload: { answer: number } } // questionId Parameter entfernt
    | { type: 'NEXT_QUESTION' }
    | { type: 'END_GAME'; payload: { result: 'win' | 'loss' | 'draw' } }
    | { type: 'RESET_GAME' }
    | {
    type: 'SET_MULTIPLAYER_STATUS';
    payload: { connected: boolean; roomId?: string; opponentName?: string }
}
    | { type: 'UPDATE_OPPONENT_SCORE'; payload: number }
    | { type: 'IMPORT_GAME_STATS'; payload: GameStats }

// Reducer-Funktion
function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'INIT_GAME_STATE':
            return {
                ...state,
                ...action.payload,
                questions: action.payload.questions || sampleQuestions, // Ensure questions are loaded
            }

        case 'START_GAME':
            const newSession: GameSession = {
                id: uuidv4(),
                date: new Date().toISOString(),
                mode: action.payload.mode,
                result: 'draw', // Wird am Ende aktualisiert
                score: 0,
                totalQuestions: action.payload.questions.length,
                correctAnswers: 0,
            }

            return {
                ...state,
                currentSession: newSession,
                questions: action.payload.questions,
                currentQuestionIndex: 0,
                gameMode: action.payload.mode,
                gameStatus: 'playing',
                multiplayer: {
                    ...state.multiplayer,
                    opponentScore: 0,
                },
            }

        case 'ANSWER_QUESTION': {
            const { answer } = action.payload

            // Prüfe, ob es gültige Fragen gibt
            if (state.questions.length === 0 || state.currentQuestionIndex >= state.questions.length) {
                console.error('Keine gültige Frage zum Beantworten vorhanden')
                return state
            }

            const currentQuestion = state.questions[state.currentQuestionIndex]

            // Prüfen, ob die Antwort korrekt ist
            const isCorrect = currentQuestion.correctAnswer === answer

            // Session aktualisieren
            const updatedSession = state.currentSession
                ? {
                    ...state.currentSession,
                    score: state.currentSession.score + (isCorrect ? 1 : 0),
                    correctAnswers: state.currentSession.correctAnswers + (isCorrect ? 1 : 0),
                }
                : null

            // Statistiken aktualisieren
            const category = currentQuestion.category
            const difficulty = currentQuestion.difficulty

            const updatedCategories = { ...state.stats.categories }
            if (!updatedCategories[category]) {
                updatedCategories[category] = { total: 0, correct: 0 }
            }
            updatedCategories[category].total += 1
            if (isCorrect) updatedCategories[category].correct += 1

            const updatedDifficulty = { ...state.stats.difficulty }
            updatedDifficulty[difficulty].total += 1
            if (isCorrect) updatedDifficulty[difficulty].correct += 1

            return {
                ...state,
                currentSession: updatedSession,
                stats: {
                    ...state.stats,
                    totalQuestions: state.stats.totalQuestions + 1,
                    correctAnswers: state.stats.correctAnswers + (isCorrect ? 1 : 0),
                    incorrectAnswers: state.stats.incorrectAnswers + (isCorrect ? 0 : 1),
                    categories: updatedCategories,
                    difficulty: updatedDifficulty,
                },
            }
        }

        case 'NEXT_QUESTION':
            return {
                ...state,
                currentQuestionIndex: state.currentQuestionIndex + 1,
            }

        case 'END_GAME': {
            const { result } = action.payload

            // Session finalisieren
            const finalSession = state.currentSession
                ? {
                    ...state.currentSession,
                    result,
                }
                : null

            // Spielhistorie aktualisieren
            const updatedHistory = finalSession
                ? [...state.stats.history, finalSession]
                : state.stats.history

            return {
                ...state,
                gameStatus: 'finished',
                currentSession: finalSession,
                stats: {
                    ...state.stats,
                    totalGames: state.stats.totalGames + 1,
                    wins: state.stats.wins + (result === 'win' ? 1 : 0),
                    losses: state.stats.losses + (result === 'loss' ? 1 : 0),
                    history: updatedHistory,
                },
            }
        }

        case 'RESET_GAME':
            return {
                ...state,
                currentSession: null,
                currentQuestionIndex: 0,
                gameStatus: 'idle',
                multiplayer: {
                    ...state.multiplayer,
                    opponentScore: 0,
                },
                // Keep the questions array intact
                questions: state.questions.length > 0 ? state.questions : sampleQuestions,
            }

        case 'SET_MULTIPLAYER_STATUS':
            return {
                ...state,
                multiplayer: {
                    ...state.multiplayer,
                    connected: action.payload.connected,
                    roomId: action.payload.roomId || state.multiplayer.roomId,
                    opponentName: action.payload.opponentName || state.multiplayer.opponentName,
                },
            }

        case 'UPDATE_OPPONENT_SCORE':
            return {
                ...state,
                multiplayer: {
                    ...state.multiplayer,
                    opponentScore: action.payload,
                },
            }

        case 'IMPORT_GAME_STATS':
            return {
                ...state,
                stats: action.payload,
            }

        default:
            return state
    }
}

// Erstellen des Kontexts
interface GameContextType {
    state: GameState
    initGameState: () => Promise<void>
    startGame: (mode: 'solo' | 'multiplayer', questions?: Question[]) => void
    answerQuestion: (answer: number) => void // questionId Parameter entfernt
    nextQuestion: () => void
    endGame: (result: 'win' | 'loss' | 'draw') => void
    resetGame: () => void
    setMultiplayerStatus: (status: {
        connected: boolean;
        roomId?: string;
        opponentName?: string
    }) => void
    updateOpponentScore: (score: number) => void
    exportGameStats: () => Promise<string>
    importGameStats: (data: string) => Promise<boolean>
}

const GameContext = createContext<GameContextType | undefined>(undefined)

// Provider-Komponente
export const GameProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(gameReducer, initialState)

    // Ensure sample questions are available on initial load
    useEffect(() => {
        if (state.questions.length === 0) {
            dispatch({
                type: 'INIT_GAME_STATE',
                payload: { questions: sampleQuestions }
            });
        }
    }, []);

    // Spielstand initialisieren
    const initGameState = useCallback(async () => {
        try {
            // Versuche, gespeicherte Statistiken aus dem LocalStorage zu laden
            const savedStats = await localforage.getItem<GameStats>('brainbuster_stats')

            dispatch({
                type: 'INIT_GAME_STATE',
                payload: {
                    stats: savedStats || initialStats,
                    questions: sampleQuestions // Always ensure questions are loaded
                }
            });
        } catch (error) {
            console.error('Fehler beim Laden der Spielstatistiken:', error)
            // Still ensure questions are loaded even if there's an error
            dispatch({
                type: 'INIT_GAME_STATE',
                payload: { questions: sampleQuestions }
            });
        }
    }, [])

    // Spiel starten
    const startGame = useCallback((mode: 'solo' | 'multiplayer', questions?: Question[]) => {
        // Wenn keine Fragen übergeben werden, Beispielfragen verwenden
        const gameQuestions = questions && questions.length > 0 ? questions : sampleQuestions

        console.log("Starting game with questions:", gameQuestions.length);

        dispatch({
            type: 'START_GAME',
            payload: { mode, questions: gameQuestions },
        })
    }, [])

    // Frage beantworten (questionId Parameter entfernt)
    const answerQuestion = useCallback((answer: number) => {
        dispatch({
            type: 'ANSWER_QUESTION',
            payload: { answer },
        })

        // Statistiken speichern
        localforage.setItem('brainbuster_stats', state.stats).catch((error) => {
            console.error('Fehler beim Speichern der Spielstatistiken:', error)
        })
    }, [state.stats])

    // Zur nächsten Frage wechseln
    const nextQuestion = useCallback(() => {
        dispatch({ type: 'NEXT_QUESTION' })
    }, [])

    // Spiel beenden
    const endGame = useCallback((result: 'win' | 'loss' | 'draw') => {
        dispatch({
            type: 'END_GAME',
            payload: { result },
        })

        // Aktualisierte Statistiken speichern
        setTimeout(() => {
            localforage.setItem('brainbuster_stats', {
                ...state.stats,
                totalGames: state.stats.totalGames + 1,
                wins: state.stats.wins + (result === 'win' ? 1 : 0),
                losses: state.stats.losses + (result === 'loss' ? 1 : 0),
                history: state.currentSession
                    ? [...state.stats.history, { ...state.currentSession, result }]
                    : state.stats.history,
            }).catch((error) => {
                console.error('Fehler beim Speichern der Spielstatistiken:', error)
            })
        }, 0)
    }, [state.stats, state.currentSession])

    // Spiel zurücksetzen
    const resetGame = useCallback(() => {
        dispatch({ type: 'RESET_GAME' })
    }, [])

    // Multiplayer-Status setzen
    const setMultiplayerStatus = useCallback((status: {
        connected: boolean;
        roomId?: string;
        opponentName?: string
    }) => {
        dispatch({
            type: 'SET_MULTIPLAYER_STATUS',
            payload: status,
        })
    }, [])

    // Punktestand des Gegners aktualisieren
    const updateOpponentScore = useCallback((score: number) => {
        dispatch({
            type: 'UPDATE_OPPONENT_SCORE',
            payload: score,
        })
    }, [])

    // Spielstatistiken exportieren
    const exportGameStats = useCallback(async (): Promise<string> => {
        return JSON.stringify(state.stats)
    }, [state.stats])

    // Spielstatistiken importieren
    const importGameStats = useCallback(async (data: string): Promise<boolean> => {
        try {
            const parsedStats = JSON.parse(data) as GameStats

            // Validiere die importierten Daten
            if (
                typeof parsedStats.totalGames !== 'number' ||
                typeof parsedStats.wins !== 'number' ||
                typeof parsedStats.losses !== 'number' ||
                !Array.isArray(parsedStats.history)
            ) {
                throw new Error('Ungültiges Datenformat')
            }

            dispatch({
                type: 'IMPORT_GAME_STATS',
                payload: parsedStats,
            })

            // Speichere die importierten Statistiken
            await localforage.setItem('brainbuster_stats', parsedStats)

            return true
        } catch (error) {
            console.error('Fehler beim Importieren der Spielstatistiken:', error)
            return false
        }
    }, [])

    // Werte für den Kontext
    const value = {
        state,
        initGameState,
        startGame,
        answerQuestion,
        nextQuestion,
        endGame,
        resetGame,
        setMultiplayerStatus,
        updateOpponentScore,
        exportGameStats,
        importGameStats,
    }

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// Hook für den einfachen Zugriff auf den Kontext
export const useGame = () => {
    const context = useContext(GameContext)

    if (context === undefined) {
        throw new Error('useGame muss innerhalb eines GameProviders verwendet werden')
    }

    return context
}