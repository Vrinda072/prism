/** Ranks values 1..n, averaging ranks across ties (the standard convention
 * for Spearman correlation). */
function rank(values: number[]): number[] {
  const indexed = values.map((value, i) => ({ value, i }))
  indexed.sort((a, b) => a.value - b.value)

  const ranks = new Array<number>(values.length)
  let i = 0
  while (i < indexed.length) {
    let j = i
    while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) j++
    const averageRank = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = averageRank
    i = j + 1
  }
  return ranks
}

/** Spearman rank correlation: Pearson correlation computed on ranks instead
 * of raw values — the same statistic the CLIP Robustness Study reference
 * uses to relate feature drift to accuracy drop. Returns a value in
 * [-1, 1], or 0 for fewer than 3 points (not enough to say anything). */
export function spearmanCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 3 || ys.length !== n) return 0

  const rankX = rank(xs)
  const rankY = rank(ys)
  const meanX = rankX.reduce((a, b) => a + b, 0) / n
  const meanY = rankY.reduce((a, b) => a + b, 0) / n

  let cov = 0
  let varX = 0
  let varY = 0
  for (let i = 0; i < n; i++) {
    const dx = rankX[i] - meanX
    const dy = rankY[i] - meanY
    cov += dx * dy
    varX += dx * dx
    varY += dy * dy
  }

  if (varX === 0 || varY === 0) return 0
  return cov / Math.sqrt(varX * varY)
}
