import torch
from transformers import CLIPModel, CLIPProcessor

MODEL_NAME = "openai/clip-vit-base-patch32"


def resolve_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


class ModelService:
    """Holds one CLIP model instance in memory, loaded once at app startup."""

    def __init__(self) -> None:
        self.model_name = MODEL_NAME
        self.device = resolve_device()
        self.model: CLIPModel | None = None
        self.processor: CLIPProcessor | None = None

    def load(self) -> None:
        self.processor = CLIPProcessor.from_pretrained(MODEL_NAME)
        self.model = CLIPModel.from_pretrained(MODEL_NAME).to(self.device)
        self.model.eval()

    @property
    def is_ready(self) -> bool:
        return self.model is not None and self.processor is not None

