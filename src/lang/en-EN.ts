import type { Language } from "@interfaces";

export const English: Language = {
  name: 'English',
  code: 'en-EN',
  global: {
    // Notification
    done: 'Done!',
    scrambleCopied: 'Scramble copied to clipboard',
    copiedToClipboard: 'Copied to clipboard',
  },
  NAVBAR: {
    home: 'Home',
    routeMap: (r: string) => {
      let mp: [RegExp, string][] = [
        [/pll-trainer/i, 'PLL Recognition'],
      ];

      for (let i = 0, maxi = mp.length; i < maxi; i += 1) {
        if ( mp[i][0].test( r ) ) {
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
    battle: 'Battle',
    pll_recognition: 'PLL Recognition',
    simulator: 'Puzzle Simulator',
    settings: 'Settings',
    importExport: 'Import / Export',
    contest: 'Contest',
  },
  SETTINGS: {
    title: 'Settings',
    language: 'Language',
    appFont: 'Application font',
    timerFont: 'Timer font',
    save: 'Save',
    reset: 'Reset',

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
    alreadyUpdatedText: 'You have the last version of CubeDB.',

    cancelAction: 'Cancel',
    updateAction: 'Update',

    updateError: 'Update error',
    updateErrorText: 'There was an error when trying to update.',

    updateCompleted: 'Update completed. Please restart to apply it.',
    updateFailed: 'Update failed. Please try later.',
  },
  ALGORITHMS: {
    algorithms: 'Algorithms',
    case: 'Case',
    moves: 'Moves',
    solution: 'Solution'
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

    cancel: 'Cancel',
    save: 'Save',

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

    delete: 'Delete',

    reloadScramble: 'Reload scramble',
    edit: 'Edit',
    useOldScramble: 'Use old scramble',
    copyScramble: 'Copy scramble',
    notes: 'Notes',
    settings: 'Settings',

    manageSessions: 'Manage sessions',
    selectSession: 'Select session',
    selectGroup: 'Select group',
    selectMode: 'Select mode',
    selectFilter: 'Select filter',
    addNewSession: 'Add session',

    // Sessions Tab
    deleteAll: 'Delete all',
    shareAo5: 'Share Ao5',
    shareAo12: 'Share Ao12',

    selectAll: 'Select All',
    selectInterval: 'Select Interval',
    invertSelection: 'Invert selection',

    comment: 'Comments...',
    noPenalty: 'No penalty',

    removeAllSolves: 'Do you want to remove all the solves?',
    select: 'Select',

    // Stats Tab
    totalTime: 'Total time',
    clean: 'Clean',
    solve: 'Solve',
    timeDistribution: 'Time distribution',
    timeChartLabels: [ 'Time', 'Ao5', 'A012', 'Ao50', 'AoX', 'Best', 'Trend' ],
    
    solves: 'Solves',
    hourDistribution: 'Hour distribution',
    weekDistribution: 'Week distribution',
    histogram: 'Histogram',

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
    cancel: 'Cancel',
    setPuzzle: 'Set puzzle',
  },
  IMPORT_EXPORT: {
    title: 'Import / Export',
    import: 'Import',
    export: 'Export',
    from: 'From',
    selectFile: 'Select file',
    selectAll: 'Select all',
    selectNone: 'Select none',
    save: 'Save',
    total: 'Total',
    showingOnly50: 'showing only 50',
  }
}