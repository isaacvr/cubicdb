const { contextBridge, ipcRenderer } = require('electron');

const ipc = ipcRenderer;

contextBridge.exposeInMainWorld('electronAPI', {
  getAlgorithms: async (dir) => await ipc.invoke('get-algorithms', dir),
  addAlgorithm: async (alg) => await ipc.invoke('add-algorithm', alg),
  updateAlgorithm: async (alg) => await ipc.invoke('update-algorithm', alg),
  removeAlgorithm: async (alg) => await ipc.invoke('remove-algorithm', alg),
  
  getCards: async () => await ipc.invoke('cards'),
  
  addSolve: async (s) => await ipc.invoke('add-solve', s),
  addSolves: async (s) => await ipc.invoke('add-solves', s),
  getSolves: async () => await ipc.invoke('get-solves'),
  updateSolve: async (s) => await ipc.invoke('update-solve', s),
  removeSolves: async (s) => await ipc.invoke('remove-solves', s),
  
  addContest: async (s) => await ipc.invoke('add-contest', s),
  getContests: async () => await ipc.invoke('get-contests'),
  updateContest: async (s) => await ipc.invoke('update-contest', s),
  removeContests: async (s) => await ipc.invoke('remove-contests', s),
  
  addSession: async (s) => await ipc.invoke('add-session', s),
  getSessions: async () => await ipc.invoke('get-sessions'),
  removeSession: async (s) => await ipc.invoke('remove-session', s),
  renameSession: async (s) => await ipc.invoke('rename-session', s),
  updateSession: async (s) => await ipc.invoke('update-session', s),
  
  addTutorial: async (t) => await ipc.invoke('add-tutorial', t),
  getTutorials: async () => await ipc.invoke('get-tutorials'),
  updateTutorial: async (t) => await ipc.invoke('update-tutorial', t),

  // Misc functions
  minimize: async () => await ipc.invoke('minimize'),
  maximize: async () => await ipc.invoke('maximize'),
  close: async () => await ipc.invoke('close'),
  generatePDF: async (opts) => await ipc.invoke('generate-pdf', opts),
  generateContestPDF: async (opts) => await ipc.invoke('generate-contest-pdf', opts),
  zipPDF: async (sheets) => await ipc.invoke('zip-pdf', sheets),
  openFile: async (f) => await ipc.invoke('open-file', f),
  revealFile: async (f) => await ipc.invoke('reveal-file', f),

  // Update
  update: async (cmd) => await ipc.invoke('update', cmd),
  cancelUpdate: async () => await ipc.invoke('cancel-update'),
  addDownloadProgressListener: (cb) => ipc.on('download-progress', cb),
  addDownloadDoneListener: (cb) => ipc.on('update-downloaded', cb),

  // Power control
  sleep: async (s) => await ipc.invoke('sleep', s),

  // Bluetooth
  connectBluetoothDevice: async (id) => await ipc.invoke('connect-bluetooth-device', id),
  cancelBluetoothRequest: async () => await ipc.invoke('cancel-bluetooth-request'),
  pairingBluetoothResponse: async (id) => await ipc.invoke('connect-bluetooth-device', id),
  addBluetoothListener: (cb) => ipc.on('bluetooth', cb),

  // Cache
  cacheCheckImage: async (hash) => await ipc.invoke('check-image', hash),
  cacheGetImage: async (hash) => await ipc.invoke('get-image', hash),
  cacheGetImageBundle: async (hashes) => await ipc.invoke('get-image-bundle', hashes),
  cacheSaveImage: async (hash, data) => await ipc.invoke('save-image', hash, data),

  // Screens
  getAllDisplays: async () => await ipc.invoke('get-all-displays'),
  useDisplay: async (id) => await ipc.invoke('use-display', id),
});
