import type { Language } from "@interfaces";

export const Chinese: Language = {
  name: "英文",
  code: "ZH",
  global: {
    // Notification
    done: "完成",
    scrambleCopied: "打乱复制到剪贴板",
    copiedToClipboard: "复制到剪贴板",
    accept: "接受",
    cancel: "取消",
    refresh: "刷新",
    delete: "删除",
    add: "添加",
    update: "更新",
    save: "保存",
    clear: "清除",
    reset: "重置",
    generate: "生成",
    restart: "重新启动",
    move: "移动",
    moves: "移动",
    name: "名称",
    steps: "步骤",
    step: "步骤",
    scramble: "打乱",
    search: "搜索",
    toScramble: "打乱谜题",
    reconstruction: "重建",
    clickToCopy: "点击复制",
    settings: "设置",
    downloading: "下载中",
    fullScreen: "全屏",
    storage: "存储",
    images: "图片",
    videos: "视频",
    algorithms: "算法",
    session: "会话",
    sessions: "会话",
    solves: "解答",
    tutorials: "教程",
    connected: "已连接",
    summary: "总结",
    time: "时间",
    copy: "复制",
    yes: "是",
    no: "否",
    saved: "已保存",
    settingsSaved: "设置已保存",
    willRestart: "CubeDB 将在几秒钟内自动重新启动.",
    generatedByCubeDB: "由 CubeDB 生成",
    showBackFace: "显示背面",
  },
  TUTORIALS: {
    easy: "简单",
    intermediate: "中级",
    advanced: "高级",
    start: "开始",
    empty: "还没有教程.",
    fundamentals: "基础",
  },
  NAVBAR: {
    home: "主页",
    routeMap: (r: string) => {
      let mp: [RegExp, string][] = [
        [/tutorials/i, "教程"],
        [/algorithms/i, "算法"],
        [/timer/i, "计时器"],
        [/battle/i, "战斗"],
        [/pll-trainer/i, "PLL 识别"],
        [/simulator/i, "模拟器"],
        [/contest/i, "比赛"],
        [/import-export/i, "导入-导出"],
        [/settings/i, "设置"],
        [/tools/i, "工具"],
        [/reconstructions/i, "重建"],
      ];

      for (let i = 0, maxi = mp.length; i < maxi; i += 1) {
        if (mp[i][0].test(r)) {
          return mp[i][1];
        }
      }

      return r;
    },
  },
  HOME: {
    tutorials: "教程",
    algorithms: "算法",
    timer: "计时器",
    reconstructions: "重建",
    battle: "战斗",
    pll_recognition: "PLL 识别",
    simulator: "拼图模拟器",
    settings: "设置",
    importExport: "导入 / 导出",
    contest: "比赛",
    tools: "工具",
    about: "关于 CubeDB",
  },
  SETTINGS: {
    title: "设置",
    language: "语言",
    appFont: "通用字体",
    timerFont: "计时器字体",
    screen: "屏幕",
    zoomFactor: "缩放系数",
    deleteStorage: '你确定要删除 "$1" 吗?',

    // Update
    update: "更新",
    version: "版本",
    checkUpdate: "检查更新",
    updateAvailable: "有更新可用",
    updateAvailableText: "有一个新的 $1 版本可用.",
    alreadyUpdated: "已是最新版本",
    alreadyUpdatedText: "你已经拥有最新的 $1 版本.",
    needsUpdate: "有一个新的 $1 版本, 但你需要至少 $2 版本的 CubeDB. 请更新到最新版本的 CubeDB.",

    updateError: "更新错误",
    updateErrorText: "尝试更新时出错.",

    updateCompleted: "更新完成. 请重新启动以应用它.",
    updateFailed: "更新失败. 请稍后再试.",
  },
  ALGORITHMS: {
    algorithms: "算法",
    case: "情况",
    moves: "移动",
    solution: "解法",
    toggleView: "切换视图",
  },
  TIMER: {
    stackmatStatus: "计时器状态",
    cross: "十字",
    nextAo5: "下一个Ao5",
    best: "最佳",
    worst: "最差",
    average: "平均",
    deviation: "偏差",
    count: "计数",

    congrats: "恭喜",
    from: "来自",

    stats: {
      average: "平均值 (算术平均值) 是所有时间的总和除以时间的数量.",
      deviation: "标准偏差是显示值与平均值相距多远的值. 如果时间稳定, 偏差会很小.",
      mo3: "Mo3是最近3次的平均值.",
      ao5: "Ao5是最近5次的平均值, 排除最佳和最差时间.",
    },

    // Stackmat
    stackmatAvailableHeader: "Stackmat可用",
    stackmatAvailableText: "你想连接吗?",
    connect: "连接",
    disconnect: "断开连接",

    scramble: "打乱",
    time: "时间",

    inputMethod: "输入方法",
    device: "设备",
    inspection: "检查",
    showTime: "运行时显示时间",
    genImage: "生成图像",
    canHurtPerformance: "这会影响复杂拼图的性能",
    refreshScramble: "取消后刷新打乱",
    aoxCalculation: "AoX计算",
    sequential: "连续",
    groupOfX: "X解答组",
    withoutPrevention: "无防护时间",
    withoutPreventionDescription: "空格键需要按住多久",
    recordCelebration: "破纪录时庆祝",
    sessionTypeMap: {
      mixed: "混合",
      single: "单个",
      "multi-step": "多步骤",
    },
    sessionTypeDescription: {
      mixed: "同一会话中有多个打乱器 (2x2, 3x3, ...) ",
      single: "单类别的会话",
      "multi-step": "为每个解答设置多个步骤",
    },

    // 上一次解决提示
    comments: "评论",

    reloadScramble: "重新加载打乱",
    edit: "编辑",
    useOldScramble: "使用旧打乱",
    copyScramble: "复制打乱",
    notes: "笔记",
    settings: "设置",

    // 标签可访问性
    timerTab: "计时器标签",
    sessionsTab: "会话标签",
    chartsTab: "图表标签",

    // 全局计时器设置
    manageSessions: "管理会话",
    selectSession: "选择会话",
    selectGroup: "选择组",
    selectMode: "选择模式",
    selectFilter: "选择过滤器",
    addNewSession: "添加会话",
    stepNames: "步骤名称",

    // 会话标签
    deleteAll: "删除全部",
    shareAo5: "分享Ao5",
    shareAo12: "分享Ao12",

    selectAll: "全选",
    selectInterval: "选择间隔",
    invertSelection: "反选",

    comment: "评论...",
    noPenalty: "清除",

    removeAllSolves: "你要删除所有解答吗?",
    removeSession: "你要删除这个会话吗?",
    select: "选择",

    // 统计标签
    totalTime: "总时间",
    clean: "清除",
    solve: "解答",
    timeDistribution: "时间分布",
    timeChartLabels: ["时间", "Ao5", "Ao12", "Ao50", "Ao100", "最佳", "趋势"],

    solves: "解答",
    hourDistribution: "小时分布",
    weekDistribution: "周分布",
    histogram: "直方图",
    days: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],

    // 最佳部分
    bestMarks: "最佳标记",
    go: "开始",
    bestList: [
      { title: "最佳", key: "best", select: 1 },
      { title: "最差", key: "worst", select: 1 },
      { title: "Ao5", key: "Ao5", select: 5 },
      { title: "Ao12", key: "Ao12", select: 12 },
      { title: "Ao50", key: "Ao50", select: 1 },
      { title: "Ao100", key: "Ao100", select: 1 },
      { title: "Ao200", key: "Ao200", select: 1 },
      { title: "Ao500", key: "Ao500", select: 1 },
      { title: "Ao1k", key: "Ao1k", select: 1 },
      { title: "Ao2k", key: "Ao2k", select: 1 },
    ],
    stepsAverage: "步骤平均",
    stepsPercent: "步骤百分比",

    // 模态框
    modal: {
      "edit-scramble": "编辑打乱",
      "old-scrambles": "旧打乱",
      settings: "设置",
    },
  },
  RECONSTRUCTIONS: {
    stepBack: "后退一步",
    playPause: "播放/暂停",
    stepForward: "前进一步",
    title: "[标题]",
    scramble: "[在此输入你的打乱]",
    reconstruction: "[在此输入你的重构]",
    puzzle: "谜题",
    resetCamera: "重置相机",
    findReconstruction: "查找重构",
    return: "返回",
    speed: "速度",
  },
  PLL: {
    title: "PLL 辨识训练器",
    topFace: "顶面",
    cases: "案例",
    next: "下一个",
    completed: "已完成",
    tryAgain: "重试",

    colorNeutral: "中性色",
    white: "白色",
    yellow: "黄色",
    red: "红色",
    orange: "橙色",
    blue: "蓝色",
    green: "绿色",

    case: "案例",
    expected: "预期",
    answer: "答案",
    time: "时间",

    // 模态框
    keyBindings: "按键绑定",
    singleLetter: "单字母 PLL",
    singleLetterBlock: "只需点击字母回答测验.",

    twoVariant: "双变体 PLL",
    twoVariantBlock:
      "对于像 <mark>Ja</mark> 和 <mark>Jb</mark> 这样的 PLL, 小写字母是 <mark>a</mark> 变体 <mark>(j 是 Ja)</mark>, 大写字母是 <mark>b</mark> 变体 <mark>(J 是 Jb)</mark>.",

    gPerms: "G perms",
    gPermsBlock:
      "对于 G Perms, 您可以使用数字 <mark>1</mark> 到 <mark>4</mark> (Ga, Gb, Gc 和 Gd).",
  },
  SIMULATOR: {
    settings: "设置",

    puzzleSettings: "拼图设置",
    puzzle: "拼图",
    order: "顺序",
    setPuzzle: "设置拼图",
  },
  IMPORT_EXPORT: {
    title: "导入 / 导出",
    import: "导入",
    export: "导出",
    from: "从",
    selectFile: "选择文件",
    selectAll: "全选",
    selectNone: "全不选",
    total: "总计",
    showingOnly50: "仅显示50条",
  },
  CUBEDB: {
    name: "名称",
    version: "版本",
    creator: "作者",
    donations: "捐赠",
  },
  TOOLS: {
    cubedbBatch: "CubeDB 打乱",
    timerOnly: "仅计时器",
    scrambleOnly: "仅打乱",
    batchScramble: "批量打乱",
    statistics: "统计",
    metrics: "指标",
    solver: "解题器 3x3",
    mosaic: "马赛克",
    remoteTimer: "远程计时器",
    portraitWarning: "旋转手机并激活全屏模式以获得更好的体验。",

    // 统计
    writeYourTime: "在此输入你的时间",
    clickToDelete: "点击删除",

    // 指标
    writeYourScramble: "在此输入你的打乱",

    // 描述
    ETM: "ETM (执行转动指标) :在此指标中，外层、块或旋转的每个移动都计为1步。",
    QTM: "QTM (90度转动指标) :在此指标中，外层每90度的移动计为1步。双重移动计为2步。",
    HTM: "HTM (半圈转动指标) :外层每旋转任意角度计为1步。中间层计为2步。",
    OBTM: "OBTM (外层块转动指标) :外层或块的每个旋转计为1步。中间层计为2步。",
    STM: "STM (切片转动指标) :每个切片计为1步。",

    // 解题器
    colors: "颜色",
    solve: "解决",
    stickers: "贴纸",
    error: "错误",
    invalidCube: "无效的魔方。",
    missingEdges: "有一些缺少的边。",
    flippedEdge: "有一个翻转的边。",
    missingCorners: "有一些缺少的角。",
    twistedCornerClockwise: "有一个顺时针扭曲的角。",
    twistedCornerCounterclockwise: "有一个逆时针扭曲的角。",
    parity: "存在奇偶性 (两个角或边被交换) 。",
    solutionFound: "找到解决方案",
    solutionInstruction: "以绿色中心在前面和白色中心在顶部为例:",

    // 马赛克
    widthInCubes: "宽度 (以魔方数计) ",
    heightInCubes: "高度 (以魔方数计) ",
    cubeOrder: "魔方顺序",
    generate: "生成",
    selectImage: "选择图片",

    // 远程计时器
    clickToAuth: "服务器使用自签名的网络证书，因此您需要在浏览器上手动接受它，点击下面的链接。",
  },
  MENU: [
    [
      "WCA",
      [
        ["3x3x3", "333", 0, 30, [3]],
        ["2x2x2", "222so", 0, 30, [3]],
        ["4x4x4", "444wca", -40, 40, [4]],
        ["5x5x5", "555wca", -60, 48, [4]],
        ["6x6x6", "666wca", -80, 54, [6]],
        ["7x7x7", "777wca", -100, 60, [6]],
        ["3x3x3 BLD", "333ni", 0, 30, [3]],
        ["3x3x3 MBLD", "r3ni", 5, 30, [3]],
        ["3x3 FM", "333fm", 0, 30, [3]],
        ["3x3 OH", "333oh", 0, 30, [3]],
        ["Clock", "clkwca", 0, 30, [6]],
        ["Megaminx", "mgmp", -70, 55, [5]],
        ["Pyraminx", "pyrso", -10, 36, [3]],
        ["Skewb", "skbso", 0, 33, [3]],
        ["Sq-1", "sqrs", 0, 50, [8, 2]],
        ["4x4 BLD", "444bld", -40, 40, [4]],
        ["5x5 BLD", "555bld", -60, 48, [4]],
      ],
    ],
    [
      "3x3x3",
      [
        ["WCA", "333", 0],
        ["随机移动", "333o", 25],
        ["仅边", "edges", 0],
        ["仅角", "corners", 0],
        ["3x3 FT", "333ft", 0],
        ["自定义", "333custom", 0],
        ["2生成器 R,U", "2gen", 25],
        ["2生成器 L,U", "2genl", 25],
        ["Roux生成器 M,U", "roux", 25],
        ["3生成器 F,R,U", "3gen_F", 25],
        ["3生成器 R,U,L", "3gen_L", 25],
        ["3生成器 R,r,U", "RrU", 25],
        ["半转", "half", 25],
        ["最后槽位 + LL (旧)", "lsll", 15],
      ],
    ],
    [
      "3x3x3 CFOP",
      [
        ["PLL", "pll", 0],
        ["OLL", "oll", 0],
        ["最后层 (LL)", "ll", 0],
        ["最后槽位 + LL", "lsll2", 0],
        ["ZBLL", "zbll", 0],
        ["COLL", "coll", 0],
        ["CLL", "cll", 0],
        ["ELL", "ell", 0],
        ["2GLL", "2gll", 0],
        ["ZZLL", "zzll", 0],
        ["ZBLS", "zbls", 0],
        ["EOLS", "eols", 0],
        ["WVLS", "wvls", 0],
        ["VLS", "vls", 0],
        ["F2L", "f2l", 0],
        ["EOLine", "eoline", 0],
        ["简易交叉", "easyc", 3],
        ["简易X交叉", "easyxc", 4], // 新增
      ],
    ],
    [
      "3x3x3 Roux",
      [
        ["第二阶段", "sbrx", 0],
        ["CMLL", "cmll", 0],
        ["LSE", "lse", 0],
        ["LSE <M, U>", "lsemu", 0],
      ],
    ],
    [
      "3x3x3 Mehta",
      [
        ["3QB", "mt3qb", 0],
        ["EOLE", "mteole", 0],
        ["TDR", "mttdr", 0],
        ["6CP", "mt6cp", 0],
        ["CDRLL", "mtcdrll", 0],
        ["L5EP", "mtl5ep", 0],
        ["TTLL", "ttll", 0],
      ],
    ],
    [
      "2x2x2",
      [
        ["WCA", "222so", 0],
        ["最优解", "222o", 0],
        ["3生成器", "2223", 25],
        ["EG", "222eg", 0],
        ["CLL", "222eg0", 0],
        ["EG1", "222eg1", 0],
        ["EG2", "222eg2", 0],
        ["TCLL+", "222tcp", 0],
        ["TCLL-", "222tcn", 0],
        ["LS", "222lsall", 0],
        ["无条", "222nb", 0],
      ],
    ],
    [
      "4x4x4",
      [
        ["WCA", "444wca", -40],
        ["随机状态", "444m", 40],
        ["SiGN", "444", 40],
        ["YJ", "444yj", 40],
        ["边", "4edge", 8],
        ["R,r,U,u", "RrUu", 40],
      ],
    ],
    [
      "5x5x5",
      [
        ["WCA", "555wca", 60],
        ["SiGN", "555", 60],
        ["边", "5edge", 8],
      ],
    ],
    [
      "6x6x6",
      [
        ["WCA", "666wca", 80],
        ["SiGN", "666si", 80],
        ["前缀", "666p", 80],
        ["后缀", "666s", 80],
        ["边", "6edge", 8],
      ],
    ],
    [
      "7x7x7",
      [
        ["WCA", "777wca", 100],
        ["SiGN", "777si", 100],
        ["前缀", "777p", 100],
        ["后缀", "777s", 100],
        ["边", "7edge", 8],
      ],
    ],
    [
      "Clock",
      [
        ["WCA", "clkwca", 0],
        ["JAAP", "clk", 0],
        ["最优解", "clko", 0],
        ["简洁", "clkc", 0],
        ["高效顺序", "clke", 0],
      ],
    ],
    [
      "Kilominx",
      [
        ["随机状态", "klmso", 0],
        ["Pochmann", "klmp", 30],
      ],
    ],
    [
      "Megaminx",
      [
        ["WCA", "mgmp", 70],
        ["Carrot", "mgmc", 70],
        ["Old Style", "mgmo", 70],
        ["2生成器 R,U", "minx2g", 30],
        ["最后层 (LL)", "mgmll", 0],
        ["最后槽位 + LL", "mlsll", 40],
        ["PLL", "mgmpll", 0],
      ],
    ],
    ["Gigaminx", [["Pochmann", "giga", 300]]],
    [
      "Pyraminx",
      [
        ["WCA", "pyrso", 10],
        ["最优解", "pyro", 0],
        ["随机移动", "pyrm", 25],
        ["L4E", "pyrl4e", 0],
        ["4角", "pyr4c", 0],
        ["无条", "pyrnb", 0],
      ],
    ],
    [
      "Skewb",
      [
        ["WCA", "skbso", 0],
        ["最优解", "skbo", 0],
        ["随机移动", "skb", 25],
        ["无条", "skbnb", 0],
      ],
    ],
    [
      "Square-1",
      [
        ["WCA", "sqrs", 0],
        ["CSP", "sqrcsp", 0],
        ["面转动指标", "sq1h", 40],
        ["扭曲指标", "sq1t", 20],
      ],
    ],
    [
      "LxMxN",
      [
        ["1x3x3 (Floppy Cube)", "133", 0],
        ["2x2x3 (Tower Cube)", "223", 0],
        ["2x3x3 (Domino)", "233", 25],
        ["3x3x4", "334", 40],
        ["3x3x5", "335", 25],
        ["3x3x6", "336", 40],
        ["3x3x7", "337", 40],
        ["8x8x8", "888", 120],
        ["9x9x9", "999", 120],
        ["10x10x10", "101010", 120],
        ["11x11x11", "111111", 120],
        ["NxNxN", "cubennn", 12],
      ],
    ],
    [
      "Gear Cube",
      [
        ["随机状态", "gearso", 0],
        ["最优解", "gearo", 0],
        ["随机移动", "gear", 10],
      ],
    ],
    ["Helicopter Cube", [["随机", "heli", 40]]],
    [
      "Redi Cube",
      [
        ["MoYu", "redim", 8],
        ["old", "redi", 20],
      ],
    ],
    [
      "Ivy cube",
      [
        ["随机状态", "ivyso", 0],
        ["最优解", "ivyo", 0],
        ["随机移动", "ivy", 10],
      ],
    ],
    ["Master Pyraminx", [["随机", "mpyr", 42]]],
    [
      "Pyraminx Crystal",
      [
        ["Pochmann", "prcp", 70],
        ["Old Style", "prco", 70],
      ],
    ],
    [
      "Siamese Cube",
      [
        ["1x1x3", "sia113", 25],
        ["1x2x3", "sia123", 25],
        ["2x2x2", "sia222", 25],
      ],
    ],
    ["Square-2", [["随机", "sq2", 20]]],
    ["Super Floppy", [["随机", "sfl", 25]]],
    ["Super Square-1", [["扭曲指标", "ssq1t", 20]]],
    ["UFO", [["Jaap Style", "ufo", 25]]],
    [
      "Bandaged Cube",
      [
        ["Bicube", "bic", 30],
        ["Square-1 /,(1,0)", "bsq", 25],
      ],
    ],
    [
      "Relays",
      [
        ["许多3x3x3", "r3", 5],
        ["234 接力赛 (WCA)", "r234w", 0],
        ["2345 接力赛 (WCA)", "r2345w", 0],
        ["23456 接力赛 (WCA)", "r23456w", 0],
        ["234567 接力赛 (WCA)", "r234567w", 0],
        ["234 接力赛", "r234", 0],
        ["2345 接力赛", "r2345", 0],
        ["23456 接力赛", "r23456", 0],
        ["234567 接力赛", "r234567", 0],
      ],
    ],
    ["Other", [["FTO (Face-Turning Octahedron)", "fto", 25]]],
  ],
};
