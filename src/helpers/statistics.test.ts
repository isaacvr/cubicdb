import { expect, test } from "vitest";
import { getAverage, mean, median } from "./statistics";
import { AverageSetting } from "@interfaces";

// mean
test("mean function", () => {
  expect(mean([1, 2, 3, 4, 5])).toBe(3);
  expect(mean([2, 2, 3, 4, 4])).toBe(3);
  expect(mean([2, 2, 3, 2, 4])).toBe(2.6);
  expect(mean([1, 3])).toBe(2);
  expect(mean([1, 4])).toBe(2.5);
  expect(mean([1, 4, 1])).toBe(2);
  expect(mean([1, 6, -1])).toBe(2);
  expect(mean([])).toBe(0);
  expect(mean([0])).toBe(0);
});

// median
test("median function", () => {
  expect(median([1, 2, 3, 4, 5])).toBe(3);
  expect(median([2, 2, 3, 4, 4])).toBe(3);
  expect(median([2, 2, 3, 2, 4])).toBe(2);
  expect(median([1, 3])).toBe(2);
  expect(median([1, 4])).toBe(2.5);
  expect(median([1, 4, 1])).toBe(1);
  expect(median([1, 6, -1])).toBe(1);
  expect(median([])).toBe(0);
  expect(median([0])).toBe(0);
});

// getAverage
test("getAverage function", () => {
  expect(getAverage(5, [], AverageSetting.SEQUENTIAL)).toEqual([]);
  expect(getAverage(5, [10], AverageSetting.SEQUENTIAL)).toEqual([null]);
  expect(getAverage(5, [1, 2, 3, 4], AverageSetting.SEQUENTIAL)).toEqual([null, null, null, null]);
  expect(getAverage(5, [6, 5, 4, 5, 2], AverageSetting.SEQUENTIAL)).toEqual([
    null,
    null,
    null,
    null,
    0,
  ]);
  expect(getAverage(5, [60, 50, 10, 20, 40], AverageSetting.SEQUENTIAL)).toEqual([
    null,
    null,
    null,
    null,
    40,
  ]);
  expect(getAverage(5, [60, 50, 10, 30, 40, 50], AverageSetting.SEQUENTIAL)).toEqual([
    null,
    null,
    null,
    null,
    40,
    40,
  ]);
  expect(getAverage(5, [60, 50, 10, 30, 40, 50], AverageSetting.GROUP)).toEqual([
    null,
    null,
    null,
    null,
    40,
    null,
  ]);
  expect(getAverage(5, [60, 50, 10, 30, 40, 50, 60, 40, 10], AverageSetting.GROUP)).toEqual([
    null,
    null,
    null,
    null,
    40,
    null,
    null,
    null,
    null,
  ]);
  expect(getAverage(5, [60, 50, 10, 30, 40, 50, 60, 40, 10, 70], AverageSetting.GROUP)).toEqual([
    null,
    null,
    null,
    null,
    50,
    null,
    null,
    null,
    null,
    40,
  ]);
});
