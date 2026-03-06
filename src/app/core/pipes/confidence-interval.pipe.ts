import { Pipe, PipeTransform } from '@angular/core';
import type { ConfidenceInterval95 } from '../models/single-dummy';

@Pipe({
  name: 'confidenceInterval',
  standalone: true,
})
export class ConfidenceIntervalPipe implements PipeTransform {
  transform(value: ConfidenceInterval95 | null | undefined, digits = 2): string {
    if (!value) return '-';
    if (!Number.isFinite(value.low) || !Number.isFinite(value.high)) return '-';
    return `${value.low.toFixed(digits)}–${value.high.toFixed(digits)}`;
  }
}
