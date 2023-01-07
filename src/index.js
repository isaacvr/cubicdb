const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const NeDB = require('nedb');
const electronReload = require('electron-reload');

let win = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

let Algorithms = new NeDB({ filename: __dirname + '/database/algs.db', autoload: true });
let Cards = new NeDB({ filename: __dirname + '/database/cards.db', autoload: true });
let Tutorials = new NeDB({ filename: __dirname + '/database/tutorials.db', autoload: true });
let Sessions = new NeDB({ filename: __dirname + '/database/sessions.db', autoload: true });
let Solves = new NeDB({ filename: __dirname + '/database/solves.db', autoload: true });

/// Algorithms handler
ipcMain.on('algorithms', (event, arg) => {

  Algorithms.find({
    parentPath: arg
  }, (err, algs) => {
    if ( err ) {
      console.error('Server error :(');
      event.sender.send('algorithms', []);
      return;
    }

    event.sender.send('algorithms', algs);
  });

});

/// Cards handler
ipcMain.on('cards', (event) => {
  Cards.find({}, (err, algs) => {
    if ( err ) {
      console.error('Server error :(');
      event.sender.send('cards', []);
      return;
    }

    event.sender.send('cards', algs);
  });

});

/// Tutorials handler
ipcMain.on('get-tutorials', (event) => {
  console.log("GET_TUTORIALS");
  
  Tutorials.find({}, (err, tutorials) => {
    return event.sender.send('tutorial', ['get-tutorials', err ? null : tutorials]);
  });
});

ipcMain.on('add-tutorial', (event, arg) => {
  Tutorials.insert(arg, function(err, tutorial) {
    return event.sender.send('tutorial', [ 'add-tutorial', err ? null: tutorial ]);
  });
});

ipcMain.on('remove-tutorial', (event, arg) => {
  Tutorials.remove({ _id: arg._id }, function(err, tutorial) {
    return event.sender.send('tutorial', [ 'remove-tutorial', err ? null : tutorial ]);
  });
});

ipcMain.on('update-tutorial', (event, arg) => {
  Tutorials.update({ _id: arg._id }, {
    $set: {
      title: arg.title,
      titleLower: arg.titleLower,
      puzzle: arg.puzzle,
      algs: arg.algs,
      content: arg.content,
      level: arg.level || 0
    }
  }, function(err) {
    return event.sender.send('tutorial', [ 'update-tutorial', err ? null : arg ]);
  });
});

/// Sessions handler
ipcMain.on('get-sessions', (event) => {
  Sessions.find({}, function(err, sessions) {
    return event.sender.send('session', ['get-sessions', err ? null : sessions]);
  });
});

ipcMain.on('add-session', (event, arg) => {
  Sessions.insert({ name: arg.name, settings: arg.settings }, function(err, session) {
    return event.sender.send('session', [ 'add-session', err ? null: session ]);
  });
});

ipcMain.on('remove-session', (event, arg) => {
  Solves.remove({ session: arg._id }, function(err) {
    Sessions.remove({ _id: arg._id }, function(err1) {
      return event.sender.send('session', [ 'remove-session', err1 ? null : arg ]);
    });
  });
});

ipcMain.on('rename-session', (event, arg) => {
  Sessions.update({ _id: arg._id }, { $set: { name: arg.name } }, function(err, session) {
    return event.sender.send('session', [ 'rename-session', err ? null : arg ]);
  });
});

ipcMain.on('update-session', (event, arg) => {
  Sessions.update({ _id: arg._id }, { $set: { name: arg.name, settings: arg.settings } }, function(err, session) {
    return event.sender.send('session', [ 'update-session', err ? null : arg ]);
  });
});

/// Solves handler
ipcMain.on('get-solves', (event) => {
  Solves.find({}, (err, solves) => {
    return event.sender.send('solves', ['get-solves', err ? null : solves ]);
  });
});

ipcMain.on('add-solve', (event, arg) => {
  Solves.insert(arg, function(err, solve) {
    return event.sender.send('solves', ['add-solve', err ? null : [solve] ]);
  });
});

ipcMain.on('update-solve', (event, arg) => {
  Solves.update({ _id: arg._id }, {
    $set: {
      comments: arg.comments,
      penalty: arg.penalty
    }
  }, (err, n, solve) => {
    return event.sender.send('solves', ['update-solve', err ? null : arg ]);
  });
});

ipcMain.on('remove-solves', (event, arg) => {
  Solves.remove({ _id: { $in: arg } }, { multi: true }, function(err, solves) {
    return event.sender.send('solves', ['remove-solves', err ? null : arg ]);
  });
});

/// Other Stuff
ipcMain.on('minimize', () => {
  win.minimize();
});

ipcMain.on('maximize', () => {
  if ( win.isMaximized ) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on('close', () => {
  app.exit();
});

function createWindow() {

  win = new BrowserWindow({
    x: 0,
    y: 0,
    fullscreen: true,
    frame: false,
    closable: true,
    webPreferences: {
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js' ),
    },
    icon: __dirname + '/logo.png'
  });

  if (serve) {
    console.log('SERVE');
    win.webContents.openDevTools();

    electronReload(__dirname, {
      electron: path.join(__dirname, '../node_modules', '.bin', 'electron'),
      awaitWriteFinish: true
    });
    win.loadURL('http://localhost:5000');

  } else {
    console.log('SERVENT');
    win.loadURL(String(Object.assign(new URL('http://a.com'), {
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    })));
  }

  Sessions.count({}, function(err, count) {
    if ( !count ) {
      Sessions.insert({
        name: "Session 1",
        settings: {
          hasInspection: true,
          inspection: 15,
          showElapsedTime: true,
          calcAoX: 0
        }
      });
    }
  });

  win.on('closed', () => win = null);

  return win;
}

try {
  app.on('ready', () => setTimeout(createWindow, 400));

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
}