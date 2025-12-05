import type { SCRAMBLE_MENU } from "@constants";

export type LanguageCode = "EN" | "ES" | "ZH";

export interface Language {
  name: string;
  code: LanguageCode;
  global: {
    // Notification
    done: string;
    scrambleCopied: string;
    copiedToClipboard: string;
    accept: string;
    cancel: string;
    refresh: string;
    delete: string;
    deleteWarning: string;
    add: string;
    update: string;
    save: string;
    clear: string;
    reset: string;
    generate: string;
    restart: string;
    move: string;
    moves: string;
    name: string;
    steps: string;
    step: string;
    scramble: string;
    scrambles: string;
    search: string;
    toScramble: string;
    reconstruction: string;
    reconstructions: string;
    clickToCopy: string;
    settings: string;
    downloading: string;
    fullScreen: string;
    storage: string;
    images: string;
    videos: string;
    algorithms: string;
    session: string;
    sessions: string;
    solves: string;
    tutorials: string;
    connected: string;
    summary: string;
    time: string;
    copy: string;
    yes: string;
    no: string;
    saved: string;
    settingsSaved: string;
    willRestart: string;
    generatedByCubicDB: string;
    showBackFace: string;
    filter: string;
    date: string;
    invert: string;
    true: string;
    false: string;
    minimize: string;
    maximize: string;
    close: string;
    selectLanguage: string;
    next: string;
    back: string;
    start: string;
    download: string;
    copyCode: string;
    toGroup: string;
    toUngroup: string;
  };
  TUTORIALS: {
    easy: string;
    intermediate: string;
    advanced: string;
    empty: string;
    fundamentals: string;
  };
  NAVBAR: {
    home: string;
    routeMap: (route: string) => string[];
  };
  HOME: {
    tutorials: string;
    algorithms: string;
    timer: string;
    reconstructions: string;
    battle: string;
    training: string;
    simulator: string;
    settings: string;
    importExport: string;
    contest: string;
    tools: string;
    about: string;
    support: string;
    devices: string;
  };
  SETTINGS: {
    title: string;
    language: string;
    appFont: string;
    timerFont: string;
    screen: string;
    zoomFactor: string;

    // Updates
    update: string;
    version: string;
    checkUpdate: string;
    updateAvailable: string;
    updateAvailableText: string;
    alreadyUpdated: string;
    alreadyUpdatedText: string;
    needsUpdate: string;

    updateError: string;
    updateErrorText: string;

    updateCompleted: string;
    updateFailed: string;
  };
  ALGORITHMS: {
    solution: string;
    moves: string;
    case: string;
    algorithms: string;
    toggleView: string;
  };
  TIMER: {
    // TimerTab
    stackmatStatus: string;
    cross: string;
    nextAo5: string;
    best: string;
    worst: string;
    average: string;
    deviation: string;
    count: string;

    congrats: string;
    from: string;

    stats: {
      average: string;
      deviation: string;
      mo3: string;
      ao5: string;
    };

    // Stackmat
    stackmatAvailableHeader: string;
    stackmatAvailableText: string;
    connect: string;
    disconnect: string;

    scramble: string;
    time: string;

    inputMethod: string;
    device: string;
    syncSolved: string;
    inspection: string;
    showTime: string;
    genImage: string;
    canHurtPerformance: string;
    refreshScramble: string;
    aoxCalculation: string;
    sequential: string;
    groupOfX: string;
    withoutPrevention: string;
    withoutPreventionDescription: string;
    recordCelebration: string;
    sessionTypeMap: { [key: string]: string };
    sessionTypeDescription: { [key: string]: string };

    // Last solve tooltip
    comments: string;

    reloadScramble: string;
    edit: string;
    useOldScramble: string;
    copyScramble: string;
    notes: string;
    settings: string;

    // Tab accesibility
    timerTab: string;
    historyTab: string;
    statsTab: string;

    // Global Timer settings
    manageSessions: string;
    selectSession: string;
    selectGroup: string;
    selectMode: string;
    selectFilter: string;
    addNewSession: string;
    stepNames: string;

    // Sessions Tab
    deleteAll: string;
    shareAo5: string;
    shareAo12: string;

    selectAll: string;
    selectInterval: string;
    invertSelection: string;

    comment: string;
    noPenalty: string;

    removeAllSolves: string;
    removeSession: string;
    select: string;
    addFilter: string;
    addGroup: string;

    // Stats Tab
    totalTime: string;
    clean: string;
    solve: string;
    timeDistribution: string;
    timeChartLabels: string[];

    solves: string;
    hourDistribution: string;
    weekDistribution: string;
    histogram: string;
    days: string[];

    // Best section
    bestMarks: string;
    go: string;
    bestList: { title: string; key: string; select: number }[];
    stepsAverage: string;
    stepsPercent: string;

    // Modal
    modal: {
      "edit-scramble": string;
      "old-scrambles": string;
      settings: string;
    };
    // ['Ao5', 'Ao12', 'Ao50', 'Ao100', 'Ao200', 'Ao500', 'Ao1k', 'Ao2k' ]

    // Advanced Search Operators
    operators: Record<string, string>;
    gateResultIndicator: string[];

    // Case selector
    caseName: (caseCode: string) => string;
  };
  RECONSTRUCTIONS: {
    stepBack: string;
    playPause: string;
    stepForward: string;
    reconstructionProgress: string;
    title: string;
    scramble: string;
    reconstruction: string;
    puzzle: string;
    resetCamera: string;
    findReconstruction: string;
    return: string;
    speed: string;
  };
  PLL: {
    title: string;
    topFace: string;
    cases: string;
    next: string;
    completed: string;
    tryAgain: string;

    colorNeutral: string;
    white: string;
    yellow: string;
    red: string;
    orange: string;
    blue: string;
    green: string;

    case: string;
    expected: string;
    answer: string;
    time: string;

    // Modal
    keyBindings: string;
    singleLetter: string;
    singleLetterBlock: string;

    twoVariant: string;
    twoVariantBlock: string;

    gPerms: string;
    gPermsBlock: string;
  };
  SIMULATOR: {
    settings: string;

    puzzleSettings: string;
    puzzle: string;
    order: string;
    setPuzzle: string;
  };
  IMPORT_EXPORT: {
    title: string;
    import: string;
    export: string;
    from: string;
    selectFile: string;
    selectAll: string;
    selectNone: string;
    total: string;
    showingOnly50: string;
  };
  CUBICDB: {
    name: string;
    version: string;
    creator: string;
    donations: string;
    acknowledgements: string;
  };
  TOOLS: {
    cubicdbBatch: string;
    timerOnly: string;
    scrambleOnly: string;
    batchScramble: string;
    statistics: string;
    metrics: string;
    solver: string;
    mosaic: string;
    remoteTimer: string;
    portraitWarning: string;

    // Statistics
    writeYourTime: string;
    clickToDelete: string;

    // Metrics
    writeYourScramble: string;

    // Descriptions
    ETM: string;
    QTM: string;
    HTM: string;
    OBTM: string;
    STM: string;

    // Solver
    colors: string;
    solve: string;
    stickers: string;
    error: string;
    invalidCube: string;
    missingEdges: string;
    flippedEdge: string;
    missingCorners: string;
    twistedCornerClockwise: string;
    twistedCornerCounterclockwise: string;
    parity: string;
    solutionFound: string;
    solutionInstruction: string;

    // Mosaic
    widthInCubes: string;
    heightInCubes: string;
    cubeOrder: string;
    selectImage: string;
    generate: string;

    // Remote Timer
    clickToAuth: string;
  };
  MENU: SCRAMBLE_MENU[];
  CONTEST: {
    round: string;
    rounds: string;
    format: string;
    extraScrambles: string;
    addCategory: string;
    fmcRules: string[];
    faceMoves: string;
    rotations: string;
    competitor: string;
    doNotFillWarning: string;
    gradedBy: string;
    result: string;
    ccaID: string;
    registrantID: string;
    clockwise: string;
    counterClockwise: string;
    double: string;
  };
  DEVICES: {
    devices: string;
    addDevice: string;
    errors: {
      bluetoothDisabled: string;
    };
  };
}
