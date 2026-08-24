from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import analyze
from app.services.model_service import ModelService


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_service = ModelService()
    model_service.load()
    app.state.model_service = model_service
    yield


app = FastAPI(title="PRISM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)


@app.get("/health")
def health(request: Request):
    model_service = request.app.state.model_service
    return {
        "status": "ok",
        "model": model_service.model_name,
        "model_ready": model_service.is_ready,
        "device": model_service.device,
    }
