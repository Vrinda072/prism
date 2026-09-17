# Fine-vs-coarse-grained corruption robustness

I ran this as a real offline experiment, not a live-compute panel like the rest of PRISM — the same
structure as the reference CLIP Robustness Study's own scripts, but asking a question that study never
tests: it uses single-level label sets (CIFAR-10/100) and its EuroSAT run has no severity sweep at all.

## The question

As blur severity increases, does CLIP's zero-shot classifier confuse *fine-grained* distinctions
(breed vs. breed) before it confuses *coarse-grained* ones (cat vs. dog) — or does accuracy collapse
at both levels together?

## Setup

- **Model**: CLIP ViT-B/32, the exact same load path PRISM's live app uses (`ModelService`).
- **Classifiers**: two independent zero-shot classifiers, both using the same 8-template prompt
  ensembling already live in `/semantic` — a 37-way breed classifier and a 2-way cat/dog classifier.
  They are not hierarchically linked; each is scored against the image independently.
- **Dataset**: a stratified sample of the real [Oxford-IIIT Pet dataset](https://huggingface.co/datasets/timm/oxford-iiit-pet)
  (CC BY-SA 4.0) — 20 images per breed × 37 breeds = 740 images, streamed directly from the Parquet
  files rather than downloading the full ~790MB dataset (this machine had limited free disk space).
- **Perturbation**: blur only, at PRISM's own 11 fixed severities (0–100%, step 10%), using the exact
  same Gaussian-blur parameterization as the live app's canvas pipeline (`GaussianBlur(radius = severity
  × 20px)`, matching `imageTransform.ts`'s `maxBlurPx`).
- **8,140 total forward passes** (740 images × 11 severities), ~3 minutes on this machine.

## Results

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

Full per-image, per-severity rows: [`results/pet_robustness.csv`](results/pet_robustness.csv).

## Finding

**Coarse-grained classification is dramatically more robust than fine-grained classification under the
same corruption.** By 50% blur severity, fine accuracy has already fallen to 28.7% — worse than random
guessing weighted toward common breeds — while coarse accuracy is still 84.2%. Even at maximum blur
(100% severity, a genuinely destructive amount of blur), coarse accuracy never drops below 70%, while
fine accuracy has collapsed to 10.3%, barely above the ~2.7% random-chance baseline for 37 classes.

Breaking down every fine-grained *error* by whether the coarse classifier still got it right: errors are
overwhelmingly "within-superclass" (wrong breed, right species) at low-to-moderate severity, and only
become substantially "cross-superclass" (wrong species too) at higher severity. Using a 10%-of-images
threshold to call a severity's cross-superclass error rate "non-trivial," that point lands at **50%
severity** — exactly where fine accuracy has already fallen by more than half from clean, while coarse
accuracy is still above 84%.

A secondary observation: heavily-blurred images don't fail randomly — they collapse toward a small
number of "attractor" breeds. At 100% severity, "boxer" alone accounts for ~24% of all wrong
fine-grained predictions (161 of 664), regardless of the image's true breed. This suggests severe
blur pushes CLIP's embedding for many different images into the same narrow region of representation
space, rather than spreading errors evenly across all 37 breeds.

## Caveats

- 20 images/breed is a real but small sample — individual-breed accuracy numbers are noisier than the
  pooled fine/coarse curves above; I'd trust the aggregate pattern over any single breed's number.
- Only one corruption type (blur) was tested. Whether the same fine-before-coarse pattern holds for
  noise, contrast, or compression is an open question this study doesn't answer.
- The fine and coarse classifiers are independent zero-shot runs, not a hierarchical model — a fine
  prediction landing on the "wrong" species (e.g. predicting a cat breed for a true dog) doesn't by
  itself determine the coarse classifier's own answer for that image; each is scored on its own merits.

## Reproducing this

```bash
cd backend
pip install -r research/requirements.txt
python research/sample_dataset.py   # streams ~740 images, ~40MB, a few minutes
python research/run_study.py        # ~3 minutes, resumable if interrupted
python research/build_frontend_data.py
```
