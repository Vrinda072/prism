import io

from PIL import Image


def load_image(file_bytes: bytes) -> Image.Image:
    """Decode uploaded bytes into a PIL image, always normalized to RGB.

    PIL can fail in several ways on malformed input (unrecognized format,
    truncated data, bad headers) — any of these means "not a usable image",
    so they're all normalized into a single ValueError for the API layer.
    """
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.load()
    except Exception as exc:
        raise ValueError("Unrecognized or corrupted image") from exc
    return image.convert("RGB")


# Blur, noise, brightness, rotation, and compression transforms are added in Step 11.
