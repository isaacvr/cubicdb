import { CENTER, Vector3D } from "@classes/vector3d";
import { easeIn, getEasing } from "@helpers/math";
import { Object3D, Vector3, type Matrix4 } from "three";
import type { ThreeJSAdaptor } from "./ThreeJSAdaptor";
import type { EasingFunction, SequenceResult } from "@interfaces";
import type { Puzzle } from "@classes/puzzle/puzzle";
import type { Piece } from "@classes/puzzle/Piece";

export class ControlAdaptor {
  // Reconstruction
  states: Matrix4[][] = [];
  stateAngle: number[][] = [];
  stateCenter: Vector3D[][] = [];
  stateDir: Vector3D[][] = [];
  stateFilter: boolean[][][] = [];
  easings: EasingFunction[][] = [];

  constructor(private threeAdaptor: ThreeJSAdaptor) {}

  reset() {
    this.states.length = 0;
    this.stateAngle.length = 0;
    this.stateCenter.length = 0;
    this.stateDir.length = 0;
    this.stateFilter.length = 0;
    this.easings.length = 0;
  }

  handleAlpha(a: number, mounted: boolean) {
    if (!mounted) return;
    if (a < 0 || a >= this.states.length) return;

    const id = ~~a;
    const state = this.states[id];
    const angs = this.stateAngle[id];
    const centers = this.stateCenter[id];
    const us = this.stateDir[id];
    const filters = this.stateFilter[id];
    const easings = this.easings[id];
    const alphas = easings.map(e => getEasing(e)(a - id));

    const allObjects = [
      ...this.threeAdaptor.group.children,
      ...this.threeAdaptor.backFace.children,
    ];

    allObjects.forEach((d, idx) => {
      d.rotation.setFromRotationMatrix(state[idx]);
      d.position.setFromMatrixPosition(state[idx]);

      if (filters.every(f => !f[idx])) {
        return;
      }

      for (let i = 0, maxi = filters.length; i < maxi; i += 1) {
        if (filters[i][idx]) {
          const alpha = alphas[i];
          const center = centers[i];
          const u = us[i];
          const c = new Vector3(center.x, center.y, center.z);
          const nu = new Vector3(u.x, u.y, u.z);
          const ang = angs[i];

          d.parent?.localToWorld(d.position);
          d.position.sub(c);
          d.position.applyAxisAngle(nu, ang * alpha);
          d.position.add(c);
          d.parent?.worldToLocal(d.position);
          d.rotateOnWorldAxis(nu, ang * alpha);
          break;
        }
      }
    });
  }

  applySequence(nc: Puzzle, seq: (SequenceResult | SequenceResult[])[]) {
    const cube = this.threeAdaptor.cube;
    const cubeIDs = cube.p.pieces.map(p => p.id);
    const ncIDs = nc.p.pieces.map(p => p.id);
    const idMap: Map<string, string> = new Map(ncIDs.map((id, pos) => [id, cubeIDs[pos]]));

    const getMatrices = (data: Object3D[]) => {
      return data.map(d => d.matrixWorld.clone());
    };

    const allObjects = [
      ...this.threeAdaptor.group.children,
      ...this.threeAdaptor.backFace.children,
    ];

    this.states.push(getMatrices(allObjects));

    const center = cube.p.center;

    for (let i = 0, maxi = seq.length; i < maxi; i += 1) {
      const s = (Array.isArray(seq[i]) ? seq[i] : [seq[i]]) as SequenceResult[];

      const stateFilter: boolean[][] = [];
      const stateAngle: number[] = [];
      const stateCenter: Vector3D[] = [];
      const stateDir: Vector3D[] = [];
      const easings: EasingFunction[] = [];

      for (let j = 0, maxj = s.length; j < maxj; j += 1) {
        const ss = s[j];
        const nu = new Vector3(ss.u.x, ss.u.y, ss.u.z).normalize();
        const ang = ss.ang;
        const ids = ss.pieces;
        const c = ss.center
          ? new Vector3(ss.center.x, ss.center.y, ss.center.z)
          : new Vector3(center.x, center.y, center.z);
        const e = ss.easing || "easeIn";

        stateFilter.push(
          allObjects.map(d => {
            if (!ids.some(id => idMap.get(id) === (d.userData.data as Piece).id)) {
              return false;
            }

            d.parent?.localToWorld(d.position);
            d.position.sub(c);
            d.position.applyAxisAngle(nu, ang);
            d.position.add(c);
            d.parent?.worldToLocal(d.position);
            d.rotateOnWorldAxis(nu, ang);
            d.updateMatrixWorld();
            return true;
          })
        );

        easings.push(e);
        stateAngle.push(ang);
        stateCenter.push(new Vector3D(c.x, c.y, c.z));
        stateDir.push(ss.u.clone());
      }

      this.stateFilter.push(stateFilter);
      this.states.push(getMatrices(allObjects));
      this.stateAngle.push(stateAngle);
      this.stateCenter.push(stateCenter);
      this.stateDir.push(stateDir);
      this.easings.push(easings);
    }

    allObjects.forEach((d, idx) => {
      d.rotation.setFromRotationMatrix(this.states[0][idx]);
      d.position.setFromMatrixPosition(this.states[0][idx]);
    });

    const lastST = this.states[this.states.length - 1];

    this.stateAngle.push(lastST.map(() => 0));
    this.stateCenter.push(lastST.map(() => CENTER));
    this.stateDir.push(lastST.map(() => CENTER));
    this.stateFilter.push([]);
    this.easings.push(lastST.map(() => "easeIn"));
  }
}
