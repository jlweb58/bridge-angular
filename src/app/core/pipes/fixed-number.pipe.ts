import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fixedNumber',
  standalone: true,
})
export class FixedNumberPipe implements PipeTransform {
  transform(value: number | null | undefined, digits = 2): string {
    if (!Number.isFinite(value)) return '-';
    return Number(value).toFixed(digits);
  }
}
