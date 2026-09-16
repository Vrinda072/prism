from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.schemas.responses import SemanticResponse
from app.services import embedding_service, image_service, semantic_service
from app.utils.validation import validate_image_upload

router = APIRouter()


@router.post("/semantic", response_model=SemanticResponse)
async def semantic(request: Request, file: UploadFile = File(...)):
    contents = await file.read()
    validate_image_upload(file.content_type, contents)

    try:
        image = image_service.load_image(contents)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Could not read this image. Please upload a valid PNG, JPG, JPEG, or WEBP file.",
        )

    model_service = request.app.state.model_service
    concept_embeddings = request.app.state.concept_embeddings

    embedding = embedding_service.get_embedding(model_service, image)
    result = semantic_service.semantic_scores(model_service, embedding, concept_embeddings)

    return SemanticResponse(**result)
