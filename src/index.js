const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const NeDB = require('nedb');
const electronReload = require('electron-reload');
const archiver = require('archiver');
const { exec } = require('child_process');

let win = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

let Algorithms = new NeDB({ filename: __dirname + '/database/algs.db', autoload: true });
let Cards = new NeDB({ filename: __dirname + '/database/cards.db', autoload: true });
let Tutorials = new NeDB({ filename: __dirname + '/database/tutorials.db', autoload: true });
let Sessions = new NeDB({ filename: __dirname + '/database/sessions.db', autoload: true });
let Solves = new NeDB({ filename: __dirname + '/database/solves.db', autoload: true });
let Contests = new NeDB({ filename: __dirname + '/database/contests.db', autoload: true });

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

/// Cards handler
ipcMain.on('cards', (event) => {
  Cards.find({}, (err, algs) => {
    if ( err ) {
      event.sender.send('cards', []);
      return;
    }

    event.sender.send('cards', algs);
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

ipcMain.on('generate-pdf', (event, arg) => {
  let pdfWin = new BrowserWindow({
    width: arg.width,
    height: arg.height,
    webPreferences: { offscreen: true },
    show: false,
  });

  const tmpDir = path.join(os.tmpdir(), '/CubeDB/');

  if ( !fs.existsSync( tmpDir ) ) {
    fs.mkdirSync( tmpDir, { recursive: true } );
  }

  let date = (new Date).toLocaleDateString().replace(/\//g, '-');
  let tempFile = path.join(tmpDir, 'Contest-' + (Math.random().toString().split('.')[1]) + '.html');
  // let pdfFile = path.join(os.tmpdir(), `/CubeDB/Contest (${arg.mode} Round ${arg.round})_${date}.pdf`);

  try {
    fs.writeFileSync(tempFile, arg.html);

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
          fs.unlinkSync(tempFile);
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
  const tmpDir = path.join(os.tmpdir(), '/CubeDB/');
  const { name, files } = data;

  if ( !fs.existsSync( tmpDir ) ) {
    fs.mkdirSync( tmpDir, { recursive: true } );
  }

  const output = fs.createWriteStream( path.join(tmpDir, name + '.zip') );  

  output.on('close', () => {
    event.sender.send('any', ['zip-pdf', path.join(tmpDir, name + '.zip')]);
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
    win.webContents.openDevTools();

    electronReload(__dirname, {
      electron: path.join(__dirname, '../node_modules', '.bin', 'electron'),
      awaitWriteFinish: true
    });
    win.loadURL('http://localhost:5000');

  } else {
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