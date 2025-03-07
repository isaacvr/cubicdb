import { dataService } from "$lib/data-services/data.service";
import { Puzzle } from "@classes/puzzle/puzzle";
import { CubeMode } from "@constants";
import { pGenerateCubeBundle } from "@helpers/cube-draw";
import { algorithmToPuzzle } from "@helpers/object";
import { nameCmp } from "@helpers/strings";
import type { Algorithm } from "@interfaces";
import { get } from "svelte/store";

export interface Case {
  name: string;
  img: string;
  pos: number;
}

export interface Group {
  name: string;
  cases: Case[];
}

async function getAlgImages(algs: Algorithm[]) {
  return await pGenerateCubeBundle(
    algs.map(alg => algorithmToPuzzle(alg, true)),
    200,
    false,
    false,
    true
  );
}

export interface IModeCase {
  cases: Case[];
  groups: Group[];
}

async function getCasesAndImages(
  path: string,
  prefix = false,
  sortFnc?: (a: { name: string }, b: { name: string }) => number
) {
  const cases = (
    prefix
      ? (await get(dataService).algorithms.getAlgorithms({ all: true, path: "" })).filter(
          alg =>
            alg.parentPath?.startsWith(path) &&
            Array.isArray(alg.solutions) &&
            alg.solutions.length > 0
        )
      : await get(dataService).algorithms.getAlgorithms({
          path,
        })
  ).sort(sortFnc || nameCmp);

  const images = await getAlgImages(cases);

  return { cases, images };
}

export async function getModeCases(group: number, modeIndex: number): Promise<IModeCase> {
  if (group === 2) {
    // PLL
    if (modeIndex === 0) {
      const { cases: pllCases, images: pllImages } = await getCasesAndImages("333/pll");
      const cases = pllCases.map((cs, pos) => ({
        name: cs.name,
        img: pllImages[pos],
        pos,
      }));

      const groups = [
        ["edges-only", [16, 17, 8, 20]],
        ["corners-only", [0, 1, 2]],
        ["adjacent-corners", [9, 10, 13, 14, 3, 15]],
        ["diagonal-corners", [11, 12, 18, 19]],
        ["double-cycles", [4, 5, 6, 7]],
      ].map((e: any) => ({ name: e[0], cases: e[1].map((n: number) => cases[n]) }));

      return { cases, groups };
    }

    // OLL
    if (modeIndex === 1) {
      const { cases: ollCases, images: ollImages } = await getCasesAndImages("333/oll");
      const cases = ollCases.map((cs, pos) => ({
        name: cs.name,
        img: ollImages[pos],
        pos,
      }));

      const groups = [
        ["point", [0, 1, 2, 3, 16, 17, 18]],
        ["square", [4, 5]],
        ["small-lightning-ball", [6, 7, 10, 11]],
        ["big-lightning-ball", [38, 39]],
        ["fish", [8, 9, 34, 36]],
        ["knight", [12, 13, 14, 15]],
        ["edges-only", [19, 27, 56]],
        ["corners-only", [20, 21, 22, 23, 24, 25, 26]],
        ["awkward-shape", [28, 29, 40, 41]],
        ["P", [30, 31, 42, 43]],
        ["T", [32, 44]],
        ["C", [33, 45]],
        ["W", [35, 37]],
        ["L", [46, 47, 48, 49, 52, 53]],
        ["I", [50, 51, 54, 55]],
      ].map((e: any) => ({ name: e[0], cases: e[1].map((n: number) => cases[n]) }));

      return { cases, groups };
    }

    // Last Slot + LL
    if (modeIndex === 3) {
      const { cases: f2lCases, images: f2lImages } = await getCasesAndImages("333/f2l");
      const cases = f2lCases.map((cs, pos) => ({
        name: cs.name,
        img: f2lImages[pos],
        pos,
      }));

      const groups = [
        ["easy", [0, 1, 2, 3]],
        ["same-colors", [4, 5, 6, 7, 14, 15]],
        ["different-colors", [8, 9, 10, 11, 12, 13]],
        ["white-on-top", [16, 17, 18, 19, 20, 21, 22, 23]],
        ["corner-in-place", [24, 25, 26, 27, 28, 29]],
        ["edge-in-place", [30, 31, 32, 33, 34, 35]],
        ["unoriented", [36, 37, 38, 39, 40]],
      ].map((e: any) => ({ name: e[0], cases: e[1].map((n: number) => cases[n]) }));

      return { cases, groups };
    }

    // ZBLL
    if (modeIndex === 4) {
    }

    // COLL
    if (modeIndex === 5) {
      const { cases: collCases, images: collImages } = await getCasesAndImages("333/coll");
      const cases = collCases.map((cs, pos) => ({
        name: cs.name,
        img: collImages[pos],
        pos,
      }));

      const groups = [
        ["H", [6, 7, 8, 9]],
        ["L", [10, 11, 12, 13, 14, 15]],
        ["Pi", [16, 17, 18, 19, 20, 21]],
        ["S", [22, 23, 24, 25, 26, 27]],
        ["T", [28, 29, 30, 31, 32, 33]],
        ["U", [34, 35, 36, 37, 38, 39]],
        ["aS", [0, 1, 2, 3, 4, 5]],
      ].map((e: any) => ({ name: e[0], cases: e[1].map((n: number) => cases[n]) }));

      return { cases, groups };
    }

    // EOLS
    if (modeIndex === 11) {
    }

    // WVLS
    if (modeIndex === 12) {
      const { cases: wvlsCases, images: wvlsImages } = await getCasesAndImages("333/wv/wvls");

      const cases = wvlsCases.map((cs, pos) => ({
        name: cs.name,
        img: wvlsImages[pos],
        pos,
      }));

      const groups = [
        ["Oriented", [0]],
        ["Rectangle", [1, 2]],
        ["Tank", [3, 6]],
        ["Bowtie", [4, 5, 7, 8]],
        ["Snake", [9, 18]],
        ["Adjacent", [10, 11, 19, 20]],
        ["Gun", [12, 15, 21, 24]],
        ["Sune", [13, 26]],
        ["Pi", [14, 16, 23, 25]],
        ["H", [17, 22]],
      ].map((e: any) => ({ name: e[0], cases: e[1].map((n: number) => cases[n]) }));

      return { cases, groups };
    }

    // VLS
    if (modeIndex === 13) {
      const nameOrder = ["UB-", "UF-", "UF UB-", "UL-", "UB UL-", "UF UL-", "No Edge-"];
      const { cases: vlsCases, images: vlsImages } = await getCasesAndImages(
        "333/vls",
        true,
        (a, b) => {
          let pos1 = 0;
          let pos2 = 0;
          for (let i = 0, maxi = nameOrder.length; i < maxi; i += 1) {
            if (a.name.startsWith(nameOrder[i])) {
              pos1 = i;
              break;
            }
          }
          for (let i = 0, maxi = nameOrder.length; i < maxi; i += 1) {
            if (b.name.startsWith(nameOrder[i])) {
              pos2 = i;
              break;
            }
          }

          if (pos1 != pos2) return pos1 - pos2;
          return nameCmp(a, b);
        }
      );
      const { cases: wvlsCases, images: wvlsImages } = await getCasesAndImages("333/wv/wvls");

      const allCases = [...wvlsCases, ...vlsCases];
      const allImages = [...wvlsImages, ...vlsImages];

      const cases = allCases.map((cs, pos) => ({
        name: cs.name,
        img: allImages[pos],
        pos,
      }));

      const groups = [
        { name: "WVLS", cases: cases.filter(cs => cs.name.startsWith("WVLS-")) },
        { name: "UB", cases: cases.filter(cs => cs.name.startsWith("UB-")) },
        { name: "UF", cases: cases.filter(cs => cs.name.startsWith("UF-")) },
        { name: "UF UB", cases: cases.filter(cs => cs.name.startsWith("UF UB-")) },
        { name: "UL", cases: cases.filter(cs => cs.name.startsWith("UL-")) },
        { name: "UB UL", cases: cases.filter(cs => cs.name.startsWith("UB UL-")) },
        { name: "UF UL", cases: cases.filter(cs => cs.name.startsWith("UF UL-")) },
        { name: "No Edge", cases: cases.filter(cs => cs.name.startsWith("No Edge-")) },
      ];

      return { cases, groups };
    }

    // F2L
    if (modeIndex === 14) {
      const names = ["U", "R", "F", "D", "L", "B"];
      const baseColors = ["w", "r", "g", "y", "o", "b"];
      const scrambles = ["", "z", "x'", "z2", "z'", "x"];

      const images = await pGenerateCubeBundle(
        baseColors.map((c, pos) =>
          algorithmToPuzzle(
            {
              mode: CubeMode.CROSS,
              view: "plan",
              order: 3,
              scramble: scrambles[pos],
              baseColor: c,
            },
            false
          )
        )
      );

      return {
        cases: images.map((img, pos) => ({ img, name: names[pos], pos })),
        groups: [],
      };
    }
  }

  return {
    cases: [],
    groups: [],
  };
}
