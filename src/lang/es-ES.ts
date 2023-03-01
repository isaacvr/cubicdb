import type { Language } from "@interfaces";

export const Spanish: Language = {
  name: 'Español',
  code: 'es-ES',
  global: {
    // Notification
    done: 'Hecho!',
    scrambleCopied: 'Mezcla copiada al portapapeles',
    copiedToClipboard: 'Copiado al portapapeles',
  },
  NAVBAR: {
    home: 'Inicio',
    routeMap: (r: string) => {
      let mp: [RegExp, string][] = [
        [/tutorials/i, 'Tutoriales'],
        [/algorithms/i, 'Algoritmos'],
        [/timer/i, 'Timer'],
        [/battle/i, 'Batalla'],
        [/pll-trainer/i, 'Reconocimiento PLL'],
        [/simulator/i, 'Simulador'],
        [/contest/i, 'Concursos'],
        [/import-export/i, 'Importar-Exportar'],
        [/settings/i, 'Configuración'],
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
    timer: 'Timer',
    battle: 'Batalla',
    pll_recognition: 'Reconocimiento PLL',
    simulator: 'Simulador',
    settings: 'Configuración',
    importExport: 'Importar / Exportar',
    contest: 'Concursos',
  },
  SETTINGS: {
    title: 'Configuración',
    language: 'Idioma',
    appFont: 'Fuente',
    timerFont: 'Fuente del timer',
    save: 'Guardar',
    reset: 'Reiniciar',

    // Notifications
    saved: 'Hecho!',
    settingsSaved: 'Configuración guardada',
  },
  ALGORITHMS: {
    algorithms: 'Algoritmos',
    case: 'Caso',
    moves: 'Movimientos',
    solution: 'Solución'
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

    cancel: 'Cancelar',
    save: 'Guardar',

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

    delete: 'Eliminar',

    reloadScramble: 'Nueva mezcla',
    edit: 'Editar',
    useOldScramble: 'Usar mezcla anterior',
    copyScramble: 'Copiar mezcla',
    notes: 'Notas',
    settings: 'Configuración',

    manageSessions: 'Administrar sesiones',
    selectSession: 'Elegir sesión',
    selectGroup: 'Elegir grupo',
    selectMode: 'Elegir modo',
    selectFilter: 'Elegir filtro',
    addNewSession: 'Crear sesión',

    // Sessions Tab
    deleteAll: 'Eliminar todos',
    shareAo5: 'Compartir Ao5',
    shareAo12: 'Compartir Ao12',

    selectAll: 'Seleccionar Todo',
    selectInterval: 'Seleccionar Intervalo',
    invertSelection: 'Invertir selección',

    comment: 'Comentarios...',
    noPenalty: 'Sin penalización',

    removeAllSolves: 'Deseas eliminar todos los tiempos?',
    select: 'Seleccionar',

    // Stats Tab
    totalTime: 'Tiempo total',
    clean: 'Limpios',
    solve: 'Resolución',
    timeDistribution: 'Distribución de tiempos',
    timeChartLabels: [ 'Tiempo', 'Ao5', 'A012', 'Ao50', 'AoX', 'Mejor', 'Tendencia' ],
    
    solves: 'Resoluciones',
    hourDistribution: 'Distribución por horas',
    weekDistribution: 'Distribución semanal',
    histogram: 'Histograma',
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
    cancel: 'Cancelar',
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
    save: 'Guardar',
    total: 'Total',
    showingOnly50: 'mostrando solo 50',
  }
}