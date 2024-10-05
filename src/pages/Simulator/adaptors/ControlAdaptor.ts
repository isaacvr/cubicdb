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

    let id = ~~a;
    let state = this.states[id];
    let angs = this.stateAngle[id];
    let centers = this.stateCenter[id];
    let us = this.stateDir[id];
    let filters = this.stateFilter[id];
    let easings = this.easings[id];
    let alphas = easings.map(e => getEasing(e)(a - id));

    let allObjects = [...this.threeAdaptor.group.children, ...this.threeAdaptor.backFace.children];

    allObjects.forEach((d, idx) => {
      d.rotation.setFromRotationMatrix(state[idx]);
      d.position.setFromMatrixPosition(state[idx]);

      if (filters.every(f => !f[idx])) {
        return;
      }

      for (let i = 0, maxi = filters.length; i < maxi; i += 1) {
        if (filters[i][idx]) {
          let alpha = alphas[i];
          let center = centers[i];
          let u = us[i];
          let c = new Vector3(center.x, center.y, center.z);
          let nu = new Vector3(u.x, u.y, u.z);
          let ang = angs[i];

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
    let cube = this.threeAdaptor.cube;
    let cubeIDs = cube.p.pieces.map(p => p.id);
    let ncIDs = nc.p.pieces.map(p => p.id);
    let idMap: Map<string, string> = new Map(ncIDs.map((id, pos) => [id, cubeIDs[pos]]));

    let getMatrices = (data: Object3D[]) => {
      return data.map(d => d.matrixWorld.clone());
    };

    let allObjects = [...this.threeAdaptor.group.children, ...this.threeAdaptor.backFace.children];

    this.states.push(getMatrices(allObjects));

    let center = cube.p.center;

    for (let i = 0, maxi = seq.length; i < maxi; i += 1) {
      let s = (Array.isArray(seq[i]) ? seq[i] : [seq[i]]) as SequenceResult[];

      let stateFilter: boolean[][] = [];
      let stateAngle: number[] = [];
      let stateCenter: Vector3D[] = [];
      let stateDir: Vector3D[] = [];
      let easings: EasingFunction[] = [];

      for (let j = 0, maxj = s.length; j < maxj; j += 1) {
        let ss = s[j];
        let nu = new Vector3(ss.u.x, ss.u.y, ss.u.z).normalize();
        let ang = ss.ang;
        let ids = ss.pieces;
        let c = ss.center
          ? new Vector3(ss.center.x, ss.center.y, ss.center.z)
          : new Vector3(center.x, center.y, center.z);
        let e = ss.easing || "easeIn";

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

    let lastST = this.states[this.states.length - 1];

    this.stateAngle.push(lastST.map(() => 0));
    this.stateCenter.push(lastST.map(() => CENTER));
    this.stateDir.push(lastST.map(() => CENTER));
    this.stateFilter.push([]);
    this.easings.push(lastST.map(() => "easeIn"));
  }
}
