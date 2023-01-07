export function mean(values: number[]): number {
  let cant = values.length;
  return cant ? values.reduce((a, b) => a + b, 0) / cant : 0;
}

export function median(values: number[]): number {
  let cant = values.length;
  let v1 = values.slice().sort((a, b) => a - b);
  if ( cant % 2 === 0 ) {
    return mean(v1.slice(cant / 2 - 1, cant / 2 + 1));
  }
  return v1[ cant >> 1 ];
}

export function trendLSV(values: number[][]): { m: number, n: number } {
  const n = values.length;
  let Sx = 0, Sy = 0, Sxx = 0, Sxy = 0;
  
  for (let i = 0; i < n; i += 1) {
    let x = values[i][0], y = values[i][1];
    Sx += x; Sy += y;
    Sxx += x * x; Sxy += x * y;
  }

  let beta = (n * Sxy - Sx * Sy) / ( n * Sxx - Sx ** 2 );
  let alpha = (Sy - beta * Sx) / n;

  return { m: beta, n: alpha };
  
}