# Statistics

Statistics are computed metrics derived from a session's solves. They are **not persisted** —
always recalculated at runtime.

---

## Metrics

### Singles

| Metric | Description |
|--------|-------------|
| best   | Best single time (finite only) |
| worst  | Worst single time (finite only) |
| count  | Total number of solves |
| time   | Total accumulated time (finite only) |
| avg    | Arithmetic mean (finite only) |
| dev    | Standard deviation (finite only) |

### Penalty Counts

| Metric | Description |
|--------|-------------|
| NP     | Count of solves with no penalty |
| P2     | Count of solves with +2 penalty |
| DNF    | Count of DNF solves |
| DNS    | Count of DNS solves |

### Averages

| Metric | Window size |
|--------|-------------|
| Mo3    | 3 (mean) |
| Ao5    | 5 |
| Ao12   | 12 |
| Ao50   | 50 |
| Ao100  | 100 |
| Ao200  | 200 |
| Ao500  | 500 |
| Ao1k   | 1000 |
| Ao2k   | 2000 |

---

## Metric Shape

Every metric has the same shape:

```ts
interface StatisticMetric {
  value: number;    // Current value
  better: boolean;  // Whether this is a new session best
  best: number;     // All-time best for this metric in the session
  prev: number;     // Previous value (before the improvement)
  id: string;       // Solve ID reference (last solve in the window for averages)
}
```

### Field semantics

- **value** — The current computed value. `null` or a sentinel when insufficient solves.
- **better** — `true` when `value` improves upon the previous `best` for this metric in the session.
- **best** — The best value seen for this metric across the entire session. Recalculated, not persisted.
- **prev** — The previous `best` before the improvement. Used to show "what record was broken" (before → after).
- **id** — For singles (best/worst): the solve's `_id`. For averages (best AoX): the `_id` of the last solve in the window.

---

## DNF and DNS Treatment

DNF and DNS are treated as **infinite time** (`Infinity`) in all calculations.

### Rules

| Context | DNF/DNS behavior |
|---------|-----------------|
| Truncated average (AoX) | Counts as worst possible time. Can be trimmed if it falls within the trim range. If more DNFs remain after trimming than can be absorbed, the entire average is DNF. |
| Mean (Mo3) | Any DNF/DNS in the window makes the mean DNF. |
| Global avg, dev, time | **Excluded.** Only finite times are used. |
| best (single) | **Excluded.** Only finite times compete. |
| worst (single) | **Excluded.** Only finite times compete. |
| best AoX | **Excluded.** DNF averages do not compete for best. |
| worst AoX | **Excluded.** DNF averages do not compete for worst. |
| Penalty counts (NP, P2, DNF, DNS) | Counted normally in their respective bucket. |

### Examples

**Ao5 with 1 DNF** — `[10.0, 12.0, DNF, 8.0, 11.0]`
- Sorted: `[8.0, 10.0, 11.0, 12.0, INF]`
- Trim 1 from each end: remove `8.0` and `INF`
- Result: `(10.0 + 11.0 + 12.0) / 3 = 11.00`

**Ao5 with 2 DNFs** — `[10.0, DNF, DNF, 8.0, 11.0]`
- Sorted: `[8.0, 10.0, 11.0, INF, INF]`
- Trim 1 from each end: remove `8.0` and `INF`
- Remaining: `[10.0, 11.0, INF]` — contains Infinity
- Result: **DNF**

---

## +2 Penalty

The stored `time` already includes the +2000ms penalty. No additional adjustment is needed
during calculation. The penalty source is stored separately to enforce editing rules (see `solves.md`).

---

## Truncated Average Algorithm

All AoX metrics use the same algorithm:

1. Take the last **N** solves (ordered by date, chronological).
2. If fewer than N solves exist, the metric is **N/A** (not calculable).
3. Calculate trim count: **`trim = ceil(N * 0.05)`**.
4. Sort the N times (DNF/DNS = Infinity).
5. Remove `trim` values from each end (lowest and highest).
6. If any remaining value is Infinity, the average is **DNF**.
7. Otherwise, compute the arithmetic mean of the remaining values.

### Trim table

| Average | N    | Trim (`ceil(N*0.05)`) | Averaged |
|---------|------|-----------------------|----------|
| Ao5     | 5    | 1                     | 3        |
| Ao12    | 12   | 1                     | 10       |
| Ao50    | 50   | 3                     | 44       |
| Ao100   | 100  | 5                     | 90       |
| Ao200   | 200  | 10                    | 180      |
| Ao500   | 500  | 25                    | 450      |
| Ao1k    | 1000 | 50                    | 900      |
| Ao2k    | 2000 | 100                   | 1800     |

---

## Mean of 3 (Mo3)

Mo3 is the arithmetic mean of the last 3 solves. **No trimming.**

- If fewer than 3 solves exist: **N/A**.
- If any of the 3 times is Infinity (DNF/DNS): **DNF**.
- Otherwise: `(t1 + t2 + t3) / 3`.

---

## Global Metrics

These are computed across **all solves in the session**:

| Metric | Formula | DNF/DNS handling |
|--------|---------|-----------------|
| best   | `min(finite times)` | Excluded |
| worst  | `max(finite times)` | Excluded |
| avg    | `sum(finite times) / count(finite times)` | Excluded |
| dev    | Standard deviation of finite times | Excluded |
| time   | `sum(finite times)` | Excluded |
| count  | Total solves including DNF/DNS | All counted |

If all solves are DNF/DNS, `best`, `worst`, `avg`, `dev`, and `time` are **N/A**.

---

## Best Tracking

The **best** value for each metric is tracked within the session:

- When a new solve is added, the **current** value of each metric is compared against its **best**.
- If the current value improves the best: `better = true`, `prev = old best`, `best = current value`.
- Best AoX is determined by comparing the current rolling AoX against the previous best — not by
  evaluating every possible historical window.
- DNF averages are excluded from best tracking (they cannot be a "best").

---

## Solve Order

All calculations use solves ordered by **date** (chronological). The "last N" solves
means the N most recent by timestamp.

---

## Recalculation Strategy

| Trigger | Strategy |
|---------|----------|
| SolveAdded | Incremental — only process the new solve |
| SolveUpdated | From the affected solve's position forward |
| SolvesRemoved | From scratch (reset to INITIAL_STATISTICS) |
| SessionSwitched | From scratch (new session, new solve set) |

---

## Multi-step Solves

Statistics are calculated on the **total time only**. Individual step times are stored
in `solve.steps` but are not used for statistical metrics.

---

## Insufficient Data

When there are not enough solves for a metric (e.g., 7 solves for Ao12):

- **value**: N/A (displayed as blank or "—" in the UI)
- **better**: `false`
- **best**: N/A
- The metric is skipped in all comparisons and best tracking
