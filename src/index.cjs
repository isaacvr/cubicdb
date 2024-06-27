const { app, BrowserWindow, ipcMain, shell, powerSaveBlocker, screen } = require("electron");
const { autoUpdater, CancellationToken } = require("electron-updater");
const { join, resolve } = require("path");
const {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  createWriteStream,
  copyFileSync,
} = require("fs");
const { tmpdir, networkInterfaces } = require("os");
const { exec } = require("child_process");
// const { Server } = require("socket.io");

const NeDB = require("nedb");
const archiver = require("archiver");
const express = require("express");
const cors = require("cors");
const https = require("node:https");
const fs = require("node:fs");

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

const args = process.argv.slice(1),
  serve = args.some(val => val === "--serve");

let appPath = app.getAppPath();
let prod = app.isPackaged;
let params = [prod ? appPath.replace(/app\.asar$/, "") : appPath, "src", "database"];
let dbFixedPath = join.apply(null, params);
let dbPath = app.getPath("userData");

// Fixed resources
const fixedResources = ["algs.db", "tutorials.db"];

fixedResources.forEach(res => {
  if (!existsSync(join(dbPath, res))) {
    console.log("Copying files from:\n", join(dbFixedPath, res), "to:\n", join(dbPath, res));
    copyFileSync(join(dbFixedPath, res), join(dbPath, res));
  }
});

// Servers
/// For remote control apps
const eApp = express();

eApp.use(cors());

let server = https
  .createServer(
    {
      key: fs.readFileSync(join(__dirname, "cert", "key.pem")),
      cert: fs.readFileSync(join(__dirname, "cert", "cert.pem")),
    },
    eApp
  )
  .listen();

let _port = server.address();
let port = typeof _port === "string" ? _port : _port ? _port.port : "";

eApp.set("port", port);

// const io = new Server(server, { cors: { origin: "*" } });

ipcMain.on("get-port", ev => (ev.returnValue = port));

// Setup handlers
let Algorithms = new NeDB({ filename: resolve(dbPath, "algs.db"), autoload: true });
let Sessions = new NeDB({ filename: resolve(dbPath, "sessions.db"), autoload: true });
let Solves = new NeDB({ filename: resolve(dbPath, "solves.db"), autoload: true });
let Contests = new NeDB({ filename: resolve(dbPath, "contests.db"), autoload: true });
let Tutorials = new NeDB({ filename: resolve(dbPath, "tutorials.db"), autoload: true });

require("./serverHandlers/algorithms.cjs")(ipcMain, Algorithms, dbPath);
require("./serverHandlers/tutorials.cjs")(ipcMain, Tutorials, dbPath);
require("./serverHandlers/sessions.cjs")(ipcMain, Sessions, Solves, dbPath);
require("./serverHandlers/solves.cjs")(ipcMain, Solves, dbPath);
require("./serverHandlers/contests.cjs")(ipcMain, Contests);
require("./serverHandlers/cache.cjs")(ipcMain, dbPath);

/// Other handlers
ipcMain.handle("close", () => {
  app.exit();
  return true;
});

async function createPDF(width, height, html) {
  return new Promise((res, rej) => {
    let pdfWin = new BrowserWindow({
      width: width,
      height: height,
      webPreferences: { offscreen: true },
      show: false,
    });

    const tmpDir = join(tmpdir(), "/CubeDB/");

    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }

    let tempFile = join(tmpDir, "pdf-" + Math.random().toString().split(".")[1] + ".html");

    try {
      writeFileSync(tempFile, html);

      pdfWin.webContents.once("did-finish-load", () => {
        pdfWin.webContents
          .printToPDF({
            printBackground: true,
            margins: {
              marginType: "none",
            },
          })
          .then(res)
          .catch(rej);
      });

      pdfWin.loadFile(tempFile);
    } catch (err) {
      rej(err);
    }
  });
}

ipcMain.handle("generate-pdf", async (_, arg) => {
  return {
    name: arg.name,
    buffer: await createPDF(arg.width, arg.height, arg.html),
  };
});

ipcMain.handle("generate-contest-pdf", async (_, arg) => {
  let buffer = await createPDF(arg.width, arg.height, arg.html);

  try {
    unlinkSync(tempFile);
  } catch (err) {}

  let date = new Date().toLocaleDateString().replace(/\//g, "-");

  return {
    name: `${arg.mode} - Round ${arg.round}_${date}.pdf`,
    buffer,
    mode: arg.mode,
    round: arg.round,
  };
});

ipcMain.handle("zip-pdf", async (event, data) => {
  return await new Promise((res, rej) => {
    const tmpDir = join(tmpdir(), "/CubeDB/");
    const { name, files } = data;

    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true });
    }

    const fileName = join(tmpDir, name + ".zip");
    const output = createWriteStream(fileName);

    output.on("close", () => {
      res(fileName);
    });

    const archive = archiver("zip", {
      zlib: { level: 1 },
    });

    archive.on("error", rej);
    archive.pipe(output);

    for (let i = 0, maxi = files.length; i < maxi; i += 1) {
      archive.append(Buffer.from(files[i].buffer), { name: files[i].name });
    }

    archive.finalize();
  });
});

ipcMain.handle("open-file", async (_, dir) => {
  shell.openExternal(dir);
});

ipcMain.handle("reveal-file", async (_, dir) => {
  exec("explorer /select," + dir);
});

// AutoUpdater
autoUpdater.disableWebInstaller = true;

if (!prod) {
  autoUpdater.updateConfigPath = join(__dirname, "../", "dev-app-update.yml");
  autoUpdater.forceDevUpdateConfig = true;
}

// Power Management to prevent sleep
// @ts-ignore
let sleepId = -1,
  win;

ipcMain.handle("sleep", async (_, sleep) => {
  if (sleep) {
    !powerSaveBlocker.isStarted(sleepId) &&
      (sleepId = powerSaveBlocker.start("prevent-display-sleep"));
  } else {
    powerSaveBlocker.isStarted(sleepId) && powerSaveBlocker.stop(sleepId);
  }
});

// JUST FOR DEV ONLY
app.commandLine.appendSwitch("ignore-certificate-errors");
app.commandLine.appendSwitch("allow-insecure-localhost", "true");

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
      preload: join(__dirname, "preload.js"),
    },
    icon: join(__dirname, "../public/assets", "icon-big.png"),
  });

  // @ts-ignore
  const defaultCallback = _ => {};
  let selectBluetoothCallback = defaultCallback;
  let bluetoothPinCallback = defaultCallback;

  // Bluetooth handler
  win.webContents.on("select-bluetooth-device", (event, deviceList, callback) => {
    event.preventDefault();
    selectBluetoothCallback = callback;
    win.webContents.send("bluetooth", ["device-list", deviceList]);
  });

  ipcMain.handle("connect-bluetooth-device", (event, deviceID) => {
    selectBluetoothCallback(deviceID);
    selectBluetoothCallback = defaultCallback;
  });

  ipcMain.handle("cancel-bluetooth-request", event => {
    selectBluetoothCallback("");
    selectBluetoothCallback = defaultCallback;
  });

  ipcMain.handle("bluetooth-pairing-response", (event, response) => {
    bluetoothPinCallback(response);
    bluetoothPinCallback = defaultCallback;
  });

  win.webContents.session.setBluetoothPairingHandler((details, callback) => {
    bluetoothPinCallback = callback;

    // Send a message to the renderer to prompt the user to confirm the pairing.
    win.webContents.send("bluetooth", ["pairing-request", details]);
  });

  let cancellationToken = null;

  // Update
  ipcMain.handle("update", async (ev, cmd) => {
    return await new Promise((res, rej) => {
      autoUpdater.autoDownload = cmd === "download";

      if (cmd === "check") {
        autoUpdater
          .checkForUpdatesAndNotify()
          .then(data => {
            // console.log("RES: ", data);
            res(data ? data.updateInfo.version : null);
          })
          .catch(rej);
      } else if (cmd === "download") {
        if (cancellationToken) {
          throw new Error(`Already downloading`);
        }

        cancellationToken = new CancellationToken();

        autoUpdater.on("download-progress", dp => {
          win.webContents.send("download-progress", dp.percent);
          // console.log("PERCENT: ", dp.percent);
        });

        autoUpdater.on("update-downloaded", () => {
          win.webContents.send("update-downloaded");
          // console.log("DOWNLOADED!");
          cancellationToken = null;
        });

        autoUpdater
          .downloadUpdate(cancellationToken)
          .then(r => {
            console.log(r);
            res(null);
          })
          .catch(err => {
            cancellationToken = null;
            rej(err);
          });
      }
    });
  });

  ipcMain.handle("cancel-update", async () => {
    cancellationToken?.cancel();
    cancellationToken = null;
    return true;
  });

  // Second screen
  ipcMain.handle("get-all-displays", () => {
    return screen.getAllDisplays();
  });

  ipcMain.handle("use-display", (_, id) => {
    let dsp = screen.getAllDisplays().find(d => d.id === id);

    if (dsp) {
      win.setBounds(dsp.workArea);
    }
  });

  // Other Stuff
  ipcMain.handle("minimize", () => {
    // @ts-ignore
    win.minimize();
  });

  ipcMain.handle("maximize", () => {
    // @ts-ignore
    if (!win) return;

    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  // require("./serverHandlers/socket.cjs")(ipcMain, io);

  // console.log("PORT: ", port, serve, networkInterfaces());

  if (serve || !prod) {
    // win.webContents.openDevTools();

    // electronReload(__dirname, {
    //   electron: join(__dirname, '../node_modules', 'electron', 'dist', 'electron.exe'),
    //   awaitWriteFinish: true,
    // });

    win.loadURL("http://localhost:5432/");
    eApp.listen(0, () => {
      console.log("LISTENING ON PORT: ", eApp.get("port"));
    });
  } else {
    eApp.use(express.static(join(__dirname, "../dist")));
    eApp.get("*", (_, res) => {
      res.sendFile(join(__dirname, "../dist", "index.html"));
    });
    eApp.listen(0, () => {
      win.loadURL(`https://localhost:${eApp.get("port")}/`);
    });
  }

  // @ts-ignore
  win.on("closed", () => (win = null));

  return win;
}

try {
  app.on("ready", () => setTimeout(createWindow, 400));

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // @ts-ignore
    if (win === null) {
      createWindow();
    }
  });
} catch (e) {}
