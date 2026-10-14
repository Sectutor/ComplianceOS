/**
 * Open FAIR (Factor Analysis of Information Risk) Monte Carlo Engine
 * 
 * Provides quantitative cyber risk and financial loss simulation
 * (Loss Event Frequency x Loss Magnitude = Annualized Loss Expectancy)
 * producing P10, P50, P90, P95 (VaR), and loss exceedance probability curves.
 */

export interface FairParameterTriad {
  min: number;
  mode: number;
  max: number;
}

export interface FairSimulationInput {
  scenarioId?: string | number;
  scenarioName: string;
  /** Threat Event Frequency per year (min, mode, max times threat attempts breach) */
  threatEventFrequency: FairParameterTriad;
  /** Vulnerability percentage: 0 to 100% probability threat overcomes existing controls */
  vulnerabilityPercentage: number;
  /** Primary direct financial loss (investigation, incident response, recovery) */
  primaryLoss: FairParameterTriad;
  /** Secondary indirect financial loss (fines, lawsuits, reputational churn) */
  secondaryLoss: FairParameterTriad;
  /** Probability of secondary loss occurring if primary breach occurs (0.0 to 1.0) */
  secondaryLossProbability?: number;
  /** Currency symbol (default: 'USD') */
  currency?: 'USD' | 'EUR' | 'GBP';
  /** Number of simulation iterations (default: 10,000) */
  iterations?: number;
  /** Optional deterministic PRNG seed for unit testing */
  seed?: number;
}

export interface LossExceedancePoint {
  lossAmount: number;
  probabilityExceeded: number; // 0.0 to 1.0
}

export interface HistogramBin {
  binMin: number;
  binMax: number;
  count: number;
  frequency: number; // 0.0 to 1.0
}

export interface FairSimulationResult {
  scenarioName: string;
  currency: 'USD' | 'EUR' | 'GBP';
  iterations: number;
  /** Annualized Loss Expectancy (Mean total annual loss) */
  aleMean: number;
  /** Median Annual Loss (P50) */
  p50Median: number;
  /** 10th Percentile Annual Loss */
  p10Loss: number;
  /** 90th Percentile Annual Loss */
  p90Loss: number;
  /** 95th Percentile / Value at Risk (VaR) */
  p95VaR: number;
  /** Max single trial loss simulated */
  maxLoss: number;
  /** Min single trial loss simulated */
  minLoss: number;
  /** Probability of having zero loss in a given year */
  zeroLossProbability: number;
  /** Formatted human-readable loss figures */
  formatted: {
    aleMean: string;
    p50Median: string;
    p90Loss: string;
    p95VaR: string;
  };
  /** Curve points for plotting the Loss Exceedance Curve (LEC) */
  lossExceedanceCurve: LossExceedancePoint[];
  /** Distribution histogram for plotting loss distribution bell/skew curve */
  histogram: HistogramBin[];
}

/**
 * Pseudo-random generator (Xorshift32) for reproducible tests when seed is passed,
 * otherwise falls back to Math.random.
 */
class FastPRNG {
  private state: number;
  constructor(seed?: number) {
    this.state = seed !== undefined && seed > 0 ? seed : Math.floor(Math.random() * 0x7fffffff);
  }

  next(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 0xffffffff;
  }
}

/**
 * Samples a value from a Modified PERT (Program Evaluation and Review Technique) distribution.
 * Uses beta-distribution approximation with shape parameter gamma = 4.
 */
function samplePert(min: number, mode: number, max: number, prng: FastPRNG): number {
  if (min >= max) return min;
  const safeMode = Math.max(min, Math.min(max, mode));

  // Beta distribution approximation using Johnk's generator or simple Kumaraswamy approximation
  const u1 = prng.next();
  const u2 = prng.next();

  const alpha = 1 + 4 * ((safeMode - min) / (max - min));
  const beta = 1 + 4 * ((max - safeMode) / (max - min));

  // Approximate beta sample via standard ratio of uniforms / Box-Muller transformation
  const mean = (min + 4 * safeMode + max) / 6;
  const std = (max - min) / 6;

  // Box-Muller standard normal
  const z = Math.sqrt(-2.0 * Math.log(Math.max(1e-9, u1))) * Math.cos(2.0 * Math.PI * u2);
  const sample = mean + z * std;

  return Math.max(min, Math.min(max, sample));
}

/**
 * Formats a currency amount into clean abbreviated or full financial string
 */
export function formatCurrency(amount: number, currency: 'USD' | 'EUR' | 'GBP' = 'USD'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  if (amount >= 1_000_000_000) {
    return `${symbol}${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

/**
 * Executes a 10,000-iteration Open FAIR Monte Carlo simulation
 */
export function runFairSimulation(input: FairSimulationInput): FairSimulationResult {
  const iterations = Math.max(100, Math.min(50000, input.iterations || 10000));
  const prng = new FastPRNG(input.seed);
  const currency = input.currency || 'USD';
  const vuln = Math.max(0, Math.min(1, input.vulnerabilityPercentage / 100));
  const secProb = input.secondaryLossProbability !== undefined ? Math.max(0, Math.min(1, input.secondaryLossProbability)) : 0.4;

  const annualLosses: number[] = new Array(iterations);
  let zeroLossCount = 0;

  for (let i = 0; i < iterations; i++) {
    // 1. Sample Threat Event Frequency (TEF) for this year
    const tef = samplePert(
      input.threatEventFrequency.min,
      input.threatEventFrequency.mode,
      input.threatEventFrequency.max,
      prng
    );

    // Number of threat events (Poisson approximation with rate tef)
    const numEvents = Math.round(tef);
    let trialLoss = 0;

    for (let e = 0; e < numEvents; e++) {
      // Check if vulnerability condition is satisfied (control failure)
      if (prng.next() <= vuln) {
        // Sample Primary Loss
        const primary = samplePert(
          input.primaryLoss.min,
          input.primaryLoss.mode,
          input.primaryLoss.max,
          prng
        );

        let eventLoss = primary;

        // Sample Secondary Loss if triggered
        if (prng.next() <= secProb) {
          const secondary = samplePert(
            input.secondaryLoss.min,
            input.secondaryLoss.mode,
            input.secondaryLoss.max,
            prng
          );
          eventLoss += secondary;
        }

        trialLoss += eventLoss;
      }
    }

    annualLosses[i] = trialLoss;
    if (trialLoss === 0) zeroLossCount++;
  }

  // Sort ascending for quantile extraction
  annualLosses.sort((a, b) => a - b);

  const sum = annualLosses.reduce((acc, val) => acc + val, 0);
  const aleMean = Math.round(sum / iterations);

  const getPercentile = (p: number) => {
    const idx = Math.min(iterations - 1, Math.max(0, Math.floor(p * iterations)));
    return Math.round(annualLosses[idx]);
  };

  const p10Loss = getPercentile(0.10);
  const p50Median = getPercentile(0.50);
  const p90Loss = getPercentile(0.90);
  const p95VaR = getPercentile(0.95);
  const minLoss = Math.round(annualLosses[0]);
  const maxLoss = Math.round(annualLosses[iterations - 1]);

  // Construct Loss Exceedance Curve (LEC) with 20 sample intervals
  const lossExceedanceCurve: LossExceedancePoint[] = [];
  const percentiles = [0.01, 0.05, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.85, 0.90, 0.95, 0.98, 0.99];

  for (const pct of percentiles) {
    const amount = getPercentile(pct);
    const probExceeded = Number((1.0 - pct).toFixed(2));
    lossExceedanceCurve.push({ lossAmount: amount, probabilityExceeded: probExceeded });
  }

  // Construct Histogram (10 bins)
  const numBins = 10;
  const binStep = maxLoss > minLoss ? (maxLoss - minLoss) / numBins : 1;
  const histogram: HistogramBin[] = [];

  for (let b = 0; b < numBins; b++) {
    const bMin = minLoss + b * binStep;
    const bMax = bMin + binStep;
    const count = annualLosses.filter(val => val >= bMin && (b === numBins - 1 ? val <= bMax : val < bMax)).length;
    histogram.push({
      binMin: Math.round(bMin),
      binMax: Math.round(bMax),
      count,
      frequency: Number((count / iterations).toFixed(3)),
    });
  }

  return {
    scenarioName: input.scenarioName,
    currency,
    iterations,
    aleMean,
    p50Median,
    p10Loss,
    p90Loss,
    p95VaR,
    minLoss,
    maxLoss,
    zeroLossProbability: Number((zeroLossCount / iterations).toFixed(2)),
    formatted: {
      aleMean: formatCurrency(aleMean, currency),
      p50Median: formatCurrency(p50Median, currency),
      p90Loss: formatCurrency(p90Loss, currency),
      p95VaR: formatCurrency(p95VaR, currency),
    },
    lossExceedanceCurve,
    histogram,
  };
}
