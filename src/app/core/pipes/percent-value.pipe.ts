import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'percentValue',
  standalone: true,
})
export class PercentValuePipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 1): string {
    if (!Number.isFinite(value)) return '-';
    return `${(Number(value) * 100).toFixed(digits)}%`;
  }
}
