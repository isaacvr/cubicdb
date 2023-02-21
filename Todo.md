# TODO
## General
- [ ] Add notification system for feedback
- [ ] Improve Select element for better UX
- [ ] Auto-detect stackmat
- [ ] Add support for official stackmat
- [ ] Test stackmat on mobile

## Contest

## Algorithms
- [ ] Practice for subsets

## Tutorials
- [ ] Practice for subsets
- [ ] Tutorial pro parser (AST and more)

## Timer
- [ ] Generate scramble batch in background (scramble pool?)
- [ ] Add smart cubes sync
- [ ] Pre-defined settings through URL or props
- [ ] Add mark to keyboard bindings for better contrast
- [ ] Add contextual menu to solves
- [ ] Check the timer state for every input method

## PLL-Recognition

## Simulator

## Settings
- [ ] Tabs for dedicated settings

## Battle
- [ ] Keyboard stops on DNF
- [ ] Implement reconnections
- [ ] Disconnect socket on exit

## Import-Export
- [ ] Add CubeDB

## Modelation
### Cuboids
- [ ] 1xNxM
- [ ] 2x2x(2k + 1), k = 1, 2, 3, ...

### Notes
- 1xNxM puzzles are just flat with 180deg turns only.
- 2x2x(2k + 1) does not shape shift and they have 180deg turns except for the 2x2 slices (90deg).
- 2x2x(2k) have a 2x2 core and every piece sticks to that core. That way it can shape shift but they are like a 2x2 with extended pieces.

## Database
- [ ] Add adaptors for NeDB, localStorage and IndexedDB.

## Statistics
- [ ] Correlation between time and day
- [ ] Correlation between time and hour

## Bugs
- [ ] Fix F2L 8
- [x] Wrong cube images due to intersection
- [x] Timer: Error on create session because of undefined variable