// Implementación básica de FFT
export function fft(real: number[], imag: number[]) {
  const n = real.length;
  const n_2 = n >> 1;

  if (n <= 1) return;

  // Divide y conquista: divide los datos en partes pares e impares
  const evenReal = new Array(n_2);
  const evenImag = new Array(n_2);
  const oddReal = new Array(n_2);
  const oddImag = new Array(n_2);

  for (let i = 0; i < n_2; i += 1) {
    evenReal[i] = real[i * 2];
    evenImag[i] = imag[i * 2];
    oddReal[i] = real[i * 2 + 1];
    oddImag[i] = imag[i * 2 + 1];
  }

  // Recursividad: aplica FFT en las partes pares e impares
  fft(evenReal, evenImag);
  fft(oddReal, oddImag);

  // Combina las partes pares e impares
  for (let k = 0, maxk = n_2; k < maxk; k += 1) {
    const tReal =
      Math.cos((-2 * Math.PI * k) / n) * oddReal[k] - Math.sin((-2 * Math.PI * k) / n) * oddImag[k];
    const tImag =
      Math.sin((-2 * Math.PI * k) / n) * oddReal[k] + Math.cos((-2 * Math.PI * k) / n) * oddImag[k];

    real[k] = evenReal[k] + tReal;
    imag[k] = evenImag[k] + tImag;
    real[k + n_2] = evenReal[k] - tReal;
    imag[k + n_2] = evenImag[k] - tImag;
  }
}

// Función para calcular la magnitud de la FFT
export function calculateMagnitude(real: number[], imag: number[]) {
  const magnitudes = [];
  for (let i = 0; i < real.length; i += 1) {
    magnitudes.push(Math.sqrt(real[i] * real[i] + imag[i] * imag[i]));
  }
  return magnitudes;
}