from pydantic import BaseModel


class ProjectRequest(BaseModel):
    embeddings: list[list[float]]
