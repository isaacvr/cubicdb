const { app, BrowserWindow, ipcMain, shell, powerSaveBlocker, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const { join, resolve } = require('path');
const { existsSync, mkdirSync, writeFileSync, unlinkSync, createWriteStream, copyFileSync } = require('fs');
const { tmpdir } = require('os');
const { exec } = require('child_process');

const NeDB = require('nedb');
const electronReload = require('electron-reload');
const archiver = require('archiver');
const express = require('express');
const eApp = express();
const http = require('node:http');
const fs = require('node:fs/promises');

const args = process.argv.slice(1), serve = args.some(val => val === '--serve');

let appPath = app.getAppPath();
let prod = app.isPackaged;
let params = [ prod ? appPath.replace(/app\.asar$/, '') : appPath, 'src', 'database' ];
let dbFixedPath = join.apply(null, params);
let dbPath = app.getPath('userData');
let cachePath = join(dbPath, 'ImgCache');

fs.mkdir(cachePath, { recursive: true })
  .then(() => console.log('Cache path created!'))
  .catch((err) => console.log('CACHE ERROR: ', err));

const fixedResources = [ 'algs.db', 'tutorials.db' ];

fixedResources.forEach((res) => {
  if ( !existsSync( join(dbPath, res) ) ) {
    console.log('Copying files from:\n', join(dbFixedPath, res), "to:\n", join(dbPath, res));
    copyFileSync( join(dbFixedPath, res), join(dbPath, res) );
  }
});

let Algorithms = new NeDB({ filename: resolve(dbPath, 'algs.db'), autoload: true });
let Tutorials = new NeDB({ filename: resolve(dbPath, 'tutorials.db'), autoload: true });
let Sessions = new NeDB({ filename: resolve(dbPath, 'sessions.db'), autoload: true });
let Solves = new NeDB({ filename: resolve(dbPath, 'solves.db'), autoload: true });
let Contests = new NeDB({ filename: resolve(dbPath, 'contests.db'), autoload: true });

let cache = new Map();

(async function() {
  let list = await fs.readdir(cachePath);

  for (let i = 0, maxi = list.length; i < maxi; i += 1) {
    if ( (await fs.stat( join(cachePath, list[i]) )).isFile() ) {
      cache.set(list[i], await fs.readFile( join(cachePath, list[i]), { encoding: 'utf8' } ));
    }
  }
}());

/// Algorithms handler
ipcMain.handle('get-algorithms', async (_, arg) => {
  return await new Promise((resolve) => {
    let filter = arg.all ? {} : { parentPath: arg.path };
  
    // @ts-ignore
    Algorithms.find(filter, (err, algs) => {
      if ( err ) {
        resolve([]);
        return;
      }
      
      resolve(algs);
    });
  });
});

ipcMain.handle('update-algorithm', async (_, arg) => {
  return await new Promise((res, rej) => {
    Algorithms.update({ _id: arg._id }, {
      $set: {
        name: arg.name,
        order: arg.order,
        scramble: arg.scramble,
        puzzle: arg.puzzle,
        mode: arg.mode,
        view: arg.view,
        tips: arg.tips,
        solutions: arg.solutions,
      }
      // @ts-ignore
    }, function(err) {
      if ( err ) return rej(err);
      res(arg);
    });
  });
});

ipcMain.handle('add-algorithm', async (_, arg) => {
  return await new Promise((res, rej) => {
    Algorithms.insert({
      name: arg.name,
      shortName: arg.shortName,
      parentPath: arg.parentPath,
      order: arg.order,
      scramble: arg.scramble,
      puzzle: arg.puzzle,
      mode: arg.mode,
      view: arg.view,
      tips: arg.tips,
      solutions: arg.solutions
      // @ts-ignore
    }, function(err, alg) {
      if ( err ) return rej(err);
      res(alg);
    });
  });
});

ipcMain.handle('remove-algorithm', async (_, arg) => {
  let removeQ = [ arg ];

  while ( removeQ.length ) {
    let alg = removeQ.shift();
    let path = [ arg.parentPath.trim(), arg.shortName ].filter(e => e).join('/');

    Algorithms.remove({ _id: alg._id });

    let newAlgs = await new Promise((res) => {
      Algorithms.find({ parentPath: path }, function(err, algs) {
        if ( err ) {
          return res([]);
        }

        res(algs);
      });
    });

    removeQ = [ ...removeQ, ...newAlgs ];
  }

  return true;
});

// return await new Promise((res, rej) => {
// });

/// Tutorials handler
ipcMain.handle('get-tutorials', async (_) => {
  return await new Promise((res, rej) => {
    // @ts-ignore
    Tutorials.find({}, (err, tutorials) => {
      if ( err ) return rej(err);
      res(tutorials);
    });
  });
});

ipcMain.handle('add-tutorial', async (_, arg) => {
  return await new Promise((res, rej) => {
    Tutorials.insert(arg, function(err, tutorial) {
      if ( err ) return rej(err);
      res(tutorial);
    });
  });
});

ipcMain.handle('remove-tutorial', async (_, arg) => {
  return await new Promise((res, rej) => {
    Tutorials.remove({ _id: arg._id }, function(err, tutorial) {
      if ( err ) return rej(err);
      res(tutorial);
    });
  });
});

ipcMain.handle('update-tutorial', async (_, arg) => {
  return await new Promise((res, rej) => {
    Tutorials.update({ _id: arg._id }, {
      $set: {
        title: arg.title,
        titleLower: arg.titleLower,
        puzzle: arg.puzzle,
        algs: arg.algs,
        content: arg.content,
        level: arg.level || 0
      }
      // @ts-ignore
    }, function(err) {
      if ( err ) return rej(err);
      res(arg);
    });
  });
});

/// Sessions handler
ipcMain.handle('get-sessions', async () => {
  return await new Promise((res, rej) => {
    // @ts-ignore
    Sessions.find({}, function(err, sessions) {
      if ( err ) return rej(err);
      res(sessions);
    });
  });
});

ipcMain.handle('add-session', async (event, arg) => {
  return await new Promise((res, rej) => {
    Sessions.insert({
      name: arg.name,
      settings: arg.settings,
      tName: arg.tName || "",
    }, function(err, session) {
      if ( err ) return rej(err);
      res(session);
    });
  });
});

ipcMain.handle('remove-session', async (event, arg) => {
  return await new Promise((res, rej) => {
    Solves.remove({ session: arg._id }, { multi: true }, function(err) {
      Sessions.remove({ _id: arg._id }, function(err1) {
        if ( err ) return rej(err);
        res(arg);
      });
    });
  });

});

ipcMain.handle('rename-session', async (event, arg) => {
  return await new Promise((res, rej) => {
    // @ts-ignore
    Sessions.update({ _id: arg._id }, { $set: { name: arg.name } }, function(err) {
      if ( err ) return rej(err);
      res(arg);
    });
  });
});

ipcMain.handle('update-session', async (event, arg) => {
  return await new Promise((res, rej) => {
    // @ts-ignore
    Sessions.update({ _id: arg._id }, { $set: { name: arg.name, settings: arg.settings } }, function(err) {
      if ( err ) return rej(err);
      res(arg);
    });
  });

});

/// Solves handler
ipcMain.handle('get-solves', async (event) => {
  return await new Promise((res, rej) => {
    // @ts-ignore
    Solves.find({}, (err, solves) => {
      if ( err ) return rej(err);
      res(solves);
    });
  });

});

ipcMain.handle('add-solve', async (event, arg) => {
  return await new Promise((res, rej) => {
    Solves.insert(arg, function(err, solve) {
      if ( err ) return rej(err);
      res(solve);
    });
  });
});

ipcMain.handle('add-solves', async (event, arg) => {
  return await new Promise((res, rej) => {
    Solves.insert(arg, function(err, solves) {
      if ( err ) return rej(err);
      res(solves);
    });
  });
});

ipcMain.handle('update-solve', async (event, arg) => {
  return await new Promise((res, rej) => {
    Solves.update({ _id: arg._id }, {
      $set: {
        comments: arg.comments,
        penalty: arg.penalty,
        time: arg.time,
      }
    // @ts-ignore
    }, (err) => {
      if ( err ) return rej(err);
      res(arg);
    });
  });
});

ipcMain.handle('remove-solves', async (event, arg) => {
  return await new Promise((res, rej) => {
    Solves.remove({ _id: { $in: arg.map(s => s._id) } }, { multi: true }, function(err) {
      if ( err ) return rej(err);
      res(arg);
    });
  });
});

/// Contests handler
ipcMain.handle('get-contests', async (event) => {
  return await new Promise((res, rej) => {
    // @ts-ignore
    Contests.find({}, (err, contests) => {
      if ( err ) return rej(err);
      res(contests);
    });
  });
});

ipcMain.handle('add-contest', async (event, arg) => {
  return await new Promise((res, rej) => {
    Contests.insert(arg, function(err, contest) {
      if ( err ) return rej(err);
      res(contest);
    });
  });
});

ipcMain.handle('update-contest', async (event, arg) => {
  return await new Promise((res, rej) => {
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
    // @ts-ignore
    }, (err) => {
      if ( err ) return rej(err);
      res(arg);
    });
  });
});

ipcMain.handle('remove-contests', async (event, arg) => {
  return await new Promise((res, rej) => {
    Contests.remove({ _id: { $in: arg } }, { multi: true }, function(err) {
      if ( err ) return rej(err);
      res(arg);
    });
  });
});

ipcMain.handle('close', () => {
  app.exit();
  return true;
});

ipcMain.handle('generate-pdf', async (event, arg) => {
  return await new Promise((res, rej) => {
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
          res({
            name: `${arg.mode} - Round ${arg.round}_${date}.pdf`,
            buffer,
            mode: arg.mode,
            round: arg.round,
          });
  
          try {
            unlinkSync(tempFile);
          } catch(err) {}
  
        }).catch(rej);
      });
    
      pdfWin.loadFile(tempFile);
    } catch(err) {
      rej(err);
    }
  });
});

ipcMain.handle('zip-pdf', async (event, data) => {
  return await new Promise((res, rej) => {
    const tmpDir = join( tmpdir(), '/CubeDB/');
    const { name, files } = data;
  
    if ( !existsSync( tmpDir ) ) {
      mkdirSync( tmpDir, { recursive: true } );
    }
    
    const fileName = join(tmpDir, name + '.zip');
    const output = createWriteStream( fileName );  
  
    output.on('close', () => {
      res( fileName );
    });
  
    const archive = archiver('zip', {
      zlib: { level: 1 }
    });
  
    archive.on('error', rej);
    archive.pipe(output);
  
    for (let i = 0, maxi = files.length; i < maxi; i += 1) {
      archive.append(Buffer.from(files[i].buffer), { name: files[i].name });
    }
  
    archive.finalize();
  });
});

ipcMain.handle('open-file', async (_, dir) => {
  shell.openExternal(dir);
});

ipcMain.handle('reveal-file', async(_, dir) => {
  exec('explorer /select,' + dir);
});

// Cache
ipcMain.handle('check-image', async (_, hash) => {
  return cache.has(hash);
});

ipcMain.handle('get-image', async (_, hash) => {
  if ( cache.has(hash) ) {
    return cache.get(hash);
  }

  return '';
});

ipcMain.handle('get-image-bundle', async(_, hashes) => {
  return hashes.map(h => cache.has(h) ? cache.get(h) : '');
});

ipcMain.handle('save-image', async (_, hash, data) => {
  if ( cache.has(hash) ) {
    return true;
  }

  try {
    await fs.writeFile( join(cachePath, hash), data );
    cache.set(hash, data);
    return true;
  } catch(err) {
    console.log('CACHE ERROR: ', err);
  }
});

// Clean unparented solves
Sessions.find({}, (err, ss) => {
  if ( err ) {
    return console.log('Error reading sessions');
  }

  let ids = new Set(ss.map(s => s._id));
  let ids1 = new Set();

  Solves.find({}, (err1, svs) => {
    if ( err1 ) {
      return console.log('Error reading solves');
    }

    let count = 0;

    for (let i = 0, maxi = svs.length; i < maxi; i += 1) {
      if ( !ids.has( svs[i].session ) ) {
        // Solves.remove({ _id: svs[i]._id }, () => {});
        // count += 1;
        ids1.add( svs[i].session );
      }
    }

    let sArr = [ ...ids1 ];

    Solves.remove({ session: { $in: sArr } }, { multi: true });

    console.log("Unparented solves: ", count, "/", svs.length);
  });
});

// AutoUpdater
autoUpdater.disableWebInstaller = true;

if ( !prod ) {
  autoUpdater.updateConfigPath = join(__dirname, '../', 'dev-app-update.yml');
  autoUpdater.forceDevUpdateConfig = true;
}

// Power Management to prevent sleep
// @ts-ignore
let sleepId = -1, win;

ipcMain.handle('sleep', async (_, sleep) => {
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

  // @ts-ignore
  const defaultCallback = (_) => {};
  let selectBluetoothCallback = defaultCallback;
  let bluetoothPinCallback = defaultCallback;

  // Bluetooth handler
  win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    selectBluetoothCallback = callback;
    win.webContents.send('bluetooth', ['device-list', deviceList]);
  });

  ipcMain.handle('connect-bluetooth-device', (event, deviceID) => {
    selectBluetoothCallback(deviceID);
    selectBluetoothCallback = defaultCallback
  });

  ipcMain.handle('cancel-bluetooth-request', (event) => {
    selectBluetoothCallback('');
    selectBluetoothCallback = defaultCallback
  });

  ipcMain.handle('bluetooth-pairing-response', (event, response) => {
    bluetoothPinCallback(response);
    bluetoothPinCallback = defaultCallback;
  });

  win.webContents.session.setBluetoothPairingHandler((details, callback) => {
    bluetoothPinCallback = callback;

    // Send a message to the renderer to prompt the user to confirm the pairing.
    win.webContents.send('bluetooth', ['pairing-request', details]);
  });

  // Update
  ipcMain.handle('update', async (ev, cmd) => {
    return await new Promise((res, rej) => {
      autoUpdater.autoDownload = cmd === 'download';
    
      if ( cmd === 'check' ) {
        autoUpdater.checkForUpdatesAndNotify()
          .then((data) => {
            console.log("RES: ", data);
            res( data ? data.updateInfo.version : null );
          })
          .catch(rej);
      } else if ( cmd === 'download' ) {
        autoUpdater.on('download-progress', (dp) => {
          win.webContents.send('download-progress', dp.percent );
          console.log("PERCENT: ", dp.percent);
        });

        autoUpdater.on('update-downloaded', () => {
          win.webContents.send('update-downloaded');
          console.log("DOWNLOADED!");
        });

        autoUpdater.checkForUpdates()
          .then((r) => { console.log(r); res(null); })
          .catch(rej);
      }
    });
  
  });

  // Second screen
  ipcMain.handle('get-all-displays', () => {
    return screen.getAllDisplays();
  });

  ipcMain.handle('use-display', (_, id) => {
    let dsp = screen.getAllDisplays().find(d => d.id === id);

    if ( dsp ) {
      win.setBounds( dsp.workArea );
    }
  });

  // Other Stuff
  ipcMain.handle('minimize', () => {
    // @ts-ignore
    win.minimize();
  });

  ipcMain.handle('maximize', () => {
    // @ts-ignore
    if ( !win ) return;

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
    let _port = server.address();
    let port = typeof _port === 'string' ? _port : _port ? _port.port : '';

    eApp.set('port', port);
    eApp.use( express.static( join(__dirname, '../dist') ) );

    // @ts-ignore
    eApp.get('*', (_, res) => {
      res.sendFile( join(__dirname, '../dist', 'index.html') );
    });
    
    eApp.listen(0, () => {
      win.loadURL(`http://localhost:${ eApp.get('port') }/`);
      // console.log("URL PORT: ", eApp.get('port'));
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
          calcAoX: 0,
          genImage: true,
          scrambleAfterCancel: false,
          input: 'Keyboard',
          withoutPrevention: true,
          recordCelebration: true,
          showBackFace: false,
          sessionType: 'mixed'
        }
      });
    }
  });

  // @ts-ignore
  Sessions.find({}, (err, sessions) => {
    if ( err ) return;

    for (let i = 0, maxi = sessions.length; i < maxi; i += 1) {
      if ( !sessions[i].settings.sessionType ) {
        sessions[i].settings.sessionType = "mixed";

        // @ts-ignore
        Sessions.update({ _id: sessions[i]._id }, { $set: { settings: sessions[i].settings } }, () => {});
      }
    }
  });

  // @ts-ignore
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
    // @ts-ignore
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
}