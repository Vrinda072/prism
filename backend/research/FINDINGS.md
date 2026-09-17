# Fine-vs-coarse-grained corruption robustness

I ran this as a real offline experiment, not a live-compute panel like the rest of PRISM — the same
structure as the reference CLIP Robustness Study's own scripts, but asking a question that study never
tests: it uses single-level label sets (CIFAR-10/100) and its EuroSAT run has no severity sweep at all.

## The question

As corruption severity increases, does CLIP's zero-shot classifier confuse *fine-grained* distinctions
(breed vs. breed) before it confuses *coarse-grained* ones (cat vs. dog) — or does accuracy collapse
at both levels together? And does the answer depend on which corruption you use?

## Setup

- **Model**: CLIP ViT-B/32, the exact same load path PRISM's live app uses (`ModelService`).
- **Classifiers**: two independent zero-shot classifiers, both using the same 8-template prompt
  ensembling already live in `/semantic` — a 37-way breed classifier and a 2-way cat/dog classifier.
  They are not hierarchically linked; each is scored against the image independently.
- **Dataset**: a stratified sample of the real [Oxford-IIIT Pet dataset](https://huggingface.co/datasets/timm/oxford-iiit-pet)
  (CC BY-SA 4.0) — 20 images per breed × 37 breeds = 740 images, streamed directly from the Parquet
  files rather than downloading the full ~790MB dataset (this machine had limited free disk space).
- **Perturbations**: blur and noise, each run independently at PRISM's own 11 fixed severities (0–100%,
  step 10%), using the exact same parameterization as the live app's canvas pipeline — Gaussian blur
  (`radius = severity × 20px`) and per-pixel Gaussian noise (`std = severity × 45`, matching
  `imageTransform.ts`'s `maxBlurPx` / `maxNoiseStdDev`).
- **16,280 total forward passes** (740 images × 11 severities × 2 corruption types), ~6 minutes on this
  machine.

## Results

### Blur

| Severity | Fine accuracy | Coarse accuracy |
|---:|---:|---:|
| 0% (clean) | 83.2% | 100.0% |
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

![Fine vs. coarse accuracy under blur](../../docs/figures/fine_vs_coarse_blur.png)
![Error decomposition under blur](../../docs/figures/error_decomposition_blur.png)

### Noise

| Severity | Fine accuracy | Coarse accuracy |
|---:|---:|---:|
| 0% (clean) | 83.2% | 100.0% |
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

![Fine vs. coarse accuracy under noise](../../docs/figures/fine_vs_coarse_noise.png)

Full per-image, per-severity rows: [`results/pet_robustness.csv`](results/pet_robustness.csv) (blur),
[`results/pet_robustness_noise.csv`](results/pet_robustness_noise.csv) (noise).

## Finding

**Under blur, coarse-grained classification is dramatically more robust than fine-grained
classification.** By 50% blur severity, fine accuracy has already fallen to 28.7% — worse than random
guessing weighted toward common breeds — while coarse accuracy is still 84.2%. Even at maximum blur,
coarse accuracy never drops below 70%, while fine accuracy collapses to 10.3%, barely above the ~2.7%
random-chance baseline for 37 classes. Using a 10%-of-images threshold to call a severity's
cross-superclass error rate "non-trivial," that point lands at **50% severity** — exactly where fine
accuracy has already fallen by more than half from clean, while coarse accuracy is still above 84%.

![Blur vs. noise, fine-grained accuracy](../../docs/figures/blur_vs_noise_fine_accuracy.png)

**Under noise, this pattern barely appears at all — and that's the more interesting result.** At this
parameterization (additive Gaussian pixel noise, std up to 45/255), fine accuracy only drifts from
83.2% down to 74.7% across the *entire* severity range, and coarse accuracy never meaningfully leaves
99–100%. Cross-superclass errors are essentially absent (2 images out of 740, only at maximum severity)
— the crossover point blur reaches at 50% severity never happens for noise at all, within the severities
tested here.

**So the fine-before-coarse collapse is not a general property of the model — it's specific to how the
corruption damages the image.** Blur destroys the local texture and edge detail a fine-grained
distinction (ear shape, coat pattern) depends on, while leaving enough coarse shape/color information
intact for a while longer. Additive pixel noise at these severities apparently doesn't remove that
same texture information in a way that hurts either classifier much — CLIP's embedding seems to average
over per-pixel noise fairly effectively. Whether noise would eventually show the same pattern at more
extreme severities (or whether a much larger std would just destroy both levels together, with no
gap) is left open.

A secondary observation from the blur run: heavily-blurred images don't fail randomly — they collapse
toward a small number of "attractor" breeds. At 100% blur severity, "boxer" alone accounts for ~24% of
all wrong fine-grained predictions (161 of 664), regardless of the image's true breed. This suggests
severe blur pushes CLIP's embedding for many different images into the same narrow region of
representation space, rather than spreading errors evenly across all 37 breeds.

## Caveats

- 20 images/breed is a real but small sample — individual-breed accuracy numbers are noisier than the
  pooled fine/coarse curves above; I'd trust the aggregate pattern over any single breed's number.
- Only two corruption types were tested (blur, noise). Whether the fine-before-coarse pattern holds for
  contrast, rotation, or compression — some of which PRISM's live sweep already supports — is still an
  open question.
- The fine and coarse classifiers are independent zero-shot runs, not a hierarchical model — a fine
  prediction landing on the "wrong" species (e.g. predicting a cat breed for a true dog) doesn't by
  itself determine the coarse classifier's own answer for that image; each is scored on its own merits.
- The noise result is bounded by the severity range tested (up to std 45/255) — it's a real finding
  within that range, not a claim that CLIP is robust to noise at any intensity.

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
