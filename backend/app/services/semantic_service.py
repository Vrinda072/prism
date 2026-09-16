import math

import torch
from PIL import Image

from app.services.model_service import ModelService

# A small, fixed, deliberately generic set of concepts — broad enough to say
# something about an arbitrary uploaded image, not just the flower samples.
# Not user-editable: keeping this small and fixed is what keeps the
# resulting scores honest rather than an open-ended classifier.
CONCEPTS = ["flower", "animal", "vehicle", "person", "building", "food"]
PROMPT_TEMPLATE = "a photo of a {}"


@torch.no_grad()
def get_text_embedding(model_service: ModelService, text: str) -> torch.Tensor:
    """Run one text prompt through CLIP and return its L2-normalized 512-d embedding."""
    inputs = model_service.processor(text=[text], return_tensors="pt", padding=True).to(model_service.device)
    features = model_service.model.get_text_features(**inputs).pooler_output
    return torch.nn.functional.normalize(features, dim=-1).squeeze(0)


@torch.no_grad()
def build_concept_embeddings(model_service: ModelService) -> torch.Tensor:
    """Precompute and stack the fixed concept set's text embeddings once at startup."""
    embeddings = [get_text_embedding(model_service, PROMPT_TEMPLATE.format(c)) for c in CONCEPTS]
    return torch.stack(embeddings)


@torch.no_grad()
def semantic_scores(
    model_service: ModelService,
    image_embedding: torch.Tensor,
    concept_embeddings: torch.Tensor,
) -> dict:
    """CLIP's standard zero-shot classification formula: scaled cosine similarities,
    softmax'd into a real probability distribution over the fixed concept set.

    Confidence and entropy are both derived directly from that distribution —
    entropy is normalized to 0-1 (0 = fully confident on one concept, 1 =
    uniform/maximally confused) so it reads the same regardless of how many
    concepts are in play.
    """
    logit_scale = model_service.model.logit_scale.exp()
    logits = logit_scale * concept_embeddings @ image_embedding
    probs = torch.nn.functional.softmax(logits, dim=0)

    scored = sorted(
        ({"concept": c, "score": round(p.item(), 4)} for c, p in zip(CONCEPTS, probs)),
        key=lambda entry: entry["score"],
        reverse=True,
    )

    entropy_nats = -torch.sum(probs * torch.log(probs.clamp_min(1e-12))).item()
    max_entropy_nats = math.log(len(CONCEPTS))

    return {
        "concepts": scored,
        "top_concept": scored[0]["concept"],
        "confidence": scored[0]["score"],
        "entropy": round(entropy_nats / max_entropy_nats, 4),
    }
