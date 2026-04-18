# Domain Model

This document defines the conceptual entities of CubicDB, their attributes, and relationships.
Each entity is described at the domain level — UI state and computed fields are excluded.

---

## Entities

### Puzzle

Represents a type of physical puzzle.

| Attribute   | Type       | Description                                                    |
| ----------- | ---------- | -------------------------------------------------------------- |
| type        | PuzzleType | Unique identifier. Some are families (NxN), others unique (Pandora) |

`PuzzleType` is the canonical identifier used across the app to determine which scrambler,
simulator renderer, and image generator to use.

**Derived from PuzzleType:**
- Scrambler selection
- Simulator 3D renderer
- Image generator
- Algorithm renderer

---

### CubeMode

Defines a color format or recognition pattern for a puzzle.

| Attribute | Type   | Description                                   |
| --------- | ------ | --------------------------------------------- |
| mode      | string | Identifier (e.g., "PLL", "OLL", "ZBLL", etc.) |

Used to configure how the puzzle is rendered visually — which stickers are shown,
which are grayed out, etc. Primarily relevant for algorithms and training.

---

### Session

A container for solves. Defines the scrambler configuration and rules for recording times.

| Attribute | Type            | Description                              |
| --------- | --------------- | ---------------------------------------- |
| _id       | string          | Unique identifier                        |
| name      | string          | User-given name                          |
| type      | SessionType     | "single", "multi-step", or "mixed"       |
| settings  | SessionSettings | Configuration for this session           |

**SessionType semantics:**
- **single** — One scrambler is configured at creation and never changes.
- **multi-step** — Like single, but also defines the number of steps and their names.
  Each solve records partial times per step.
- **mixed** — The scrambler can be changed freely. All solves share the same history
  regardless of which scrambler generated them.

#### SessionSettings

| Attribute          | Type             | Description                                     |
| ------------------ | ---------------- | ----------------------------------------------- |
| hasInspection      | boolean          | Whether WCA inspection is enabled                |
| inspection         | number           | Inspection time in seconds                       |
| showElapsedTime    | boolean          | Show running time while solving                  |
| calcAoX            | AverageSetting   | How averages are calculated (sequential / group) |
| genImage           | boolean          | Generate scramble image preview                  |
| scrambleAfterCancel| boolean          | Generate new scramble after a cancelled solve     |
| withoutPrevention  | boolean          | Skip the hold-to-start prevention phase          |
| recordCelebration  | boolean          | Trigger celebration on new personal best          |
| showBackFace       | boolean          | Show back face of the 3D cube (e.g., when using iCarry) |
| mode               | string           | Scrambler identifier (e.g., "333", "222")         |
| prob               | number | number[]| Scramble subtype parameter (cstimer)              |
| steps              | number           | Number of steps (multi-step only)                 |
| stepNames          | string[]         | Names per step (multi-step only)                  |

---

### Solve

A single recorded time.

| Attribute | Type             | Description                                        |
| --------- | ---------------- | -------------------------------------------------- |
| _id       | string           | Unique identifier                                  |
| time      | number           | Solve time in milliseconds                         |
| date      | number           | Timestamp of when the solve was recorded            |
| scramble  | string           | The scramble sequence used                          |
| penalty   | Penalty          | NONE, +2, DNF, or DNS                              |
| session   | string           | ID of the session this solve belongs to              |
| comments  | string?          | User notes. Can contain a reconstruction sequence   |
| mode      | string?          | Scrambler identifier (for scramble regeneration)    |
| len       | number?          | Scramble generation parameter (cstimer)              |
| prob      | number | number[]? | Scramble subtype parameter (cstimer)             |
| group     | number?          | Scramble group parameter (cstimer)                   |
| steps     | number[]?        | Partial times per step (multi-step solves only)      |

**Penalty enum:** `NONE (0)`, `P2 (1)`, `DNF (2)`, `DNS (3)`

**Note:** `mode`, `len`, `prob`, and `group` are stored to allow regenerating the exact
scramble type later. They originate from cstimer's scramble generation system.

**Reconstruction link:** If `comments` contains a valid reconstruction sequence,
the UI allows visualizing it in 3D. This is the only bridge between Solves
and the Reconstructions section.

---

### Algorithm

An algorithm within a hierarchical tree of methods.

| Attribute  | Type         | Description                                            |
| ---------- | ------------ | ------------------------------------------------------ |
| _id        | string       | Unique identifier                                      |
| name       | string       | Display name                                           |
| shortName  | string       | Short identifier                                       |
| order      | number       | Sort order within its parent                           |
| parentPath | string       | Path in the tree (e.g., "CFOP/OLL")                    |
| puzzle     | PuzzleType   | Which puzzle this algorithm belongs to                  |
| mode       | CubeMode     | Color/recognition format (e.g., "PLL", "OLL")          |
| scramble   | string       | Setup scramble to reach the case                        |
| solutions  | Solution[]?  | If present, this node is an algorithm. If absent, it is a method/folder |
| rotation   | Rotation?    | Puzzle rotation for display                             |
| baseColor  | string?      | Custom base color for rendering                         |
| tips       | number[]?    | Arrow indicators showing piece movement (e.g., PLL arrows) |
| view       | CubeView?    | View angle: "plan", "trans", "2d", "bird"               |
| cube       | string?      | Generated image representation                          |

**Tree structure:** The hierarchy works like files and folders.
- Nodes **with** `solutions` are **algorithms** (leaves).
- Nodes **without** `solutions` are **methods or sub-methods** (folders).
- `parentPath` defines the location in the tree (e.g., `"CFOP/OLL"`).

#### Solution

A single solution for an algorithm case.

| Attribute | Type     | Description                      |
| --------- | -------- | -------------------------------- |
| moves     | string   | The move sequence                |
| votes     | number?  | Community votes / user preference |

---

### Tutorial

An independent learning resource for a puzzle or concept.

| Attribute   | Type             | Description                                  |
| ----------- | ---------------- | -------------------------------------------- |
| _id         | string           | Unique identifier                            |
| name        | string           | Display name                                 |
| shortName   | string           | Short identifier                             |
| summary     | string           | Brief description                            |
| description | ITutorialStep    | Introductory content                         |
| lang        | LanguageCode     | Language ("EN", "ES", "ZH")                   |
| puzzle      | PuzzleType | "fundamentals" | Associated puzzle or general topic  |
| steps       | ITutorialStep[]  | Ordered lesson content                        |
| algs        | number           | Number of algorithms covered                  |
| level       | number           | Difficulty level                              |

Tutorials are **independent** from Algorithms. They do not reference algorithm entities.

---

### Reconstruction

A step-by-step breakdown of a solve, used for analysis and 3D playback.

| Attribute      | Type       | Description                               |
| -------------- | ---------- | ----------------------------------------- |
| _id            | string     | Unique identifier                         |
| title          | string     | User-given title                          |
| scramble       | string     | The scramble sequence                     |
| solution       | string     | The reconstruction move sequence           |
| puzzle         | PuzzleType | Puzzle configuration for rendering         |

Reconstructions are **standalone entities** — not linked to any Session or Solve.
The 3D video playback is generated at runtime from the scramble and solution.

**Note:** The current interface (`IDBReconstruction`) uses `num` instead of `puzzle`.
The ideal model should include the puzzle type for proper rendering.

---

### Contest

A competition structure for generating official-format scramble sheets.

| Attribute | Type          | Description                      |
| --------- | ------------- | -------------------------------- |
| _id       | string        | Unique identifier                |
| title     | string        | Contest name                     |
| events    | CubeEvent[]   | List of events in the contest     |

#### CubeEvent

| Attribute    | Type         | Description                    |
| ------------ | ------------ | ------------------------------ |
| name         | string       | Event name                     |
| contestants  | Contestant[] | Participants                   |

Contests exist primarily for **generating scramble sheets** for real or simulated
competitions. Not a core workflow of the app.

---

### Statistics

Computed metrics for a set of solves within a session. Not persisted as an entity —
calculated at runtime.

| Metric  | Description                               |
| ------- | ----------------------------------------- |
| best    | Best single time                          |
| worst   | Worst single time                         |
| avg     | Arithmetic mean                           |
| dev     | Standard deviation                        |
| count   | Total number of solves                    |
| time    | Total accumulated time                    |
| Mo3     | Mean of 3                                 |
| Ao5     | Average of 5 (drop best & worst)           |
| Ao12    | Average of 12                             |
| Ao50    | Average of 50                             |
| Ao100   | Average of 100                            |
| Ao200   | Average of 200                            |
| Ao500   | Average of 500                            |
| Ao1k    | Average of 1000                           |
| Ao2k    | Average of 2000                           |
| NP      | Count of solves with no penalty            |
| P2      | Count of solves with +2 penalty            |
| DNF     | Count of DNF solves                        |
| DNS     | Count of DNS solves                        |

Each metric has the shape:

| Field  | Type     | Description                                |
| ------ | -------- | ------------------------------------------ |
| value  | number   | Current value                              |
| better | boolean  | Whether this is a new best                  |
| best   | number?  | All-time best for this metric               |
| prev   | number?  | Previous value (for comparison)             |
| id     | string?  | Reference to the solve (for best/worst)      |

---

## Entity Relationships

```
Session 1──* Solve           A session contains many solves.
Solve *──1 Session           A solve belongs to exactly one session.

Algorithm *──1 PuzzleType    Every algorithm belongs to a puzzle type.
Algorithm *──1 CubeMode      Every algorithm has a color/recognition mode.
Algorithm 1──* Solution      An algorithm can have multiple solutions.

Tutorial *──1 PuzzleType     A tutorial is associated with a puzzle (or "fundamentals").

Reconstruction *──1 PuzzleType  A reconstruction targets a specific puzzle.

Contest 1──* CubeEvent       A contest has multiple events.
CubeEvent 1──* Contestant    An event has multiple contestants.

Statistics ←── Solve[]       Statistics are computed from a session's solves.
```

**Notable non-relationships:**
- Reconstructions are **not** linked to Solves or Sessions.
- Tutorials are **not** linked to Algorithms.
- Contests are **not** linked to Sessions.
- The only bridge between Solves and Reconstructions is a valid reconstruction
  sequence written in a Solve's `comments` field.

---

## Persistence Boundary

**Persisted (database):**
- Solve, Session (with settings), Algorithm (with solutions), Tutorial,
  Reconstruction, Contest

**Computed at runtime (not persisted):**
- Statistics, scramble images, 3D reconstruction playback, puzzle renderers

**UI-only state (not part of the domain model):**
- `Solve.selected` — selection state in history tab
- `Session.editing`, `Session.tName` — inline rename state
- `Session.icon` — visual representation derived from puzzle type
- `Algorithm._puzzle` — Puzzle instance for the edit modal
- `Algorithm.ready` — purpose unclear, likely UI/loading state
