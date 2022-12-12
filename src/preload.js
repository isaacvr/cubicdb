const { contextBridge, ipcRenderer } = require('electron');

const ipc = ipcRenderer;

contextBridge.exposeInMainWorld('electronAPI', {
  getAlgorithms: (dir) => ipc.send('algorithms', dir),
  handleAlgorithms: (dir) => ipc.on('algorithms', dir),
  
  getCards: () => ipc.send('cards'),
  handleCards: (dir) => ipc.on('cards', dir),
  
  addSolve: (s) => ipc.send('add-solve', s),
  getSolves: () => ipc.send('get-solves'),
  updateSolve: (s) => ipc.send('update-solve', s),
  removeSolves: (s) => ipc.send('remove-solves', s),
  handleSolves: (dir) => ipc.on('solves', dir),
  
  addSession: (s) => ipc.send('add-session', s),
  getSessions: () => ipc.send('get-sessions'),
  removeSession: (s) => ipc.send('remove-session', s),
  renameSession: (s) => ipc.send('rename-session', s),
  handleSessions: (dir) => ipc.on('session', dir),
  
  addTutorial: (t) => ipc.send('add-tutorial', t),
  getTutorials: () => ipc.send('get-tutorials'),
  updateTutorial: (t) => ipc.send('update-tutorial', t),
  handleTutorials: (cb) => ipc.on('tutorial', cb),

  minimize: () => ipc.send('minimize'),
  maximize: () => ipc.send('maximize'),
  close: () => ipc.send('close'),
});