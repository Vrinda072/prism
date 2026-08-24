const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export class ApiError extends Error {}

export interface HealthResponse {
  status: string
  model: string
  model_ready: boolean
  device: string
}

export interface CompareResponse {
  similarity: number
  drift: number
  latency_ms: number
  embedding_dimension: number
  model: string
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.detail === "string") return body.detail
  } catch {
    // response wasn't JSON — fall through to the generic message
  }
  return "Something went wrong talking to the server. Please try again."
}

export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal })
  if (!response.ok) throw new ApiError(await parseErrorMessage(response))
  return response.json()
}

export async function compareImages(
  original: Blob,
  transformed: Blob,
  signal?: AbortSignal,
): Promise<CompareResponse> {
  const formData = new FormData()
  formData.append("original", original, "original")
  formData.append("transformed", transformed, "transformed")

  const response = await fetch(`${API_BASE_URL}/compare`, {
    method: "POST",
    body: formData,
    signal,
  })
  if (!response.ok) throw new ApiError(await parseErrorMessage(response))
  return response.json()
}
