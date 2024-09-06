import { expect, test } from "vitest";
import { map, evalLine, evalLineMN, between, isBetween } from "./math";

// map
test("map function", () => {
  expect(map(1, 1, 2, 3, 4)).toBe(3);
  expect(map(0, 1, 2, 3, 4)).toBe(2);
  expect(map(3, 1, 5, 3, 4)).toBe(3.5);
  expect(map(4, 5, 1, 3, 4)).toBe(3.25);
});

// evalLine
test("evalLine function", () => {
  expect(evalLine(1, 0, 0, 2, 2)).toBe(1);
  expect(evalLine(3, 0, 0, 2, 2)).toBe(3);
  expect(evalLine(1, 0, 1, 2, 1)).toBe(1);
  expect(evalLine(3, 0, 1, 2, 0)).toBe(-0.5);
  expect(evalLine(-2, 0, 1, 2, 0)).toBe(2);
});

// evalLineMN
test("evalLineMN function", () => {
  expect(evalLineMN(1, 2, 3)).toBe(5);
  expect(evalLineMN(3, 2, 0)).toBe(6);
  expect(evalLineMN(1, 2, -2)).toBe(0);
  expect(evalLineMN(3, -1, 4)).toBe(1);
  expect(evalLineMN(-2, 0, 2)).toBe(2);
});

// between
test("between function", () => {
  expect(between(1, 2, 3)).toBe(2);
  expect(between(3, 2, 0)).toBe(2);
  expect(between(1, 2, -2)).toBe(1);
  expect(between(3, -1, 4)).toBe(3);
  expect(between(-2, 0, 2)).toBe(0);
  expect(between(0, 0, 2)).toBe(0);
});

// isBetween
test("isBetween function", () => {
  expect(isBetween(1, 2, 3)).toBe(false);
  expect(isBetween(3, 2, 0)).toBe(false);
  expect(isBetween(1, 2, -2)).toBe(true);
  expect(isBetween(3, -1, 4)).toBe(true);
  expect(isBetween(-2, 0, 2)).toBe(false);
  expect(isBetween(0, 0, 2)).toBe(true);

  expect(isBetween(1, 2, 3, false)).toBe(false);
  expect(isBetween(3, 2, 0, false)).toBe(false);
  expect(isBetween(1, 2, -2, false)).toBe(true);
  expect(isBetween(3, -1, 4, false)).toBe(true);
  expect(isBetween(2, 0, 2, false)).toBe(false);
  expect(isBetween(0, 0, 2, false)).toBe(false);
});