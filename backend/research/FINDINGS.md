# Fine-vs-coarse-grained corruption robustness

This is a real offline experiment, not a live-compute panel like the rest of PRISM, structured like the
reference CLIP Robustness Study's own scripts, but asking a question that study never tests. Its label
sets (CIFAR-10, CIFAR-100) are single-level, and its EuroSAT run has no severity sweep at all.

## The question

As corruption severity increases, does CLIP's zero-shot classifier confuse fine-grained distinctions
(breed vs. breed) before it confuses coarse-grained ones (cat vs. dog)? Or does accuracy collapse at
both levels together? And does the answer depend on which corruption is used?

## Setup

- **Model**: CLIP ViT-B/32, the same load path PRISM's live app uses (`ModelService`).
- **Classifiers**: two independent zero-shot classifiers, both using the same 8-template prompt
  ensembling already live in `/semantic`: a 37-way breed classifier and a 2-way cat/dog classifier.
  They are not hierarchically linked. Each is scored against the image independently.
- **Dataset**: a stratified sample of the real [Oxford-IIIT Pet dataset](https://huggingface.co/datasets/timm/oxford-iiit-pet)
  (CC BY-SA 4.0): 20 images per breed across 37 breeds, 740 images total. Streamed directly from the
  Parquet files rather than downloading the full ~790MB dataset, because this machine had limited free
  disk space.
- **Perturbations**: blur and noise, each run independently at PRISM's own 11 fixed severities (0 to
  100%, step 10%), using the same parameterization as the live app's canvas pipeline: Gaussian blur
  (radius equals severity times 20px) and per-pixel Gaussian noise (standard deviation equals severity
  times 45), matching `imageTransform.ts`'s `maxBlurPx` and `maxNoiseStdDev`.
- 16,280 total forward passes (740 images, 11 severities, 2 corruption types), about 6 minutes on this
  machine.

## Results

### Blur

| Severity | Fine accuracy | Coarse accuracy |
|---:|---:|---:|
| 0% | 83.2% | 100.0% |
| 10% | 77.7% | 99.9% |
| 20% | 64.2% | 96.9% |
| 30% | 50.0% | 94.2% |
| 40% | 38.1% | 89.2% |
| 50% | 28.7% | 84.2% |
| 60% | 22.4% | 79.6% |
| 70% | 17.7% | 74.1% |
| 80% | 14.1% | 71.9% |
| 90% | 11.6% | 71.9% |
| 100% | 10.3% | 70.1% |

### Noise

| Severity | Fine accuracy | Coarse accuracy |
|---:|---:|---:|
| 0% | 83.2% | 100.0% |
| 10% | 82.8% | 99.9% |
| 20% | 83.5% | 99.9% |
| 30% | 81.4% | 99.9% |
| 40% | 82.2% | 100.0% |
| 50% | 81.8% | 99.7% |
| 60% | 80.0% | 100.0% |
| 70% | 79.5% | 100.0% |
| 80% | 78.5% | 99.9% |
| 90% | 77.8% | 100.0% |
| 100% | 74.7% | 99.6% |

Full per-image, per-severity rows: [`results/pet_robustness.csv`](results/pet_robustness.csv) (blur),
[`results/pet_robustness_noise.csv`](results/pet_robustness_noise.csv) (noise).

![Blur: accuracy by label granularity, and what the fine-grained errors are](../../docs/figures/blur_results.png)

Left panel: fine accuracy falls sharply from the first severity step; coarse accuracy degrades far more
slowly. The dashed line marks 50% severity, where cross-species errors first exceed 10% of all images.
Right panel: the same run's errors, split into correct, wrong breed but right species, and wrong
species. Below 50% severity almost every error is a within-species confusion.

![Noise: accuracy by label granularity, and what the fine-grained errors are](../../docs/figures/noise_results.png)

Coarse accuracy stays at or near 100% across the entire severity range. The wrong-species band in the
right panel is close to invisible at every severity, a direct contrast with the blur figure above.

![Fine-grained accuracy, blur against noise, same model and images](../../docs/figures/blur_vs_noise.png)

Both curves start from the same clean-accuracy point since they are the same 740 images before any
corruption. The noise curve stays close to flat. The blur curve drops to about a third of its starting
value by 40% severity.

## Finding

Under blur, coarse-grained classification is far more robust than fine-grained classification. By 50%
severity, fine accuracy has already fallen to 28.7%, worse than breed-weighted random guessing, while
coarse accuracy is still 84.2%. Even at maximum blur, coarse accuracy never drops below 70%, while fine
accuracy collapses to 10.3%, barely above the roughly 2.7% random-chance baseline for 37 classes. Using
a 10%-of-images threshold to call a severity's cross-superclass error rate non-trivial, that point lands
at 50% severity, exactly where fine accuracy has already fallen by more than half from clean.

Under noise, this pattern barely appears, and that is the more interesting result. At this
parameterization (additive Gaussian pixel noise, standard deviation up to 45 out of 255), fine accuracy
only drifts from 83.2% to 74.7% across the entire severity range, and coarse accuracy never meaningfully
leaves 99 to 100%. Cross-superclass errors are close to absent: 2 images out of 740, only at maximum
severity. The crossover point blur reaches at 50% severity never happens for noise within the
severities tested here.

The fine-before-coarse collapse is not a general property of the model. It is specific to how the
corruption damages the image. Blur destroys the local texture and edge detail a fine-grained
distinction (ear shape, coat pattern) depends on, while leaving enough coarse shape and color
information intact for a while longer. Additive pixel noise at these severities apparently does not
remove that same texture information the same way. CLIP's embedding seems to average over per-pixel
noise fairly effectively. Whether noise would eventually show the same pattern at more extreme
severities, or whether a much larger standard deviation would just destroy both levels together with no
gap, is left open.

A secondary observation from the blur run: heavily blurred images do not fail randomly. They collapse
toward a small number of attractor breeds. At 100% severity, "boxer" alone accounts for about 24% of
all wrong fine-grained predictions (161 of 664), regardless of the image's true breed. Severe blur
appears to push CLIP's embedding for many different images into the same narrow region of
representation space, rather than spreading errors evenly across all 37 breeds.

## Caveats

- 20 images per breed is a real but small sample. Individual-breed accuracy numbers are noisier than
  the pooled fine and coarse curves above. The aggregate pattern is more trustworthy than any single
  breed's number.
- Only one corruption type was blur-tested to a full crossover and one noise-tested. Whether the same
  fine-before-coarse pattern holds for contrast, rotation, or compression is an open question this
  study does not answer.
- The fine and coarse classifiers are independent zero-shot runs, not a hierarchical model. A fine
  prediction landing on the wrong species (predicting a cat breed for a true dog, for example) does not
  by itself determine the coarse classifier's own answer for that image. Each is scored on its own
  merits.
- The noise result is bounded by the severity range tested (up to standard deviation 45/255). It is a
  real finding within that range, not a claim that CLIP is robust to noise at any intensity.

## Reproducing this

```bash
cd backend
pip install -r research/requirements.txt
python research/sample_dataset.py           # streams ~740 images, ~40MB, a few minutes
python research/run_study.py --axis blur    # ~3 minutes, resumable if interrupted
python research/run_study.py --axis noise   # ~3 minutes, resumable if interrupted
python research/build_frontend_data.py
python research/make_figures.py
```
