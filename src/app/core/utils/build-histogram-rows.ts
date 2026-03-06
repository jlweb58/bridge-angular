import type { SingleDummyAnalyzeResponse } from '../models/single-dummy';

export interface HistogramRow {
  tricks: number;
  count: number;
  pct: number;
}

export function buildHistogramRows(
  response: SingleDummyAnalyzeResponse | null | undefined,
): HistogramRow[] {
  if (!response) {
    return [];
  }

  const total = response.samples || 0;

  return Object.entries(response.tricksHistogram ?? {})
    .map(([tricks, count]) => ({
      tricks: Number(tricks),
      count: Number(count),
      pct: total > 0 ? Number(count) / total : 0,
    }))
    .filter((row) => Number.isFinite(row.tricks) && Number.isFinite(row.count))
    .sort((a, b) => a.tricks - b.tricks);
}
