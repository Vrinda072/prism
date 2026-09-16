import numpy as np


def project_to_2d(embeddings: list[list[float]]) -> list[list[float]]:
    """Project a set of embeddings into 2D via PCA (mean-center + SVD).

    The sign of each principal component is stabilized (flipped so its
    largest-magnitude loading is positive). numpy.linalg.svd gives no sign
    guarantee on its singular vectors, so without this, two calls on nearly
    identical data could return components pointing in opposite directions —
    the entire trajectory scatter would spuriously mirror-flip between one
    request and the next, which reads as broken, not as real embedding
    movement.
    """
    if not embeddings:
        raise ValueError("embeddings must be a non-empty list")

    lengths = {len(e) for e in embeddings}
    if len(lengths) != 1:
        raise ValueError("all embeddings must have the same length")

    matrix = np.array(embeddings, dtype=np.float64)

    if matrix.shape[0] == 1:
        return [[0.0, 0.0]]

    centered = matrix - matrix.mean(axis=0)

    # Economy SVD: for an (N, 512) matrix with N << 512, this is the same
    # top components as full SVD, computed far more cheaply.
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    components = vt[:2].copy()

    for i in range(components.shape[0]):
        dominant_index = np.argmax(np.abs(components[i]))
        if components[i, dominant_index] < 0:
            components[i] *= -1

    projected = centered @ components.T
    return projected.tolist()
