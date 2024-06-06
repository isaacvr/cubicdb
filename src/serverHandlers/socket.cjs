let timerMap = new Map();

function sendList(type, map) {
  win.webContents.send('external', ['', '', '', {
    type: `__${type}_list`,
    value: [ ...map.entries() ]
  }]);
}

module.exports = (ipcMain, io) => {
  io.on('connection', (socket) => {
    console.log("CONNECTED: ", socket.id);
    
    socket.name = 'timer-' + socket.id.slice(0, 4); // Set temporal name
    socket.registered = false;
    
    socket.emit('name', socket.name);

    socket.on('register', (sData) => {
      console.log('[register]: ', sData);

      if ( socket.registered ) return;
      if ( !sData ) return socket.disconnect();
      if ( !['timer'].some(type => type === sData.type) ) return socket.disconnect();

      socket.join( sData.type );
      socket.name = sData.name || socket.name;
      socket.registered = true;

      if ( sData.type === 'timer' ) {
        timerMap.set(socket.id, {
          id: socket.id,
          name: socket.name
        });

        sendList('timer', timerMap);
      }
    
      console.log("Socket registered: ", socket.name);

      socket.on('message', (mData) => {
        console.log('[message]: ', socket.name, mData);
        
        if ( !mData ) return;
        if ( !mData.type ) return;
        
        // Handle configuration
        if ( mData.type === '__settings' && mData.name ) {
          socket.name = mData.name;
          let tData = timerMap.get(socket.id) || { id: socket.id, name: socket.name };
          tData.name = socket.name;
          timerMap.set(socket.id, tData);

          sendList('timer', timerMap);
        }

        win.webContents.send('external', [socket.id, socket.name, sData.type, mData]);
      });
    });
  
    socket.on('disconnect', () => {
      console.log("DISCONNECTED: ", socket.id);
      socket.rooms.forEach(r => socket.leave(r));
      timerMap.delete(socket.id);
      sendList('timer', timerMap);
      win.webContents.send('external', [socket.id, socket.name, '', { type: 'state', state: 'DISCONNECTED' }]);
    });
  });
  
  ipcMain.handle('external', (_, deviceId, ...args) => {
    console.log("TO DEVICE: ", deviceId, " MESSAGE: ", ...args);
    io.to(deviceId).emit('external', ...args);
  });
};