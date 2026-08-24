import time

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.schemas.responses import AnalyzeResponse, CompareResponse
from app.services import embedding_service, image_service
from app.utils.validation import validate_image_upload

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: Request, file: UploadFile = File(...)):
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

    start = time.perf_counter()
    embedding = embedding_service.get_embedding(model_service, image)
    latency_ms = (time.perf_counter() - start) * 1000

    return AnalyzeResponse(
        embedding=embedding.tolist(),
        embedding_dimension=embedding.shape[0],
        model=model_service.model_name,
        latency_ms=round(latency_ms, 2),
    )


@router.post("/compare", response_model=CompareResponse)
async def compare(
    request: Request,
    original: UploadFile = File(...),
    transformed: UploadFile = File(...),
):
    original_bytes = await original.read()
    transformed_bytes = await transformed.read()
    validate_image_upload(original.content_type, original_bytes)
    validate_image_upload(transformed.content_type, transformed_bytes)

    try:
        original_image = image_service.load_image(original_bytes)
        transformed_image = image_service.load_image(transformed_bytes)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Could not read one of these images. Please upload valid PNG, JPG, JPEG, or WEBP files.",
        )

    model_service = request.app.state.model_service

    start = time.perf_counter()
    original_embedding = embedding_service.get_embedding(model_service, original_image)
    transformed_embedding = embedding_service.get_embedding(model_service, transformed_image)
    similarity = embedding_service.cosine_similarity(original_embedding, transformed_embedding)
    latency_ms = (time.perf_counter() - start) * 1000

    return CompareResponse(
        similarity=round(similarity, 4),
        drift=round(1 - similarity, 4),
        latency_ms=round(latency_ms, 2),
        embedding_dimension=original_embedding.shape[0],
        model=model_service.model_name,
    )
