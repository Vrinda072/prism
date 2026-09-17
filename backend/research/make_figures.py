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

# PRISM's own site palette, so these figures look like they belong to the
# same project rather than a generic matplotlib default theme.
PAPER = "#f2ecdb"
PANEL = "#f8f4e6"
INK = "#34141c"
MUTED = "#5c4f3d"
ACCENT = "#7a2331"
BORDER = "#ddd0b0"
POSITIVE = "#4f6b4f"

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
    }
)


def load_axis(axis: str) -> list[dict]:
    path = os.path.join(RESULTS_DIR, AXIS_FILES[axis])
    with open(path) as f:
        return list(csv.DictReader(f))


def aggregate(rows: list[dict]) -> tuple[list[float], list[float], list[float], list[int], list[int], list[int]]:
    by_severity = defaultdict(list)
    for r in rows:
        by_severity[r["severity"]].append(r)
    severities = sorted(by_severity, key=float)

    fine, coarse, correct, within, cross = [], [], [], [], []
    for sev in severities:
        rs = by_severity[sev]
        n = len(rs)
        fine.append(sum(r["fine_correct"] == "True" for r in rs) / n)
        coarse.append(sum(r["coarse_correct"] == "True" for r in rs) / n)
        correct.append(sum(r["error_type"] == "correct" for r in rs))
        within.append(sum(r["error_type"] == "within_superclass" for r in rs))
        cross.append(sum(r["error_type"] == "cross_superclass" for r in rs))
    return [float(s) * 100 for s in severities], fine, coarse, correct, within, cross


def plot_fine_vs_coarse(axis: str, severities, fine, coarse) -> None:
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.plot(severities, [v * 100 for v in fine], "o-", color=ACCENT, linewidth=2, markersize=6, label="Fine (37 breeds)")
    ax.plot(severities, [v * 100 for v in coarse], "o-", color=INK, linewidth=2, markersize=6, label="Coarse (cat / dog)")
    ax.set(
        xlabel=f"{axis.capitalize()} severity (%)",
        ylabel="Accuracy (%)",
        title=f"CLIP zero-shot accuracy vs. {axis} severity — Oxford-IIIT Pet",
        ylim=(0, 105),
    )
    ax.legend(frameon=False)
    ax.grid(alpha=0.5)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    fig.tight_layout()
    out = os.path.join(FIG_DIR, f"fine_vs_coarse_{axis}.png")
    fig.savefig(out, dpi=160)
    plt.close(fig)
    print(f"wrote {out}")


def plot_error_decomposition(axis: str, severities, correct, within, cross) -> None:
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.stackplot(
        severities,
        correct,
        within,
        cross,
        colors=[POSITIVE, "#c9a227", ACCENT],
        alpha=0.85,
        labels=["Correct", "Within-superclass error\n(wrong breed, right species)", "Cross-superclass error\n(wrong species too)"],
    )
    ax.set(
        xlabel=f"{axis.capitalize()} severity (%)",
        ylabel="Images (of 740)",
        title=f"How fine-grained errors break down — {axis}",
    )
    ax.legend(loc="upper left", bbox_to_anchor=(1.02, 1), frameon=False, fontsize=9)
    ax.grid(alpha=0.5)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    fig.tight_layout()
    out = os.path.join(FIG_DIR, f"error_decomposition_{axis}.png")
    fig.savefig(out, dpi=160)
    plt.close(fig)
    print(f"wrote {out}")


def plot_blur_vs_noise(blur_sev, blur_fine, noise_sev, noise_fine) -> None:
    fig, ax = plt.subplots(figsize=(7, 4.2))
    ax.plot(blur_sev, [v * 100 for v in blur_fine], "o-", color=ACCENT, linewidth=2, markersize=6, label="Blur")
    ax.plot(noise_sev, [v * 100 for v in noise_fine], "o-", color=POSITIVE, linewidth=2, markersize=6, label="Noise")
    ax.set(
        xlabel="Severity (%)",
        ylabel="Fine-grained accuracy (%)",
        title="Blur vs. noise — same model, same images, same severities",
        ylim=(0, 105),
    )
    ax.legend(frameon=False)
    ax.grid(alpha=0.5)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    fig.tight_layout()
    out = os.path.join(FIG_DIR, "blur_vs_noise_fine_accuracy.png")
    fig.savefig(out, dpi=160)
    plt.close(fig)
    print(f"wrote {out}")


def main() -> None:
    os.makedirs(FIG_DIR, exist_ok=True)

    axis_data = {}
    for axis in AXIS_FILES:
        rows = load_axis(axis)
        severities, fine, coarse, correct, within, cross = aggregate(rows)
        axis_data[axis] = (severities, fine, coarse, correct, within, cross)
        plot_fine_vs_coarse(axis, severities, fine, coarse)
        plot_error_decomposition(axis, severities, correct, within, cross)

    plot_blur_vs_noise(axis_data["blur"][0], axis_data["blur"][1], axis_data["noise"][0], axis_data["noise"][1])


if __name__ == "__main__":
    main()
