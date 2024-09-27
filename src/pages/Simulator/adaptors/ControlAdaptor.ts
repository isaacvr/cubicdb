import { CENTER, type Vector3D } from "@classes/vector3d";
import { easeIn } from "@helpers/math";
import { Object3D, Vector3, type Matrix4 } from "three";
import type { ThreeJSAdaptor } from "./ThreeJSAdaptor";
import type { SequenceResult } from "@interfaces";
import type { Puzzle } from "@classes/puzzle/puzzle";
import type { Piece } from "@classes/puzzle/Piece";

export class ControlAdaptor {
  // Reconstruction
  states: Matrix4[][] = [];
  stateAngle: number[] = [];
  stateCenter: Vector3D[] = [];
  stateDir: Vector3D[] = [];
  stateFilter: boolean[][] = [];

  constructor(private threeAdaptor: ThreeJSAdaptor) {}

  reset() {
    this.states.length = 0;
    this.stateAngle.length = 0;
    this.stateCenter.length = 0;
    this.stateDir.length = 0;
    this.stateFilter.length = 0;
  }

  handleAlpha(a: number, mounted: boolean) {
    if (!mounted) return;
    if (a < 0 || a >= this.states.length) return;

    let id = ~~a;
    let alpha = easeIn(a - id);

    let state = this.states[id];
    let ang = this.stateAngle[id];
    let center = this.stateCenter[id];
    let u = this.stateDir[id];
    let filter = this.stateFilter[id];
    let c = new Vector3(center.x, center.y, center.z);
    let nu = new Vector3(u.x, u.y, u.z);

    let allObjects = [...this.threeAdaptor.group.children, ...this.threeAdaptor.backFace.children];

    allObjects.forEach((d, idx) => {
      d.rotation.setFromRotationMatrix(state[idx]);
      d.position.setFromMatrixPosition(state[idx]);

      if (!filter[idx]) return;

      d.parent?.localToWorld(d.position);
      d.position.sub(c);
      d.position.applyAxisAngle(nu, ang * alpha);
      d.position.add(c);
      d.parent?.worldToLocal(d.position);
      d.rotateOnWorldAxis(nu, ang * alpha);
    });
  }

  applySequence(nc: Puzzle, seq: SequenceResult[]) {
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
    let c = new Vector3(center.x, center.y, center.z);

    for (let i = 0, maxi = seq.length; i < maxi; i += 1) {
      let s = seq[i];
      let nu = new Vector3(s.u.x, s.u.y, s.u.z).normalize();
      let ang = s.ang;
      let ids = s.pieces;

      this.stateFilter.push(
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

      this.states.push(getMatrices(allObjects));
      this.stateAngle.push(ang);
      this.stateCenter.push(center.clone());
      this.stateDir.push(s.u.clone());
    }

    allObjects.forEach((d, idx) => {
      d.rotation.setFromRotationMatrix(this.states[0][idx]);
      d.position.setFromMatrixPosition(this.states[0][idx]);
    });

    this.stateAngle.push(0);
    this.stateCenter.push(CENTER);
    this.stateDir.push(CENTER);
    this.stateFilter.push([]);
  }
}
