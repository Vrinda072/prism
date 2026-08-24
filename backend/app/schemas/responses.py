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

