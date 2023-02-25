
## DONE
### General
- [x] Add competition sheet
- [x] Add sparring session
- [x] Check Tooltip position that can be affected by css transforms.
- [x] Fix plan view
- [x] Add scramble interpreter
- [x] Add HTTPS for dev
- [x] Add notification system for feedback
- [x] Improve Select element for better UX


### Contest
- [x] Use grid layout for certain scrambles
- [x] Add palette to Clock
- [x] Fix Megaminx color scheme

### Algorithms
- [x] Basic migration

### Tutorials
- [x] Basic migration

### Timer
- [x] Check DELETE action in SessionTab
- [x] Detect puzzle correctly from last solve 
- [x] Handle stackmat 
- [x] Headless version for quick use
- [x] Add manual time input
- [x] Hide elements when timer is in prevention or running
- [x] Add zoom and pan to chart
- [x] Cube image render on a worker
- [x] settings: Optional - Generate images for better performance
- [x] settings: Optional - Refresh scramble after cancelled solve
- [x] Add key bindings to options on selected solve
- [x] Add key bindings to delete all
- [x] Correct calculation of standard deviation in chart
- [x] Add key binding labels (Reload scramble \[S\])

### PLL-Recognition
- [x] Add key bindings

### Simulator
- [x] Scrambler
- [x] Improve UX
- [x] Add piece stabilization to handle error accumulation (Gear cube)

### Settings

### Battle
- [x] Disconnect socket on exit

### Import-Export
- [x] Create selector for sessions to import
- [x] Add Cube Desk
- [x] Add Twisty Timer
- [x] Add CSTimer
- [x] Improve UX
- [x] Create adaptors for different apps
  * Every adaptor should have modes of input and output, depending on the modes of the app.
  * Adaptor input should get a string, validate it and parse according to a mode of input. The result should be CubeDB related data.
  * Adaptor output should get a CubeDB related data, validate it and parse according to a mode of output.

### Statistics
- [x] AoX
- [x] Best time
- [x] Worst time
- [x] Average
- [x] Standard deviation
- [x] Count
- [x] Total time
- [x] Week time distribution
- [x] Hour time distribution
- [x] Probability Distribution (right skewed)
- [x] Penalties
  - [x] DNF's
  - [x] +2's
  - [x] DNS's

### Bugs
- [x] Wrong cube images due to intersection
- [x] Timer: Error on create session because of undefined variable
- [x] New session input does not work