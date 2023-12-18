import type { Language } from "@interfaces";

export const English: Language = {
  name: 'English',
  code: 'en-EN',
  global: {
    // Notification
    done: 'Done!',
    scrambleCopied: 'Scramble copied to clipboard',
    copiedToClipboard: 'Copied to clipboard',
    accept: 'Accept',
    cancel: 'Cancel',
    refresh: 'Refresh',
    delete: 'Delete',
    add: 'Add',
    update: 'Update',
    save: 'Save',
    clear: 'Clear',
    reset: 'Reset',
    generate: 'Generate',
    restartNow: 'Restart now',
    name: 'Name',
    steps: 'Steps',
    step: 'Step',
    scramble: 'Scramble',
    search: 'Search',
    toScramble: 'Scramble puzzle',
  },
  NAVBAR: {
    home: 'Home',
    routeMap: (r: string) => {
      let mp: [RegExp, string][] = [
        [/pll-trainer/i, 'PLL Recognition'],
      ];

      for (let i = 0, maxi = mp.length; i < maxi; i += 1) {
        if (mp[i][0].test(r)) {
          return mp[i][1];
        }
      }

      return r;
    }
  },
  HOME: {
    tutorials: 'Tutorials',
    algorithms: 'Algorithms',
    timer: 'Timer',
    reconstructions: 'Reconstructions',
    battle: 'Battle',
    pll_recognition: 'PLL Recognition',
    simulator: 'Puzzle Simulator',
    settings: 'Settings',
    importExport: 'Import / Export',
    contest: 'Contest',
    tools: 'Tools',
  },
  SETTINGS: {
    title: 'Settings',
    language: 'Language',
    appFont: 'Application font',
    timerFont: 'Timer font',
    screen: 'Screen',

    // Notifications
    saved: 'Saved',
    settingsSaved: 'Settings saved',

    // Update
    update: 'Update',
    version: 'Version',
    checkUpdate: 'Check for update',
    updateAvailable: 'Update available',
    updateAvailableText: 'There\'s a new version available.',
    alreadyUpdated: 'Already updated',
    alreadyUpdatedText: 'You have the latest version of CubeDB.',

    updateError: 'Update error',
    updateErrorText: 'There was an error when trying to update.',

    updateCompleted: 'Update completed. Please restart to apply it.',
    updateFailed: 'Update failed. Please try later.',
  },
  ALGORITHMS: {
    algorithms: 'Algorithms',
    case: 'Case',
    moves: 'Moves',
    solution: 'Solution',
    toggleView: 'Change view',
  },
  TIMER: {
    stackmatStatus: 'Timer Status',
    cross: 'Cross',
    nextAo5: 'Next Ao5',
    best: 'Best',
    worst: 'Worst',
    average: 'Average',
    deviation: 'Deviation',
    count: 'Count',

    congrats: 'Congratulations',
    from: 'from',

    // Stackmat
    stackmatAvailableHeader: 'Stackmat available',
    stackmatAvailableText: 'Do you want to connect?',
    connect: 'Connect',

    scramble: 'Scramble',
    time: 'Time',

    inputMethod: 'Input method',
    device: 'Device',
    inspection: 'Inspection',
    showTime: 'Show time when running',
    genImage: 'Generate images',
    canHurtPerformance: 'This can hurt performance on complex puzzles',
    refreshScramble: 'Refresh scramble after cancel',
    aoxCalculation: 'AoX calculation',
    sequential: 'Sequential',
    groupOfX: 'Group of X solves',
    withoutPrevention: 'Without prevention time',
    withoutPreventionDescription: 'How long Spacebar needs to be pressed',
    recordCelebration: 'Celebrate when a record is broken',
    sessionTypeMap: {
      "mixed": "Mixed",
      "single": "Single",
      "multi-step": "Multi-steps",
    },
    sessionTypeDescription: {
      "mixed": "Multiple scramblers in the same session (2x2, 3x3, ...)",
      "single": "Session for a single category",
      "multi-step": "Set up multiple steps for each solve",
    },

    // Last solve tooltip
    comments: 'Comments',

    reloadScramble: 'Reload scramble',
    edit: 'Edit',
    useOldScramble: 'Use old scramble',
    copyScramble: 'Copy scramble',
    notes: 'Notes',
    settings: 'Settings',

    // Tab accesibility
    timerTab: 'Timer tab',
    sessionsTab: 'Sessions tab',
    chartsTab: 'Charts tab',

    // Global Timer settings
    manageSessions: 'Manage sessions',
    selectSession: 'Select session',
    selectGroup: 'Select group',
    selectMode: 'Select mode',
    selectFilter: 'Select filter',
    addNewSession: 'Add session',
    stepNames: 'Step names',

    // Sessions Tab
    deleteAll: 'Delete all',
    shareAo5: 'Share Ao5',
    shareAo12: 'Share Ao12',

    selectAll: 'Select All',
    selectInterval: 'Select Interval',
    invertSelection: 'Invert selection',

    comment: 'Comments...',
    noPenalty: 'Clean',

    removeAllSolves: 'Do you want to remove all the solves?',
    removeSession: 'Do you want to delete this session?',
    select: 'Select',

    // Stats Tab
    totalTime: 'Total time',
    clean: 'Clean',
    solve: 'Solve',
    timeDistribution: 'Time distribution',
    timeChartLabels: ['Time', 'Ao5', 'A012', 'Ao50', 'AoX', 'Best', 'Trend'],

    solves: 'Solves',
    hourDistribution: 'Hour distribution',
    weekDistribution: 'Week distribution',
    histogram: 'Histogram',
    days: [ "Sun", "Mon", "Tue", "Wen", "Thu", "Fri", "Sat" ],
    stepsAverage: 'Steps average',
    stepsPercent: 'Steps percent',

    // Best section
    bestMarks: 'Best marks',
    go: 'Go',
    bestList: [
      { title: 'Best', key: 'best', select: 1 },
      { title: 'Worst', key: 'worst', select: 1 },
      { title: 'Best Ao5', key: 'Ao5', select: 5 },
      { title: 'Best Ao12', key: 'Ao12', select: 12 },
      { title: 'Best Ao50', key: 'Ao50', select: 1 },
      { title: 'Best Ao100', key: 'Ao100', select: 1 },
      { title: 'Best Ao200', key: 'Ao200', select: 1 },
      { title: 'Best Ao500', key: 'Ao500', select: 1 },
      { title: 'Best Ao1k', key: 'Ao1k', select: 1 },
      { title: 'Best Ao2k', key: 'Ao2k', select: 1 },
    ]
  },
  PLL: {
    title: 'PLL Recognition Trainer',
    topFace: 'Top face',
    cases: 'Cases',
    next: 'Next',
    completed: 'Completed',
    tryAgain: 'Try again',

    colorNeutral: 'Color neutral',
    white: 'White',
    yellow: 'Yellow',
    red: 'Red',
    orange: 'Orange',
    blue: 'Blue',
    green: 'Green',

    case: 'Case',
    expected: 'Expected',
    answer: 'Answer',
    time: 'Time',

    // // Modal
    keyBindings: 'Key bindings',
    singleLetter: 'Single letter PLL',
    singleLetterBlock: 'Just tap the letter to answer the quiz.',

    twoVariant: 'Two variants PLL',
    twoVariantBlock: "For PLL's like <mark>Ja</mark> and <mark>Jb</mark>, lowercase letter is the <mark>a</mark> variant <mark>(j is Ja)</mark> and capital letter is the <mark>b</mark> variant <mark>(J is Jb)</mark>.",

    gPerms: 'G perms',
    gPermsBlock: 'For the G Perms you can use the numbers <mark>1</mark> to <mark>4</mark> (Ga, Gb, Gc and Gd).',
  },
  SIMULATOR: {
    settings: 'Settings',

    puzzleSettings: 'Puzzle settings',
    puzzle: 'Puzzle',
    order: 'Order',
    setPuzzle: 'Set puzzle',
    showBackFace: 'Show back face',
  },
  IMPORT_EXPORT: {
    title: 'Import / Export',
    import: 'Import',
    export: 'Export',
    from: 'From',
    selectFile: 'Select file',
    selectAll: 'Select all',
    selectNone: 'Select none',
    total: 'Total',
    showingOnly50: 'showing only 50',
  },
  CUBEDB: {
    name: 'Name',
    version: 'Version',
    creator: 'Author',
    donations: 'Donate',
  },
  TOOLS: {
    cubedbBatch: 'CubeDB Scrambles',
    timerOnly: 'Timer Only',
    scrambleOnly: 'Scramble Only',
    batchScramble: 'Scramble Batch',
    statistics: 'Statistics',
    metrics: 'Metrics',
    solver: 'Solver 3x3',
    mosaic: 'Mosaic',

    // Statistics
    writeYourTime: 'Write your time here',
    clickToDelete: 'Click to delete',

    // Metrics
    writeYourScramble: 'Write your scramble here',

    // Descriptions
    ETM: 'ETM (Execution Turn Metric): In this metric, every movement of the outer layers, blocks or rotations, counts as 1 move.',
    QTM: 'QTM (Quarter Turn Metric): In this metric, every 90deg move of the outer layers, counts as 1 move. Double moves counts as 2.',
    HTM: 'HTM (Half Turn Metric): Every rotation of the outer layers by any angle, counts as 1 move. Middle layers counts as 2 moves.',
    OBTM: 'OBTM (Outer Block Turn Metric): Every rotation of the outer layers or blocks, counts as 1 move. Middle layers counts as 2 moves.',
    STM: 'STM (Slice Turn Metric): Every slice counts as 1 move.',

    // Solver
    colors: 'Colors',
    solve: 'Solve',
    stickers: 'Stickers',
    error: 'Error',
    invalidCube: 'Invalid cube.',
    missingEdges: 'There are some missing edges.',
    flippedEdge: 'There is a flipped edge.',
    missingCorners: 'There are some missing corners.',
    twistedCornerClockwise: 'There is a twisted corner clockwise.',
    twistedCornerCounterclockwise: 'There is a twisted corner counterclockwise.',
    parity: 'There is parity (two corners or edges swapped).',
    solutionFound: 'Solution found',
    solutionInstruction: 'With green center on the front and white center on top:',

    // Mosaic
    widthInCubes: "Width (in cubes)",
    heightInCubes: "Height (in cubes)",
    cubeOrder: "Cube order",
    generate: "Generate",
    selectImage: "Select image",
  },
  MENU: [
    [
      'WCA',
      [
        ['3x3x3', "333", 0, 30, [3]],
        ['2x2x2', "222so", 0, 30, [3]],
        ['4x4x4', "444wca", -40, 40, [4]],
        ['5x5x5', "555wca", -60, 48, [4]],
        ['6x6x6', "666wca", -80, 54, [6]],
        ['7x7x7', "777wca", -100, 60, [6]],
        ['3x3x3 BLD', "333ni", 0, 30, [3]],
        ['3x3x3 MBLD', "r3ni", 5, 30, [3]],
        ['3x3 FM', "333fm", 0, 30, [3]],
        ['3x3 OH', "333oh", 0, 30, [3]],
        ['Clock', "clkwca", 0, 30, [6]],
        ['Megaminx', "mgmp", -70, 55, [5]],
        ['Pyraminx', "pyrso", -10, 36, [3]],
        ['Skewb', "skbso", 0, 33, [3]],
        ['Sq-1', "sqrs", 0, 50, [8, 2]],
        ['4x4 BLD', "444bld", -40, 40, [4]],
        ['5x5 BLD', "555bld", -60, 48, [4]],
      ]
    ],
    [
      '3x3x3',
      [
        ["WCA", "333", 0],
        ['Random Move', "333o", 25],
        ['3x3 for noobs', "333noob", 25],
        ['Edges only', "edges", 0],
        ['Corners only', "corners", 0],
        // ['BLD Helper', "nocache_333bldspec", 0], // new
        ['3x3 FT', "333ft", 0],
        ['Custom', "333custom", 0],
        ['2-generator R,U', "2gen", 25],
        ['2-generator L,U', "2genl", 25],
        ['Roux-generator M,U', "roux", 25],
        ['3-generator F,R,U', "3gen_F", 25],
        ['3-generator R,U,L', "3gen_L", 25],
        ['3-generator R,r,U', "RrU", 25],
        ['Half turns', "half", 25],
        ['Last slot + LL (old)', "lsll", 15]
      ]
    ],
    [
      '3x3x3 CFOP',
      [
        ['PLL', "pll", 0],
        ['OLL', "oll", 0],
        ['Last Layer (LL)', "ll", 0],
        ['Last slot + LL', "lsll2", 0],
        ['ZBLL', "zbll", 0],
        ['COLL', "coll", 0],
        ['CLL', "cll", 0],
        ['ELL', "ell", 0],
        ['2GLL', "2gll", 0],
        ['ZZLL', "zzll", 0],
        ['ZBLS', "zbls", 0],
        ['EOLS', "eols", 0],
        ['WVLS', "wvls", 0],
        ['VLS', "vls", 0],
        ['F2L', "f2l", 0],
        ['EOLine', "eoline", 0],
        ['Easy Cross', "easyc", 3],
        ['Easy XCross', "easyxc", 4], // new
      ]
    ],
    [
      '3x3x3 Roux', [
        ['2nd Block', "sbrx", 0],
        ['CMLL', "cmll", 0],
        ['LSE', "lse", 0],
        ['LSE <M, U>', "lsemu", 0]
      ]
    ],
    [
      '3x3x3 Mehta', [
        ['3QB', "mt3qb", 0],
        ['EOLE', "mteole", 0],
        ['TDR', "mttdr", 0],
        ['6CP', "mt6cp", 0],
        ['CDRLL', "mtcdrll", 0],
        ['L5EP', "mtl5ep", 0],
        ['TTLL', "ttll", 0]
      ]
    ],
    [
      '2x2x2',
      [
        ["WCA", "222so", 0],
        ['Optimal', "222o", 0],
        ['3-gen', "2223", 25],
        ['EG', "222eg", 0],
        ['CLL', "222eg0", 0],
        ['EG1', "222eg1", 0],
        ['EG2', "222eg2", 0],
        ['TCLL+', "222tcp", 0],
        ['TCLL-', "222tcn", 0],
        ['LS', "222lsall", 0],
        ['No Bar', "222nb", 0],
      ]
    ],
    [
      '4x4x4',
      [
        ["WCA", "444wca", -40],
        ['Random State', "444m", 40],
        ['SiGN', "444", 40],
        ['YJ', "444yj", 40],
        ['Edges', "4edge", 8],
        ['R,r,U,u', "RrUu", 40]
      ]
    ],
    [
      '5x5x5',
      [
        ["WCA", "555wca", 60],
        ['SiGN', "555", 60],
        ['Edges', "5edge", 8]
      ]
    ],
    [
      '6x6x6',
      [
        ["WCA", "666wca", 80],
        ['SiGN', "666si", 80],
        ['Prefix', "666p", 80],
        ['Suffix', "666s", 80],
        ['Edges', "6edge", 8]
      ]
    ],
    [
      '7x7x7',
      [
        ["WCA", "777wca", 100],
        ['SiGN', "777si", 100],
        ['Prefix', "777p", 100],
        ['Suffix', "777s", 100],
        ['Edges', "7edge", 8]
      ]
    ],
    [
      'Clock',
      [
        ['WCA', "clkwca", 0],
        ['JAAP', "clk", 0],
        ['Optimal', "clko", 0],
        ['Conciso', "clkc", 0],
        ['Efficient Pin Order', "clke", 0]
      ]
    ],
    [
      'Kilominx',
      [
        ['Random State', "klmso", 0],
        ['Pochmann', "klmp", 30],
      ]
    ],
    [
      'Megaminx',
      [
        ["WCA", "mgmp", 70],
        ['Carrot', "mgmc", 70],
        ['Old Style', "mgmo", 70],
        ['2-generator R,U', "minx2g", 30],
        ['Last Layer (LL)', "mgmll", 0],
        ['Last Slot + LL', "mlsll", 0],
        ['PLL', "mgmpll", 0],
      ]
    ],
    [
      'Gigaminx',
      [
        ['Pochmann', "giga", 300]
      ]
    ],
    [
      'Pyraminx',
      [
        ["WCA", "pyrso", 10],
        ['Optimal', "pyro", 0],
        ['Random Move', "pyrm", 25],
        ['L4E', "pyrl4e", 0],
        ['4 tips', "pyr4c", 0],
        ['No bar', "pyrnb", 0]
      ]
    ],
    [
      'Skewb',
      [
        ["WCA", "skbso", 0],
        ['Optimal', "skbo", 0],
        ['Random Move', "skb", 25],
        ['No bar', "skbnb", 0]
      ]
    ],
    [
      'Square-1',
      [
        ["WCA", "sqrs", 0],
        ["CSP", "sqrcsp", 0],
        ['Face Turn Metric', "sq1h", 40],
        ['Twist Metric', "sq1t", 20]
      ]
    ],
    [
      'LxMxN',
      [
        ['1x3x3 (Floppy Cube)', "133", 0],
        ['2x2x3 (Tower Cube)', "223", 0],
        ['2x3x3 (Domino)', "233", 25],
        ['3x3x4', "334", 40],
        ['3x3x5', "335", 25],
        ['3x3x6', "336", 40],
        ['3x3x7', "337", 40],
        ['8x8x8', "888", 120],
        ['9x9x9', "999", 120],
        ['10x10x10', "101010", 120],
        ['11x11x11', "111111", 120],
        ['NxNxN', "cubennn", 12]
      ]
    ],
    [
      'Gear Cube',
      [
        ['Random State', "gearso", 0],
        ['Optimal', "gearo", 0],
        ['Random Move', "gear", 10]
      ]
    ],
    [
      'Helicopter Cube',
      [
        ['Random', "heli", 40]
      ]
    ],
    [
      'Redi Cube',
      [
        ['MoYu', "redim", 8],
        ['old', "redi", 20]
      ]
    ],
    [
      'Ivy cube',
      [
        ['Random State', "ivyso", 0],
        ['Optimal', "ivyo", 0],
        ['Random Move', "ivy", 10]
      ]
    ],
    [
      'Master Pyraminx',
      [
        ['Random', "mpyr", 42]
      ]
    ],
    [
      'Pyraminx Crystal',
      [
        ['Pochmann', "prcp", 70],
        ['Old Style', "prco", 70]
      ]
    ],
    [
      'Siamese Cube',
      [
        ['1x1x3', "sia113", 25],
        ['1x2x3', "sia123", 25],
        ['2x2x2', "sia222", 25]
      ]
    ],
    [
      'Square-2',
      [
        ['Random', "sq2", 20]
      ]
    ],
    [
      'Super Floppy',
      [
        ['Random', "sfl", 25]
      ]
    ],
    [
      'Super Square-1',
      [
        ['Twist Metric', "ssq1t", 20]
      ]
    ],
    [
      'UFO',
      [
        ['Jaap Style', "ufo", 25]
      ]
    ],
    [
      'Bandaged Cube',
      [
        ['Bicube', "bic", 30],
        ['Square-1 /,(1,0)', "bsq", 25]
      ]
    ],
    [
      'Relays',
      [
        ['Lots of 3x3x3s', "r3", 5],
        ['234 Relay', "r234", 0],
        ['2345 Relay', "r2345", 0],
        ['23456 Relay', "r23456", 0],
        ['234567 Relay', "r234567", 0],
        ['234 Relay (WCA)', "r234w", 0],
        ['2345 Relay (WCA)', "r2345w", 0],
        ['23456 Relay (WCA)', "r23456w", 0],
        ['234567 Relay (WCA)', "r234567w", 0]
      ]
    ],
    [
      'Other',
      [
        ['FTO (Face-Turning Octahedron)', "fto", 25]
      ]
    ],
  ]
}