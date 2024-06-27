const { contextBridge, ipcRenderer } = require("electron");

const ipc = ipcRenderer;

contextBridge.exposeInMainWorld("electronAPI", {
  getAlgorithms: async dir => ipc.invoke("get-algorithms", dir),
  getAlgorithm: async dir => ipc.invoke("get-algorithm", dir),
  addAlgorithm: async alg => ipc.invoke("add-algorithm", alg),
  updateAlgorithm: async alg => ipc.invoke("update-algorithm", alg),
  removeAlgorithm: async alg => ipc.invoke("remove-algorithm", alg),
  algorithmsVersion: async () => ipc.invoke("algorithms-version"),
  checkAlgorithms: async () => ipc.invoke("algorithms-check"),
  updateAlgorithms: async () => ipc.invoke("update-algorithms"),

  getCards: async () => ipc.invoke("cards"),

  addSolve: async s => ipc.invoke("add-solve", s),
  addSolves: async s => ipc.invoke("add-solves", s),
  getSolves: async () => ipc.invoke("get-solves"),
  updateSolve: async s => ipc.invoke("update-solve", s),
  removeSolves: async s => ipc.invoke("remove-solves", s),

  addContest: async s => ipc.invoke("add-contest", s),
  getContests: async () => ipc.invoke("get-contests"),
  updateContest: async s => ipc.invoke("update-contest", s),
  removeContests: async s => ipc.invoke("remove-contests", s),

  addSession: async s => ipc.invoke("add-session", s),
  getSessions: async () => ipc.invoke("get-sessions"),
  removeSession: async s => ipc.invoke("remove-session", s),
  renameSession: async s => ipc.invoke("rename-session", s),
  updateSession: async s => ipc.invoke("update-session", s),

  addTutorial: async t => ipc.invoke("add-tutorial", t),
  getTutorials: async () => ipc.invoke("get-tutorials"),
  getTutorial: async (pz, sn, lang) => ipc.invoke("get-tutorial", pz, sn, lang),
  updateTutorial: async t => ipc.invoke("update-tutorial", t),
  removeTutorial: async t => ipc.invoke("remove-tutorial", t),
  tutorialsVersion: async () => ipc.invoke("tutorials-version"),
  checkTutorials: async () => ipc.invoke("tutorials-check"),
  updateTutorials: async () => ipc.invoke("update-tutorials"),

  // Misc functions
  minimize: async () => ipc.invoke("minimize"),
  maximize: async () => ipc.invoke("maximize"),
  close: async () => ipc.invoke("close"),
  generatePDF: async opts => ipc.invoke("generate-pdf", opts),
  generateContestPDF: async opts => ipc.invoke("generate-contest-pdf", opts),
  zipPDF: async sheets => ipc.invoke("zip-pdf", sheets),
  openFile: async f => ipc.invoke("open-file", f),
  revealFile: async f => ipc.invoke("reveal-file", f),

  // Update
  update: async cmd => ipc.invoke("update", cmd),
  cancelUpdate: async () => ipc.invoke("cancel-update"),
  addDownloadProgressListener: cb => ipc.on("download-progress", cb),
  addDownloadDoneListener: cb => ipc.on("update-downloaded", cb),

  // Power control
  sleep: async s => ipc.invoke("sleep", s),

  // Bluetooth
  connectBluetoothDevice: async id => ipc.invoke("connect-bluetooth-device", id),
  cancelBluetoothRequest: async () => ipc.invoke("cancel-bluetooth-request"),
  pairingBluetoothResponse: async id => ipc.invoke("connect-bluetooth-device", id),
  addBluetoothListener: cb => ipc.on("bluetooth", cb),

  // Cache
  cacheGetAll: async () => ipc.invoke("cache-get-all"),
  cacheCheckImage: async hash => ipc.invoke("check-image", hash),
  cacheGetImage: async hash => ipc.invoke("get-image", hash),
  cacheGetImageBundle: async hashes => ipc.invoke("get-image-bundle", hashes),
  cacheSaveImage: async (hash, data) => ipc.invoke("save-image", hash, data),
  clearCache: async db => {
    switch (db) {
      case "Cache": {
        return ipc.invoke("clear-cache");
      }
      case "Solves": {
        return ipc.invoke("clear-solves");
      }
      case "Sessions": {
        return ipc.invoke("clear-sessions");
      }
    }
  },

  // Screens
  getAllDisplays: async () => ipc.invoke("get-all-displays"),
  useDisplay: async id => ipc.invoke("use-display", id),

  // External
  addExternalConnector: cb => ipc.on("external", cb),
  external: async (deviceId, ...args) => ipc.invoke("external", deviceId, ...args),

  // Storage
  cacheStorage: async () => ipc.invoke("cache-storage"),
  algorithmsStorage: async () => ipc.invoke("algorithms-storage"),
  sessionsStorage: async () => ipc.invoke("sessions-storage"),
  solvesStorage: async () => ipc.invoke("solves-storage"),
  tutorialsStorage: async () => ipc.invoke("tutorials-storage"),
});
