# TODO
## General
- [-] Add competition sheet
- [ ] Add sparring session
- [ ] Add notification system for feedback
- [x] Check Tooltip position that can be affected by css transforms.
- [x] Fix plan view
- [x] Add scramble interpreter

## Contest
- [ ] Use grid layout for certain scrambles
- [ ] Add palette to Clock
- [x] Fix Megaminx color scheme

## Algorithms
- [ ] Practice for subsets
- [x] Basic migration

## Tutorials
- [x] Basic migration
- [ ] Practice for subsets
- [ ] Tutorial pro parser (AST and more)

## Timer
- [ ] Generate scramble batch in background (scramble pool?)
- [ ] Add manual time input
- [ ] Add smart cubes sync
- [ ] Pre-defined settings through URL or props
- [ ] Headless version for quick use
- [x] Hide elements when timer is in prevention or running
- [x] Add zoom and pan to chart
- [x] Cube image render on a worker
- [x] settings: Optional - Generate images for better performance
- [x] settings: Optional - Refresh scramble after cancelled solve
- [x] Add key bindings to options on selected solve
- [x] Add key bindings to delete all
- [x] Correct calculation of standard deviation in chart
- [x] Add key binding labels (Reload scramble \[S\])

## PLL-Recognition
- [x] Add key bindings

## Simulator
- [x] Scrambler
- [x] Improve UX
- [x] Add piece stabilization to handle error accumulation (Gear cube)

## Settings
- [ ] Tabs for dedicated settings

## Import-Export
- [ ] Create selector for sessions to import
- [ ] Add CubeDB
- [-] Add Cube Desk
- [x] Add Twisty Timer
- [x] Add CSTimer
- [x] Improve UX
- [x] Create adaptors for different apps
  * Every adaptor should have modes of input and output, depending on the modes of the app.
  * Adaptor input should get a string, validate it and parse according to a mode of input. The result should be CubeDB related data.
  * Adaptor output should get a CubeDB related data, validate it and parse according to a mode of output.

## Modelation
### Cuboids
- [ ] 1xNxM
- [ ] 2x2x(2k + 1), k = 1, 2, 3, ...

### Notes
- 1xNxM puzzles are just flat with 180deg turns only.
- 2x2x(2k + 1) does not shape shift and they have 180deg turns except for the 2x2 slices (90deg).
- 2x2x(2k) have a 2x2 core and every piece sticks to that core. That way it can shape shift but they are like a 2x2 with extended pieces.

## Database
- [ ] Add adaptors for NeDB, localStorage and browser DB.

## Statistics
- [x] AoX
- [x] Best time
- [x] Worst time
- [x] Average
- [x] Standard deviation
- [x] Count
- [x] Total time
- [x] Week time distribution
- [x] Hour time distribution
- [ ] Correlation between time and day
- [ ] Correlation between time and hour
- [ ] Probability Distribution (right skewed)
- [x] Penalties
  - [x] DNF's
  - [x] +2's
  - [x] DNS's

## Bugs
- [ ] Fix F2L 8
- [x] Wrong cube images due to intersection
- [x] Timer: Error on create session because of undefined variable