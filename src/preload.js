const { contextBridge, ipcRenderer } = require('electron');

const ipc = ipcRenderer;

contextBridge.exposeInMainWorld('electronAPI', {
  getAlgorithms: (dir) => ipc.send('get-algorithms', dir),
  updateAlgorithm: (dir) => ipc.send('update-algorithm', dir),
  handleAlgorithms: (dir) => ipc.on('algorithms', dir),
  
  getCards: () => ipc.send('cards'),
  handleCards: (dir) => ipc.on('cards', dir),
  
  addSolve: (s) => ipc.send('add-solve', s),
  addSolves: (s) => ipc.send('add-solves', s),
  getSolves: () => ipc.send('get-solves'),
  updateSolve: (s) => ipc.send('update-solve', s),
  removeSolves: (s) => ipc.send('remove-solves', s),
  handleSolves: (dir) => ipc.on('solves', dir),
  
  addContest: (s) => ipc.send('add-contest', s),
  getContests: () => ipc.send('get-contests'),
  updateContest: (s) => ipc.send('update-contest', s),
  removeContests: (s) => ipc.send('remove-contests', s),
  handleContests: (dir) => ipc.on('contests', dir),
  
  addSession: (s) => ipc.send('add-session', s),
  getSessions: () => ipc.send('get-sessions'),
  removeSession: (s) => ipc.send('remove-session', s),
  renameSession: (s) => ipc.send('rename-session', s),
  updateSession: (s) => ipc.send('update-session', s),
  handleSessions: (dir) => ipc.on('session', dir),
  
  addTutorial: (t) => ipc.send('add-tutorial', t),
  getTutorials: () => ipc.send('get-tutorials'),
  updateTutorial: (t) => ipc.send('update-tutorial', t),
  handleTutorials: (cb) => ipc.on('tutorial', cb),

  minimize: () => ipc.send('minimize'),
  maximize: () => ipc.send('maximize'),
  close: () => ipc.send('close'),
  generatePDF: (opts) => ipc.send('generate-pdf', opts),
  zipPDF: (sheets) => ipc.send('zip-pdf', sheets),
  openFile: (f) => ipc.send('open-file', f),
  revealFile: (f) => ipc.send('reveal-file', f),
  handleAny: (cb) => ipc.on('any', cb),

  update: (cmd) => ipc.send('update', cmd),
  handleUpdate: (cb) => ipc.on('update', cb),

  sleep: (s) => ipc.send('sleep', s),

  // Bluetooth
  connectBluetoothDevice: (id) => ipc.send('connect-bluetooth-device', id),
  cancelBluetoothRequest: () => ipc.send('cancel-bluetooth-request'),
  pairingBluetoothResponse: (id) => ipc.send('connect-bluetooth-device', id),
  handleBluetooth: (cb) => ipc.on('bluetooth', cb),

  /*

  cancelBluetoothRequest: (callback) => ipcRenderer.send('cancel-bluetooth-request', callback),
  bluetoothPairingRequest: (callback) => ipcRenderer.on('bluetooth-pairing-request', callback),
  bluetoothPairingResponse: (response) => ipcRenderer.send('bluetooth-pairing-response', response)
  
  */

  cacheCheckImage: async (hash) => await ipc.invoke('check-image', hash),
  cacheGetImage: async (hash) => await ipc.invoke('get-image', hash),
  cacheSaveImage: async (hash, data) => await ipc.invoke('save-image', hash, data),

  getAllDisplays: () => ipc.invoke('get-all-displays'),
  useDisplay: (id) => ipc.invoke('use-display', id),
});
