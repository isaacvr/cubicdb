import { expect, test } from "vitest";
import { adjustMillis, formatHour, infinitePenalty, sTime, sTimer, timer, timerToMilli } from "./timer";
import { Penalty, type Solve } from "@interfaces";

// timer
test("timer function", () => {
  expect(timer(1410, false, false)).toBe("1");
  expect(timer(16640, false, false)).toBe("16");
  expect(timer(62000, false, false)).toBe("1:02");
  expect(timer(0, false, false)).toBe("0");

  expect(timer(1410, true, false)).toBe("1.41");
  expect(timer(16640, true, false)).toBe("16.64");
  expect(timer(62000, true, false)).toBe("1:02.00");
  expect(timer(0, true, false)).toBe("0.00");

  expect(timer(1410, false, true)).toBe("1s");
  expect(timer(16640, false, true)).toBe("16s");
  expect(timer(62000, false, true)).toBe("1:02m");
  expect(timer(0, false, true)).toBe("0s");

  expect(timer(1410, true, true)).toBe("1.41s");
  expect(timer(16640, true, true)).toBe("16.64s");
  expect(timer(62000, true, true)).toBe("1:02.00m");
  expect(timer(0, true, true)).toBe("0.00s");

  expect(timer(Infinity, false, false)).toBe("DNF");
  expect(timer(Infinity, false, true)).toBe("DNF");
  expect(timer(Infinity, true, false)).toBe("DNF");
  expect(timer(Infinity, true, true)).toBe("DNF");

  expect(timer(-Infinity, false, false)).toBe("DNF");
  expect(timer(-Infinity, false, true)).toBe("DNF");
  expect(timer(-Infinity, true, false)).toBe("DNF");
  expect(timer(-Infinity, true, true)).toBe("DNF");

  expect(timer(NaN, false, false)).toBe("0");
  expect(timer(NaN, false, true)).toBe("0s");
  expect(timer(NaN, true, false)).toBe("0.00");
  expect(timer(NaN, true, true)).toBe("0.00s");

  expect(timer(+"tomate", false, false)).toBe("0");
  expect(timer(+"tomate", false, true)).toBe("0s");
  expect(timer(+"tomate", true, false)).toBe("0.00");
  expect(timer(+"tomate", true, true)).toBe("0.00s");
});

function createSolve(time: number, penalty: Penalty): Solve {
  return { date: 0, penalty, scramble: "", selected: false, session: "", time };
}

// sTimer
test("sTimer function", () => {
  expect(sTimer(createSolve(1410, Penalty.NONE), false, false)).toBe("1");
  expect(sTimer(createSolve(16640, Penalty.NONE), false, false)).toBe("16");
  expect(sTimer(createSolve(62000, Penalty.NONE), false, false)).toBe("1:02");
  expect(sTimer(createSolve(0, Penalty.NONE), false, false)).toBe("0");
  expect(sTimer(createSolve(8127420, Penalty.NONE), false, false)).toBe("2h 15:27");
  
  expect(sTimer(createSolve(1410, Penalty.P2), false, false)).toBe("1+");
  expect(sTimer(createSolve(16640, Penalty.P2), false, false)).toBe("16+");
  expect(sTimer(createSolve(62000, Penalty.P2), false, false)).toBe("1:02+");
  expect(sTimer(createSolve(0, Penalty.P2), false, false)).toBe("0+");
  expect(sTimer(createSolve(8127420, Penalty.P2), false, false)).toBe("2h 15:27+");
  
  expect(sTimer(createSolve(1410, Penalty.DNF), false, false)).toBe("DNF");
  expect(sTimer(createSolve(16640, Penalty.DNF), false, false)).toBe("DNF");
  expect(sTimer(createSolve(62000, Penalty.DNF), false, false)).toBe("DNF");
  expect(sTimer(createSolve(0, Penalty.DNF), false, false)).toBe("DNF");
  expect(sTimer(createSolve(8127420, Penalty.DNF), false, false)).toBe("DNF");
  
  expect(sTimer(createSolve(1410, Penalty.DNS), false, false)).toBe("DNS");
  expect(sTimer(createSolve(16640, Penalty.DNS), false, false)).toBe("DNS");
  expect(sTimer(createSolve(62000, Penalty.DNS), false, false)).toBe("DNS");
  expect(sTimer(createSolve(0, Penalty.DNS), false, false)).toBe("DNS");
  expect(sTimer(createSolve(8127420, Penalty.DNS), false, false)).toBe("DNS");
  
  // ---
  expect(sTimer(createSolve(1410, Penalty.NONE), true, false)).toBe("1.41");
  expect(sTimer(createSolve(16640, Penalty.NONE), true, false)).toBe("16.64");
  expect(sTimer(createSolve(62000, Penalty.NONE), true, false)).toBe("1:02.00");
  expect(sTimer(createSolve(0, Penalty.NONE), true, false)).toBe("0.00");
  expect(sTimer(createSolve(8127420, Penalty.NONE), true, false)).toBe("2h 15:27.42");
  
  expect(sTimer(createSolve(1410, Penalty.P2), true, false)).toBe("1.41+");
  expect(sTimer(createSolve(16640, Penalty.P2), true, false)).toBe("16.64+");
  expect(sTimer(createSolve(62000, Penalty.P2), true, false)).toBe("1:02.00+");
  expect(sTimer(createSolve(0, Penalty.P2), true, false)).toBe("0.00+");
  expect(sTimer(createSolve(8127420, Penalty.P2), true, false)).toBe("2h 15:27.42+");
  
  expect(sTimer(createSolve(1410, Penalty.DNF), true, false)).toBe("DNF");
  expect(sTimer(createSolve(16640, Penalty.DNF), true, false)).toBe("DNF");
  expect(sTimer(createSolve(62000, Penalty.DNF), true, false)).toBe("DNF");
  expect(sTimer(createSolve(0, Penalty.DNF), true, false)).toBe("DNF");
  expect(sTimer(createSolve(8127420, Penalty.DNF), true, false)).toBe("DNF");
  
  expect(sTimer(createSolve(1410, Penalty.DNS), true, false)).toBe("DNS");
  expect(sTimer(createSolve(16640, Penalty.DNS), true, false)).toBe("DNS");
  expect(sTimer(createSolve(62000, Penalty.DNS), true, false)).toBe("DNS");
  expect(sTimer(createSolve(0, Penalty.DNS), true, false)).toBe("DNS");
  expect(sTimer(createSolve(8127420, Penalty.DNS), true, false)).toBe("DNS");

  // ---
  expect(sTimer(createSolve(1410, Penalty.NONE), false, true)).toBe("1s");
  expect(sTimer(createSolve(16640, Penalty.NONE), false, true)).toBe("16s");
  expect(sTimer(createSolve(62000, Penalty.NONE), false, true)).toBe("1:02m");
  expect(sTimer(createSolve(0, Penalty.NONE), false, true)).toBe("0s");
  expect(sTimer(createSolve(8127420, Penalty.NONE), false, true)).toBe("2h 15:27");
  
  expect(sTimer(createSolve(1410, Penalty.P2), false, true)).toBe("1s+");
  expect(sTimer(createSolve(16640, Penalty.P2), false, true)).toBe("16s+");
  expect(sTimer(createSolve(62000, Penalty.P2), false, true)).toBe("1:02m+");
  expect(sTimer(createSolve(0, Penalty.P2), false, true)).toBe("0s+");
  expect(sTimer(createSolve(8127420, Penalty.P2), false, true)).toBe("2h 15:27+");
  
  expect(sTimer(createSolve(1410, Penalty.DNF), false, true)).toBe("DNF");
  expect(sTimer(createSolve(16640, Penalty.DNF), false, true)).toBe("DNF");
  expect(sTimer(createSolve(62000, Penalty.DNF), false, true)).toBe("DNF");
  expect(sTimer(createSolve(0, Penalty.DNF), false, true)).toBe("DNF");
  expect(sTimer(createSolve(8127420, Penalty.DNF), false, true)).toBe("DNF");
  
  expect(sTimer(createSolve(1410, Penalty.DNS), false, true)).toBe("DNS");
  expect(sTimer(createSolve(16640, Penalty.DNS), false, true)).toBe("DNS");
  expect(sTimer(createSolve(62000, Penalty.DNS), false, true)).toBe("DNS");
  expect(sTimer(createSolve(0, Penalty.DNS), false, true)).toBe("DNS");
  expect(sTimer(createSolve(8127420, Penalty.DNS), false, true)).toBe("DNS");

  // ---
  expect(sTimer(createSolve(1410, Penalty.NONE), true, true)).toBe("1.41s");
  expect(sTimer(createSolve(16640, Penalty.NONE), true, true)).toBe("16.64s");
  expect(sTimer(createSolve(62000, Penalty.NONE), true, true)).toBe("1:02.00m");
  expect(sTimer(createSolve(0, Penalty.NONE), true, true)).toBe("0.00s");
  expect(sTimer(createSolve(8127420, Penalty.NONE), true, true)).toBe("2h 15:27.42");
  
  expect(sTimer(createSolve(1410, Penalty.P2), true, true)).toBe("1.41s+");
  expect(sTimer(createSolve(16640, Penalty.P2), true, true)).toBe("16.64s+");
  expect(sTimer(createSolve(62000, Penalty.P2), true, true)).toBe("1:02.00m+");
  expect(sTimer(createSolve(0, Penalty.P2), true, true)).toBe("0.00s+");
  expect(sTimer(createSolve(8127420, Penalty.P2), true, true)).toBe("2h 15:27.42+");
  
  expect(sTimer(createSolve(1410, Penalty.DNF), true, true)).toBe("DNF");
  expect(sTimer(createSolve(16640, Penalty.DNF), true, true)).toBe("DNF");
  expect(sTimer(createSolve(62000, Penalty.DNF), true, true)).toBe("DNF");
  expect(sTimer(createSolve(0, Penalty.DNF), true, true)).toBe("DNF");
  expect(sTimer(createSolve(8127420, Penalty.DNF), true, true)).toBe("DNF");
  
  expect(sTimer(createSolve(1410, Penalty.DNS), true, true)).toBe("DNS");
  expect(sTimer(createSolve(16640, Penalty.DNS), true, true)).toBe("DNS");
  expect(sTimer(createSolve(62000, Penalty.DNS), true, true)).toBe("DNS");
  expect(sTimer(createSolve(0, Penalty.DNS), true, true)).toBe("DNS");
  expect(sTimer(createSolve(8127420, Penalty.DNS), true, true)).toBe("DNS");
});

// sTime
test("sTime function", () => {
  expect(sTime(createSolve(0, Penalty.NONE))).toBe(0);
  expect(sTime(createSolve(10, Penalty.NONE))).toBe(10);
  expect(sTime(createSolve(13, Penalty.NONE))).toBe(10);
  expect(sTime(createSolve(16, Penalty.NONE))).toBe(10);
  expect(sTime(createSolve(19.98, Penalty.NONE))).toBe(10);
  expect(sTime(createSolve(1425, Penalty.NONE))).toBe(1420);
  
  expect(sTime(createSolve(0, Penalty.P2))).toBe(2000);
  expect(sTime(createSolve(10, Penalty.P2))).toBe(2010);
  expect(sTime(createSolve(13, Penalty.P2))).toBe(2010);
  expect(sTime(createSolve(16, Penalty.P2))).toBe(2010);
  expect(sTime(createSolve(19.98, Penalty.P2))).toBe(2010);
  expect(sTime(createSolve(1425, Penalty.P2))).toBe(3420);
  
  expect(sTime(createSolve(0, Penalty.DNS))).toBe(Infinity);
  expect(sTime(createSolve(10, Penalty.DNS))).toBe(Infinity);
  expect(sTime(createSolve(13, Penalty.DNS))).toBe(Infinity);
  expect(sTime(createSolve(16, Penalty.DNS))).toBe(Infinity);
  expect(sTime(createSolve(19.98, Penalty.DNS))).toBe(Infinity);
  expect(sTime(createSolve(1425, Penalty.DNS))).toBe(Infinity);
  
  expect(sTime(createSolve(0, Penalty.DNF))).toBe(Infinity);
  expect(sTime(createSolve(10, Penalty.DNF))).toBe(Infinity);
  expect(sTime(createSolve(13, Penalty.DNF))).toBe(Infinity);
  expect(sTime(createSolve(16, Penalty.DNF))).toBe(Infinity);
  expect(sTime(createSolve(19.98, Penalty.DNF))).toBe(Infinity);
  expect(sTime(createSolve(1425, Penalty.DNF))).toBe(Infinity);

  expect(sTime(null)).toBe(0);
});

// infinitePenalty
test("infinitePenalty function", () => {
  expect(infinitePenalty(createSolve(100000, Penalty.NONE))).toBeFalsy();
  expect(infinitePenalty(createSolve(100000, Penalty.P2))).toBeFalsy();
  expect(infinitePenalty(createSolve(100000, Penalty.DNS))).toBeTruthy();
  expect(infinitePenalty(createSolve(100000, Penalty.DNF))).toBeTruthy();
});

// timerToMilli
test("timerToMilli function", () => {
  expect(timerToMilli(0)).toBe(0); // 0s
  expect(timerToMilli(10)).toBe(100); // 10s
  expect(timerToMilli(1_04)).toBe(1040); // 1.04s
  expect(timerToMilli(1_45_23)).toBe(105230); // 1:45.23m
  expect(timerToMilli(3_20_14_26)).toBe(12014260); // 3h 20:14.26
});

// adjustMillis
test("adjustMillis function", () => {
  expect(adjustMillis(1450, false)).toBe(1450);
  expect(adjustMillis(1454, false)).toBe(1450);
  expect(adjustMillis(1459, false)).toBe(1450);
  expect(adjustMillis(14, false)).toBe(10);
  expect(adjustMillis(17, false)).toBe(10);
  
  expect(adjustMillis(1450, true)).toBe(1450);
  expect(adjustMillis(1454, true)).toBe(1450);
  expect(adjustMillis(1459, true)).toBe(1460);
  expect(adjustMillis(14, true)).toBe(10);
  expect(adjustMillis(17, true)).toBe(20);
});

// formatHour
test("formatHour function", () => {
  expect(formatHour(0)).toBe("12am");
  expect(formatHour(2)).toBe("2am");
  expect(formatHour(10)).toBe("10am");
  expect(formatHour(12)).toBe("12pm");
  expect(formatHour(23)).toBe("11pm");
});