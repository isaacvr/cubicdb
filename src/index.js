const { app, BrowserWindow, ipcMain, shell, powerSaveBlocker } = require('electron');
const { autoUpdater } = require('electron-updater');
const { join, resolve } = require('path');
const { existsSync, mkdirSync, writeFileSync, unlinkSync, createWriteStream } = require('fs');
const { tmpdir } = require('os');
const { exec } = require('child_process');

const NeDB = require('nedb');
const electronReload = require('electron-reload');
const archiver = require('archiver');
const express = require('express');
const eApp = express();
const http = require('http');

const args = process.argv.slice(1), serve = args.some(val => val === '--serve');

let appPath = app.getAppPath();
let prod = app.isPackaged;
let params = [ prod ? appPath.replace(/app\.asar$/, '') : appPath, 'src', 'database' ];
let dbPath = join.apply(null, params);

let Algorithms = new NeDB({ filename: resolve(dbPath, 'algs.db'), autoload: true });
let Tutorials = new NeDB({ filename: resolve(dbPath, 'tutorials.db'), autoload: true });
let Sessions = new NeDB({ filename: resolve(dbPath, 'sessions.db'), autoload: true });
let Solves = new NeDB({ filename: resolve(dbPath, 'solves.db'), autoload: true });
let Contests = new NeDB({ filename: resolve(dbPath, 'contests.db'), autoload: true });

/// Algorithms handler
ipcMain.on('algorithms', (event, arg) => {

  Algorithms.find({
    parentPath: arg
  }, (err, algs) => {
    if ( err ) {
      event.sender.send('algorithms', []);
      return;
    }

    event.sender.send('algorithms', algs);
  });

});

/// Tutorials handler
ipcMain.on('get-tutorials', (event) => {
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
  Sessions.insert({
    name: arg.name,
    settings: arg.settings,
    tName: arg.tName || "",
  }, function(err, session) {
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

/// Contests handler
ipcMain.on('get-contests', (event) => {
  Contests.find({}, (err, contests) => {
    return event.sender.send('contests', ['get-contests', err ? null : contests ]);
  });
});

ipcMain.on('add-contest', (event, arg) => {
  Contests.insert(arg, function(err, contest) {
    return event.sender.send('contests', ['add-contest', err ? null : contest ]);
  });
});

ipcMain.on('update-contest', (event, arg) => {
  Contests.update({ _id: arg._id }, {
    $set: {
      name: arg.name,
      place: arg.place,
      date: arg.date,
      status: arg.status,
      contestants: arg.contestants,
      inscriptionI: arg.inscriptionI,
      inscriptionF: arg.inscriptionF,
      inscriptionCost: arg.inscriptionCost,
      rounds: arg.rounds,
    }
  }, (err) => {
    return event.sender.send('contests', ['update-contest', err ? null : arg ]);
  });
});

ipcMain.on('remove-contests', (event, arg) => {
  Contests.remove({ _id: { $in: arg } }, { multi: true }, function(err) {
    return event.sender.send('contests', ['remove-contests', err ? null : arg ]);
  });
});

ipcMain.on('close', () => {
  app.exit();
});

ipcMain.on('generate-pdf', (event, arg) => {
  let pdfWin = new BrowserWindow({
    width: arg.width,
    height: arg.height,
    webPreferences: { offscreen: true },
    show: false,
  });

  const tmpDir = join( tmpdir(), '/CubeDB/');

  if ( !existsSync( tmpDir ) ) {
    mkdirSync( tmpDir, { recursive: true } );
  }

  let date = (new Date).toLocaleDateString().replace(/\//g, '-');
  let tempFile = join(tmpDir, 'Contest-' + (Math.random().toString().split('.')[1]) + '.html');
  
  try {
    writeFileSync(tempFile, arg.html);

    pdfWin.webContents.once('did-finish-load', () => {
      pdfWin.webContents.printToPDF({
        printBackground: true,
      }).then((buffer) => {
        event.sender.send('any', ['generate-pdf', {
          name: `${arg.mode} - Round ${arg.round}_${date}.pdf`,
          buffer,
          mode: arg.mode,
          round: arg.round,
        }]);

        try {
          unlinkSync(tempFile);
        } catch(err) {}

      }).catch((err) => {
        event.sender.send('any', ['generate-pdf-error', err]);
      });
    });
  
    pdfWin.loadFile(tempFile);
  } catch(err) {
    return event.sender.send('any', ['generate-pdf-error', err]);
  }
});

ipcMain.on('zip-pdf', (event, data) => {
  const tmpDir = join( tmpdir(), '/CubeDB/');
  const { name, files } = data;

  if ( !existsSync( tmpDir ) ) {
    mkdirSync( tmpDir, { recursive: true } );
  }

  const output = createWriteStream( join(tmpDir, name + '.zip') );  

  output.on('close', () => {
    event.sender.send('any', ['zip-pdf', join(tmpDir, name + '.zip')]);
  });

  const archive = archiver('zip', {
    zlib: { level: 1 }
  });

  archive.on('error', (err) => {
    event.sender.send('any', ['zip-pdf-error', err]);
  });

  archive.pipe(output);

  for (let i = 0, maxi = files.length; i < maxi; i += 1) {
    archive.append(Buffer.from(files[i].buffer), { name: files[i].name });
  }

  archive.finalize();
});

ipcMain.on('open-file', (_, dir) => {
  shell.openExternal("file://" + dir);
});

ipcMain.on('reveal-file', (_, dir) => {
  exec('explorer /select,' + dir);
});

ipcMain.on('update', (ev) => {
  autoUpdater.checkForUpdatesAndNotify();
});

// Power Management to prevent sleep
let sleepId = -1;

ipcMain.on('sleep', (_, sleep) => {
  if ( sleep ) {
    !powerSaveBlocker.isStarted(sleepId) && (sleepId = powerSaveBlocker.start('prevent-display-sleep'));
  } else {
    powerSaveBlocker.isStarted(sleepId) && powerSaveBlocker.stop(sleepId);
  } 
});

function createWindow() {

  let win = new BrowserWindow({
    x: 0,
    y: 0,
    fullscreen: true,
    frame: false,
    closable: true,
    webPreferences: {
      contextIsolation: true,
      backgroundThrottling: false,
      preload: join(__dirname, 'preload.js' )
    },
    icon: join(__dirname, '../public/assets', 'icon-big.png')
  });

  /// Other Stuff
  ipcMain.on('minimize', () => {
    win.minimize();
  });

  ipcMain.on('maximize', () => {
    if ( win.isMaximized() ) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  if ( serve ) {
    win.webContents.openDevTools();

    electronReload(__dirname, {
      electron: join(__dirname, '../node_modules', '.bin', 'electron'),
      awaitWriteFinish: true
    });

    win.loadURL( process.env.ELECTRON_APP_URL || "http://localhost:5000/" );

  } else {
    let server = http.createServer(eApp).listen();

    eApp.set('port', server.address().port);
    eApp.use( express.static( join(__dirname, '../dist') ) );

    eApp.get('*', (req, res) => {
      res.sendFile( join(__dirname, '../dist', 'index.html') );
    });

    eApp.listen(0, () => {
      win.loadURL(`http://localhost:${ eApp.get('port') }/`);
    });

    // win.loadFile( import.meta.env.ELECTRON_APP_URL );
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