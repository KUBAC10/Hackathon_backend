// return correlation coefficient by given counters
export default function pearsonCorrelation(options = {}) {
  const { sum1, sum2, sum1sq, sum2sq, pSum, n } = options;

  // return 0 if number of results 0
  if (n === 0) return 0;

  // calculate denominator from function
  const den = Math.sqrt((sum1sq - (Math.pow(sum1, 2) / n)) * (sum2sq - (Math.pow(sum2, 2) / n)));

  // return 0 if denominator equal 0
  if (den === 0) return 0;

  // calculate and return coefficient
  return ((pSum - (sum1 * sum2 / n)) / den).toPrecision(3);
}
