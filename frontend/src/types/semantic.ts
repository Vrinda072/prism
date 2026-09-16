export interface ConceptScore {
  concept: string
  score: number
}

export interface SemanticState {
  concepts: ConceptScore[]
  topConcept: string
  confidence: number
  entropy: number
}
