import type { Language } from "@interfaces";

export const Spanish: Language = {
  name: 'Español',
  code: 'es-ES',
  global: {
    // Notification
    done: 'Hecho!',
    scrambleCopied: 'Mezcla copiada al portapapeles',
    copiedToClipboard: 'Copiado al portapapeles',
    accept: 'Aceptar',
    cancel: 'Cancelar',
    refresh: 'Refrescar',
    delete: 'Eliminar',
    add: 'Añadir',
    update: 'Actualizar',
    save: 'Guardar',
    clear: 'Limpiar',
    reset: 'Reiniciar',
    generate: 'Generar',
    restartNow: 'Reiniciar ahora',
    name: 'Nombre',
    steps: 'Pasos',
    step: 'Paso',
  },
  NAVBAR: {
    home: 'Inicio',
    routeMap: (r: string) => {
      let mp: [RegExp, string][] = [
        [/tutorials/i, 'Tutoriales'],
        [/algorithms/i, 'Algoritmos'],
        [/timer/i, 'Temporizador'],
        [/battle/i, 'Batalla'],
        [/pll-trainer/i, 'Reconocimiento PLL'],
        [/simulator/i, 'Simulador'],
        [/contest/i, 'Concursos'],
        [/import-export/i, 'Importar-Exportar'],
        [/settings/i, 'Configuración'],
        [/tools/i, 'Herramientas'],
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
    tutorials: 'Tutoriales',
    algorithms: 'Algoritmos',
    timer: 'Temporizador',
    battle: 'Batalla',
    pll_recognition: 'Reconocimiento PLL',
    simulator: 'Simulador',
    settings: 'Configuración',
    importExport: 'Importar / Exportar',
    contest: 'Concursos',
    tools: 'Herramientas',
  },
  SETTINGS: {
    title: 'Configuración',
    language: 'Idioma',
    appFont: 'Fuente',
    timerFont: 'Fuente del timer',
    screen: 'Pantalla',

    // Notifications
    saved: 'Hecho!',
    settingsSaved: 'Configuración guardada',

    // Update
    update: 'Actualización',
    version: 'Versión',
    checkUpdate: 'Buscar actualización',
    updateAvailable: 'Actualización disponible',
    updateAvailableText: 'Hay una nueva versión disponible.',
    alreadyUpdated: 'Actualizado',
    alreadyUpdatedText: 'Ya tienes la última versión de CubeDB.',

    updateError: 'Error',
    updateErrorText: 'Hubo un error al intentar actualizar.',

    updateCompleted: 'Actualización completada. Reinicie para aplicar los cambios.',
    updateFailed: 'Actualización fallida. Por favor, inténtelo más tarde.',
  },
  ALGORITHMS: {
    algorithms: 'Algoritmos',
    case: 'Caso',
    moves: 'Movimientos',
    solution: 'Solución',
    toggleView: 'Cambiar vista',
  },
  TIMER: {
    stackmatStatus: 'Estado del timer',
    cross: 'Cruz',
    nextAo5: 'Próximo Ao5',
    best: 'Mejor',
    worst: 'Peor',
    average: 'Promedio',
    deviation: 'Desviación',
    count: 'Total',

    congrats: 'Felicitaciones',
    from: 'desde',
    
    // Stackmat
    stackmatAvailableHeader: 'Stackmat disponible',
    stackmatAvailableText: '¿Desea conectarlo?',
    connect: 'Conectar',

    scramble: 'Mezcla',
    time: 'Tiempo',

    inputMethod: 'Método de entrada',
    device: 'Dispositivo',
    inspection: 'Inspección',
    showTime: 'Mostrar tiempo durante la marcha',
    genImage: 'Generar imágenes',
    canHurtPerformance: 'Esto puede afectar el rendimiento en puzzles complejos',
    refreshScramble: 'Refrescar mezcla luego de cancelar',
    aoxCalculation: 'Cálculo del AoX',
    sequential: 'Secuencial',
    groupOfX: 'En grupos de X solves',
    withoutPrevention: 'Sin tiempo de prevención',
    withoutPreventionDescription: 'Tiempo que debe mantener la tecla Espacio presionada',
    recordCelebration: 'Celebrar cuando se rompe un record',
    sessionTypeMap: {
      "mixed": "Mixta",
      "single": "Simple",
      "multi-step": "Multi-pasos",
    },
    sessionTypeDescription: {
      "mixed": "Múltiples mezcladores en la misma sesión (2x2, 3x3, ...)",
      "single": "Sesión de una sola categoría",
      "multi-step": "Establezca múltiples pasos para cada resolución",
    },

    // Last solve tooltip
    comments: 'Comentarios',

    reloadScramble: 'Nueva mezcla',
    edit: 'Editar',
    useOldScramble: 'Usar mezcla anterior',
    copyScramble: 'Copiar mezcla',
    notes: 'Notas',
    settings: 'Configuración',

    // Tab accesibility
    timerTab: 'Temporizador',
    sessionsTab: 'Sesiones',
    chartsTab: 'Gráficos',

    // Global Timer settings
    manageSessions: 'Administrar sesiones',
    selectSession: 'Elegir sesión',
    selectGroup: 'Elegir grupo',
    selectMode: 'Elegir modo',
    selectFilter: 'Elegir filtro',
    addNewSession: 'Crear sesión',
    stepNames: 'Nombre de los pasos',

    // Sessions Tab
    deleteAll: 'Eliminar todos',
    shareAo5: 'Compartir Ao5',
    shareAo12: 'Compartir Ao12',

    selectAll: 'Seleccionar Todo',
    selectInterval: 'Seleccionar Intervalo',
    invertSelection: 'Invertir selección',

    comment: 'Comentarios...',
    noPenalty: 'Limpio',

    removeAllSolves: '¿Deseas eliminar todos los tiempos?',
    removeSession: '¿Desea eliminar esta sesión?',
    select: 'Seleccionar',

    // Stats Tab
    totalTime: 'Tiempo total',
    clean: 'Limpios',
    solve: 'Resolución',
    timeDistribution: 'Distribución de tiempos',
    timeChartLabels: [ 'Tiempo', 'Ao5', 'A012', 'Ao50', 'AoX', 'Mejor', 'Tendencia' ],
    
    solves: 'Tiempos',
    hourDistribution: 'Distribución por horas',
    weekDistribution: 'Distribución semanal',
    histogram: 'Histograma',
    days: [ "Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab" ],

    // Best section
    bestMarks: 'Mejores marcas',
    go: 'Ir',
    bestList: [
      { title: 'Mejor', key: 'best', select: 1 },
      { title: 'Peor', key: 'worst', select: 1 },
      { title: 'Mejor Ao5', key: 'Ao5', select: 5 },
      { title: 'Mejor Ao12', key: 'Ao12', select: 12 },
      { title: 'Mejor Ao50', key: 'Ao50', select: 1 },
      { title: 'Mejor Ao100', key: 'Ao100', select: 1 },
      { title: 'Mejor Ao200', key: 'Ao200', select: 1 },
      { title: 'Mejor Ao500', key: 'Ao500', select: 1 },
      { title: 'Mejor Ao1k', key: 'Ao1k', select: 1 },
      { title: 'Mejor Ao2k', key: 'Ao2k', select: 1 },
    ]
  },
  PLL: {
    title: 'Reconocimiento de PLL',
    topFace: 'Capa superior',
    cases: 'Casos',
    next: 'Siguiente',
    completed: 'Completados',
    tryAgain: 'Reiniciar',
    
    colorNeutral: 'Neutral',
    white: 'Blanca',
    yellow: 'Amarilla',
    red: 'Roja',
    orange: 'Naranja',
    blue: 'Azul',
    green: 'Verde',

    case: 'Caso',
    expected: 'Esperado',
    answer: 'Respuesta',
    time: 'Tiempo',

    // // Modal
    keyBindings: 'Atajos de teclado',
    singleLetter: 'PLL de una sola letra',
    singleLetterBlock: 'Solo toca la letra correspondiente al nombre para contestar.',

    twoVariant: 'PLL de dos variantes',
    twoVariantBlock: "Para PLL's como <mark>Ja</mark> y <mark>Jb</mark>, la letra en minúscila es la variante <mark>a</mark> <mark>(j is Ja)</mark> y la letra en mayúsculas es la variante <mark>b</mark> <mark>(J is Jb)</mark>.",

    gPerms: 'Permutación G',
    gPermsBlock: 'Para las permutaciones G, puedes usar los números del <mark>1</mark> al <mark>4</mark> (Ga, Gb, Gc y Gd).',
  },
  SIMULATOR: {
    settings: 'Configuración',

    puzzleSettings: 'Configurar puzzle',
    puzzle: 'Puzzle',
    order: 'Orden',
    setPuzzle: 'Establecer',
  },
  IMPORT_EXPORT: {
    title: 'Importar / Exportar',
    import: 'Importar',
    export: 'Exportar',
    from: 'Desde',
    selectFile: 'Abrir',
    selectAll: 'Elegir todas',
    selectNone: 'Elegir ninguna',
    total: 'Total',
    showingOnly50: 'mostrando solo 50',
  },
  CUBEDB: {
    name: 'Nombre',
    version: 'Versión',
    creator: 'Creador',
    donations: 'Donaciones',
  },
  TOOLS: {
    cubedbBatch: 'CubeDB Scrambles',
    timerOnly: 'Solo Temporizador',
    scrambleOnly: 'Solo Scrambles',
    batchScramble: 'Grupos de Scrambles',
    statistics: 'Estadísticas',
    metrics: 'Métricas',
    solver: 'Solucionador 3x3',

    // Statistics
    writeYourTime: 'Escribe tu tiempo aquí',
    clickToDelete: 'Click para eliminar',
    
    // Metrics
    writeYourScramble: 'Escribe la mezcla aquí',

    // Descriptions
    ETM: 'ETM (Execution Turn Metric): En esta métrica, cada movimiento de las capas externas, bloques o rotaciones, cuentan como 1 movimiento.',
    QTM: 'QTM (Quarter Turn Metric): En esta métrica, cada movimiento de 90 grados de las capas externas, cuentan como 1 movimiento. Los movimientos dobles cuentan como 2.',
    HTM: 'HTM (Half Turn Metric): Cada rotación de las capas externas en cualquier ángulo, cuenta como 1 movimiento. Los movimientos de las capas internas cuentan como 2.',
    OBTM: 'OBTM (Outer Block Turn Metric): Cada rotación de las capas externas o bloques, cuentan como 1 movimiento. Las capas internas cuentan como 2 movimientos.',
    STM: 'STM (Slice Turn Metric): Cada capa, interna o externa, cuenta como 1 movimiento.',

    // Solver
    colors: 'Colores',
    solve: 'Resolver',
    stickers: 'Pegatinas',
    error: 'Error',
    invalidCube: 'Cubo no válido.',
    missingEdges: 'Faltan algunas aristas.',
    flippedEdge: 'Hay una arista girada.',
    missingCorners: 'Faltan algunas esquinas.',
    twistedCornerClockwise: 'Hay una esquina girada en sentido horario.',
    twistedCornerCounterclockwise: 'Hay una esquina girada en sentido antihorario.',
    parity: 'Hay paridad (Dos esquinas o dos aristsa intercambiadas).',
    solutionFound: 'Solución encontrada',
    solutionInstruction: 'Con el centro verde al frente y el blanco arriba:',
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
        ['Aleatorio', "333o", 25],
        ['3x3 para nuevos', "333noob", 25],
        ['Solo aristas', "edges", 0],
        ['Solo Esquinas', "corners", 0],
        // ['Asistente BLD', "nocache_333bldspec", 0], // new
        ['3x3 FT', "333ft", 0],
        ['Personalizado', "333custom", 0],
        ['2-gen R,U', "2gen", 25],
        ['2-gen L,U', "2genl", 25],
        ['Roux-gen M,U', "roux", 25],
        ['3-gen F,R,U', "3gen_F", 25],
        ['3-gen R,U,L', "3gen_L", 25],
        ['3-gen R,r,U', "RrU", 25],
        ['Giros dobles', "half", 25],
        ['Último Par + LL (old)', "lsll", 15]
      ]
    ],
    [
      '3x3x3 CFOP',
      [
        ['PLL', "pll", 0],
        ['OLL', "oll", 0],
        ['Última Capa (LL)', "ll", 0],
        ['Último Par + LL', "lsll2", 0],
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
        ['Cruz fácil', "easyc", 3],
        ['XCross fácil', "easyxc", 4], // new
      ]
    ],
    [
      '3x3x3 Roux', [
        ['2do Bloque', "sbrx", 0],
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
        ['Óptimo', "222o", 0],
        ['3-gen', "2223", 25],
        ['EG', "222eg", 0],
        ['CLL', "222eg0", 0],
        ['EG1', "222eg1", 0],
        ['EG2', "222eg2", 0],
        ['TCLL+', "222tcp", 0],
        ['TCLL-', "222tcn", 0],
        ['LS', "222lsall", 0],
        ['Sin barras', "222nb", 0],
      ]
    ],
    [
      '4x4x4',
      [
        ["WCA", "444wca", -40],
        ['Aleatorio', "444m", 40],
        ['SiGN', "444", 40],
        ['YJ', "444yj", 40],
        ['Aristas', "4edge", 8],
        ['R,r,U,u', "RrUu", 40]
      ]
    ],
    [
      '5x5x5',
      [
        ["WCA", "555wca", 60],
        ['SiGN', "555", 60],
        ['Aristas', "5edge", 8]
      ]
    ],
    [
      '6x6x6',
      [
        ["WCA", "666wca", 80],
        ['SiGN', "666si", 80],
        ['Prefijo', "666p", 80],
        ['Sufijo', "666s", 80],
        ['Aristas', "6edge", 8]
      ]
    ],
    [
      '7x7x7',
      [
        ["WCA", "777wca", 100],
        ['SiGN', "777si", 100],
        ['Prefijo', "777p", 100],
        ['Sufijo', "777s", 100],
        ['Aristas', "7edge", 8]
      ]
    ],
    [
      'Clock',
      [
        ['WCA', "clkwca", 0],
        ['JAAP', "clk", 0],
        ['Óptimo', "clko", 0],
        ['Conciso', "clkc", 0],
        ['Orden de pin eficiente', "clke", 0]
      ]
    ],
    [
      'Kilominx',
      [
        ['Aleatorio', "klmso", 0],
        ['Pochmann', "klmp", 30],
      ]
    ],
    [
      'Megaminx',
      [
        ["WCA", "mgmp", 70],
        ['Carrot', "mgmc", 70],
        ['Old Style', "mgmo", 70],
        ['2-gen R,U', "minx2g", 30],
        ['Última Capa (LL)', "mgmll", 0],
        ['Último Par + LL', "mlsll", 0],
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
        ['Óptimo', "pyro", 0],
        ['Aleatorio', "pyrm", 25],
        ['L4E', "pyrl4e", 0],
        ['4 tips', "pyr4c", 0],
        ['No bar', "pyrnb", 0]
      ]
    ],
    [
      'Skewb',
      [
        ["WCA", "skbso", 0],
        ['Óptimo', "skbo", 0],
        ['Aleatorio', "skb", 25],
        ['No bar', "skbnb", 0]
      ]
    ],
    [
      'Square-1',
      [
        ["WCA", "sqrs", 0],
        ["CSP", "sqrcsp", 0],
        ['Métrica de giro de cara', "sq1h", 40],
        ['Métrica de giro', "sq1t", 20]
      ]
    ],
    [
      'LxMxN',
      [
        ['1x3x3 (Cubo Floppy)', "133", 0],
        ['2x2x3 (Torre)', "223", 0],
        ['2x3x3 (Dominó)', "233", 25],
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
      'Gear',
      [
        ['Estado aleatorio', "gearso", 0],
        ['Óptimo', "gearo", 0],
        ['Movimiento aleatorio', "gear", 10]
      ]
    ],
    [
      'Helicopter',
      [
        ['Aleatorio', "heli", 40]
      ]
    ],
    [
      'Redi',
      [
        ['MoYu', "redim", 8],
        ['Viejo', "redi", 20]
      ]
    ],
    [
      'Ivy',
      [
        ['Estado Aleatorio', "ivyso", 0],
        ['Óptimo', "ivyo", 0],
        ['Movimiento Aleatorio', "ivy", 10]
      ]
    ],
    [
      'Master Pyraminx',
      [
        ['Aleatorio', "mpyr", 42]
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
      'Siamese',
      [
        ['1x1x3', "sia113", 25],
        ['1x2x3', "sia123", 25],
        ['2x2x2', "sia222", 25]
      ]
    ],
    [
      'Square-2',
      [
        ['Aleatorio', "sq2", 20]
      ]
    ],
    [
      'Super Floppy',
      [
        ['Aleatorio', "sfl", 25]
      ]
    ],
    [
      'Super Square-1',
      [
        ['Métrica de giro', "ssq1t", 20]
      ]
    ],
    [
      'UFO',
      [
        ['Estilo Jaap', "ufo", 25]
      ]
    ],
    [
      'Bandaged',
      [
        ['Bicube', "bic", 30],
        ['Square-1 /,(1,0)', "bsq", 25]
      ]
    ],
    [
      'Relajación',
      [
        ['Varios 3x3x3s', "r3", 5],
        ['234 (WCA)', "r234w", 0],
        ['2345 (WCA)', "r2345w", 0],
        ['23456 (WCA)', "r23456w", 0],
        ['234567 (WCA)', "r234567w", 0],
        ['234', "r234", 0],
        ['2345', "r2345", 0],
        ['23456', "r23456", 0],
        ['234567', "r234567", 0],
      ]
    ],
    [
      'Otros',
      [
        ['FTO (Face-Turning Octahedron)', "fto", 25]
      ]
    ],
  ]
}