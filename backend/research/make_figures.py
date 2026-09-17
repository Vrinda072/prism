"""Render README figures from results/pet_robustness*.csv.

Usage: python research/make_figures.py
"""

import csv
import os
from collections import defaultdict

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

RESEARCH_DIR = os.path.dirname(__file__)
RESULTS_DIR = os.path.join(RESEARCH_DIR, "results")
FIG_DIR = os.path.join(RESEARCH_DIR, "..", "..", "docs", "figures")

AXIS_FILES = {"blur": "pet_robustness.csv", "noise": "pet_robustness_noise.csv"}
CROSSOVER_THRESHOLD = 0.10

# PRISM's own site palette, so these figures look like they belong to the
# same project instead of a generic matplotlib default theme.
PAPER = "#f2ecdb"
PANEL = "#f8f4e6"
INK = "#34141c"
MUTED = "#5c4f3d"
ACCENT = "#7a2331"
BORDER = "#ddd0b0"
POSITIVE = "#4f6b4f"
GOLD = "#c9a227"

plt.rcParams.update(
    {
        "figure.facecolor": PAPER,
        "axes.facecolor": PANEL,
        "savefig.facecolor": PAPER,
        "axes.edgecolor": BORDER,
        "axes.labelcolor": INK,
        "text.color": INK,
        "xtick.color": MUTED,
        "ytick.color": MUTED,
        "grid.color": BORDER,
        "font.size": 11,
        "axes.titleweight": "bold",
        "axes.titlesize": 13,
        "axes.titlepad": 12,
    }
)


def load_axis(axis: str) -> list[dict]:
    with open(os.path.join(RESULTS_DIR, AXIS_FILES[axis])) as f:
        return list(csv.DictReader(f))


def aggregate(rows: list[dict]):
    by_severity = defaultdict(list)
    for r in rows:
        by_severity[r["severity"]].append(r)
    severities = sorted(by_severity, key=float)

    fine, coarse, correct, within, cross = [], [], [], [], []
    crossover = None
    for sev in severities:
        rs = by_severity[sev]
        n = len(rs)
        fine.append(sum(r["fine_correct"] == "True" for r in rs) / n)
        coarse.append(sum(r["coarse_correct"] == "True" for r in rs) / n)
        c = sum(r["error_type"] == "correct" for r in rs)
        w = sum(r["error_type"] == "within_superclass" for r in rs)
        x = sum(r["error_type"] == "cross_superclass" for r in rs)
        correct.append(c)
        within.append(w)
        cross.append(x)
        if crossover is None and x / n >= CROSSOVER_THRESHOLD:
            crossover = float(sev) * 100

    return [float(s) * 100 for s in severities], fine, coarse, correct, within, cross, crossover


def strip_spines(ax) -> None:
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)


def plot_axis_results(axis: str, severities, fine, coarse, correct, within, cross, crossover) -> str:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.2))

    ax1.plot(severities, [v * 100 for v in fine], "o-", color=ACCENT, linewidth=2, markersize=5, label="Fine (37 breeds)")
    ax1.plot(severities, [v * 100 for v in coarse], "o-", color=INK, linewidth=2, markersize=5, label="Coarse (cat / dog)")
    if crossover is not None:
        ax1.axvline(crossover, color=MUTED, linewidth=1, linestyle="--")
        ax1.annotate(
            f"{crossover:.0f}%: cross-species\nerrors pass 10%",
            xy=(crossover, 50),
            xytext=(crossover + 6, 50),
            fontsize=9,
            color=MUTED,
            va="center",
        )
    ax1.set(xlabel=f"{axis.capitalize()} severity (%)", ylabel="Accuracy (%)", ylim=(0, 105), title="Accuracy by label granularity")
    ax1.legend(frameon=False, loc="lower left")
    ax1.grid(alpha=0.5)
    strip_spines(ax1)

    ax2.stackplot(
        severities,
        correct,
        within,
        cross,
        colors=[POSITIVE, GOLD, ACCENT],
        alpha=0.85,
        labels=["Correct", "Wrong breed,\nright species", "Wrong species"],
    )
    ax2.set(xlabel=f"{axis.capitalize()} severity (%)", ylabel="Images (of 740)", title="What the fine-grained errors are")
    ax2.legend(loc="upper right", frameon=False, fontsize=9)
    ax2.grid(alpha=0.5)
    strip_spines(ax2)

    fig.suptitle(f"{axis.capitalize()}", fontsize=15, fontweight="bold", x=0.02, ha="left")
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    out = os.path.join(FIG_DIR, f"{axis}_results.png")
    fig.savefig(out, dpi=160)
    plt.close(fig)
    print(f"wrote {out}")
    return out


def plot_blur_vs_noise(blur_sev, blur_fine, noise_sev, noise_fine) -> str:
    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    ax.plot(blur_sev, [v * 100 for v in blur_fine], "o-", color=ACCENT, linewidth=2, markersize=6, label="Blur")
    ax.plot(noise_sev, [v * 100 for v in noise_fine], "o-", color=POSITIVE, linewidth=2, markersize=6, label="Noise")
    ax.set(xlabel="Severity (%)", ylabel="Fine-grained accuracy (%)", ylim=(0, 105), title="Blur vs. noise, same model and images")
    ax.legend(frameon=False)
    ax.grid(alpha=0.5)
    strip_spines(ax)
    fig.tight_layout()
    out = os.path.join(FIG_DIR, "blur_vs_noise.png")
    fig.savefig(out, dpi=160)
    plt.close(fig)
    print(f"wrote {out}")
    return out


def main() -> None:
    os.makedirs(FIG_DIR, exist_ok=True)

    axis_data = {}
    for axis in AXIS_FILES:
        severities, fine, coarse, correct, within, cross, crossover = aggregate(load_axis(axis))
        axis_data[axis] = (severities, fine, coarse)
        plot_axis_results(axis, severities, fine, coarse, correct, within, cross, crossover)

    plot_blur_vs_noise(*axis_data["blur"][:2], *axis_data["noise"][:2])


if __name__ == "__main__":
    main()
