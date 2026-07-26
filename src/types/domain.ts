export interface Exercise {
  id: string
  name: string
  category: 'push' | 'pull' | 'legs' | 'core'
  cue: string
  isBodyweight: boolean
}

export interface LastPerformance {
  weight: number
  reps: number
}

export interface LoggedSet {
  id: string
  exerciseId: string
  weight: number
  reps: number
  isPr: boolean
}

export interface WorkoutExercise {
  exercise: Exercise
  targetSets: number
  lastPerformance: LastPerformance | null
}

export interface SessionQuest {
  id: string
  title: string
  isComplete: boolean
}
