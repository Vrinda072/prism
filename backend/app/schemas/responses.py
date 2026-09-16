from pydantic import BaseModel


class AnalyzeResponse(BaseModel):
    embedding: list[float]
    embedding_dimension: int
    model: str
    latency_ms: float


class CompareResponse(BaseModel):
    similarity: float
    drift: float
    latency_ms: float
    embedding_dimension: int
    model: str
    original_embedding: list[float]
    transformed_embedding: list[float]


class ProjectResponse(BaseModel):
    points: list[list[float]]


class ConceptScore(BaseModel):
    concept: str
    score: float


class SemanticResponse(BaseModel):
    concepts: list[ConceptScore]
    top_concept: str
    confidence: float
    entropy: float

