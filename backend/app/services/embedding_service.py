import torch
from PIL import Image

from app.services.model_service import ModelService


@torch.no_grad()
def get_embedding(model_service: ModelService, image: Image.Image) -> torch.Tensor:
    """Run one image through CLIP and return its L2-normalized 512-d embedding."""
    inputs = model_service.processor(images=image, return_tensors="pt").to(model_service.device)
    # get_image_features returns a BaseModelOutputWithPooling in this transformers version;
    # the projected embedding lives in .pooler_output, not the return value itself.
    features = model_service.model.get_image_features(**inputs).pooler_output
    return torch.nn.functional.normalize(features, dim=-1).squeeze(0)


def cosine_similarity(embedding_a: torch.Tensor, embedding_b: torch.Tensor) -> float:
    """Both embeddings are already L2-normalized, so the dot product IS the cosine similarity."""
    similarity = torch.dot(embedding_a, embedding_b).item()
    return max(-1.0, min(1.0, similarity))  # guard against floating-point drift past [-1, 1]
