import { Vector3D, UP, CENTER, BACK, DOWN } from './../vector3d';

function map(v, a, b, A, B) {
  return (v - a) * (B - A) / (b - a) + A; 
}

export class Sphere {
  points: Vector3D[];
  faces: number[][];
  r: number;
  phi0: number;
  deltaPhi: number;
  horizontalPoints: number;
  theta0: number;
  deltaTheta: number;
  verticalPoints: number;
  /**
   * 
   * @param r Radius
   * @param p0 Initial phi
   * @param dp Delta phi
   * @param pp Points in the phi direction
   * @param t0 Initial theta
   * @param dt Delta theta
   * @param pt Points in the theta direction
   */
  constructor(r: number, p0: number, dp: number, pp: number, t0: number, dt: number, pt: number) {
    this.points = [];
    this.faces = [];
    this.r = r;
    this.phi0 = p0;
    this.deltaPhi = dp;
    this.horizontalPoints = Math.max(3, pp);
    this.theta0 = t0;
    this.deltaTheta = dt;
    this.verticalPoints = Math.max(3, pt);

    this.init();
  }

  private init() {
    const V = this.verticalPoints;
    const H = this.horizontalPoints;
    let dt = this.deltaTheta / (V - 1);
    let dp = this.deltaPhi / (H - 1);

    for (let i = 0, maxi = V - 1; i <= maxi; i += 1) {
      for (let j = 0, maxj = H - 1; j <= maxj; j += 1) {
        this.points.push(
          UP.mul( this.r ).rotate(CENTER, BACK, this.theta0 + i * dt)
            .rotate(CENTER, DOWN, this.phi0 + j * dp)
        );
        if ( i < maxi && j < maxj ) {
          i > 0 && this.faces.push([ i * H + j, i * H + j + 1, (i + 1) * H + j + 1 ]);
          this.faces.push([ i * H + j, (i + 1) * H + j + 1, (i + 1) * H + j ]);
        }
      }
    }
  }
}