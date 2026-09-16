from fastapi import APIRouter, HTTPException

from app.schemas.requests import ProjectRequest
from app.schemas.responses import ProjectResponse
from app.services.projection_service import project_to_2d

router = APIRouter()


@router.post("/project", response_model=ProjectResponse)
async def project(payload: ProjectRequest):
    try:
        points = project_to_2d(payload.embeddings)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ProjectResponse(points=points)
