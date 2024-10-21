const fsp = require("node:fs/promises");
const path = require("node:path");
const { app } = require("electron");

const FOREIGN_PATH = "https://raw.githubusercontent.com/isaacvr/cubicdb/beta/src/lib/fixed";
/**
 * @typedef {import('electron').IpcMain} IpcMain
 * @typedef {import('nedb')} NeDB
 *
 * @param {IpcMain} ipcMain
 * @param {NeDB} Reconstructions
 * @param {string} dbPath
 */
module.exports = (ipcMain, Reconstructions, dbPath) => {
  ipcMain.handle("get-reconstructions", async _ => {
    return await new Promise((res, rej) => {
      // @ts-ignore
      Reconstructions.find({}, (err, recs) => {
        if (err) return rej(err);
        res(recs);
      });
    });
  });

  ipcMain.handle("add-reconstruction", async (_, arg) => {
    let nRec = { ...arg };

    delete nRec._id;

    return await new Promise((res, rej) => {
      Reconstructions.insert(nRec, function (err, rec) {
        if (err) return rej(err);
        res(rec);
      });
    });
  });

  ipcMain.handle("reconstructions-storage", async () => {
    try {
      let stats = await fsp.stat(path.join(dbPath, "reconstructions.db"));
      return stats.size;
    } catch {
      return 0;
    }
  });

  ipcMain.handle("reconstructions-version", async () => {
    try {
      let vs = await fsp.readFile(path.join(dbPath, "recversion.json"), { encoding: "utf8" });
      let vsJSON = JSON.parse(vs);
      return vsJSON;
    } catch (err) {
      console.log("ERROR: ", err);
    }

    return { version: "0.0.0", minVersion: "0.0.0" };
  });

  ipcMain.handle("reconstructions-check", async () => {
    try {
      let data = await fetch(FOREIGN_PATH + "/recversion.json", { cache: "no-store" }).then(res =>
        res.json()
      );
      console.log("DATA: ", data);
      if (data) {
        return data;
      }
    } catch {}
    return { version: "0.0.0", minVersion: "0.0.0" };
  });

  ipcMain.handle("update-reconstructions", async () => {
    try {
      let data = await fetch(FOREIGN_PATH + "/reconstructions.db", { cache: "no-store" }).then(
        res => res.text()
      );
      await fsp.writeFile(path.join(dbPath, "reconstructions.db"), data, { encoding: "utf8" });

      let tutVersion = await fetch(FOREIGN_PATH + "/recversion.json", { cache: "no-store" }).then(
        res => res.text()
      );
      await fsp.writeFile(path.join(dbPath, "recversion.json"), tutVersion, { encoding: "utf8" });

      setTimeout(() => {
        app.relaunch({ args: process.argv.slice(1) });
        app.exit(0);
      }, 5000);

      return true;
    } catch {}
    return false;
  });
};
