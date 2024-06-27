const fsp = require("node:fs/promises");
const path = require("node:path");
const { app } = require("electron");

const FOREIGN_PATH = "https://raw.githubusercontent.com/isaacvr/cubedb-svelte/beta/src/database";
/**
 * @typedef {import('electron').IpcMain} IpcMain
 * @typedef {import('nedb')} NeDB
 *
 * @param {IpcMain} ipcMain
 * @param {NeDB} Tutorials
 * @param {string} dbPath
 */
module.exports = (ipcMain, Tutorials, dbPath) => {
  ipcMain.handle("get-tutorials", async _ => {
    return await new Promise((res, rej) => {
      // @ts-ignore
      Tutorials.find({}, (err, tutorials) => {
        if (err) return rej(err);
        res(tutorials);
      });
    });
  });

  ipcMain.handle("get-tutorial", async (_, puzzle, shortName, lang) => {
    return await new Promise((res, rej) => {
      // @ts-ignore
      Tutorials.findOne({ puzzle, shortName, lang }, (err, tutorial) => {
        if (err) return rej(err);
        res(tutorial || null);
      });
    });
  });

  ipcMain.handle("add-tutorial", async (_, arg) => {
    let nTut = { ...arg };

    delete nTut._id;

    return await new Promise((res, rej) => {
      Tutorials.insert(nTut, function (err, tutorial) {
        if (err) return rej(err);
        res(tutorial);
      });
    });
  });

  ipcMain.handle("remove-tutorial", async (_, arg) => {
    return await new Promise((res, rej) => {
      Tutorials.remove({ _id: arg._id }, function (err, tutorial) {
        if (err) return rej(err);
        res(tutorial);
      });
    });
  });

  ipcMain.handle("update-tutorial", async (_, arg) => {
    return await new Promise((res, rej) => {
      Tutorials.update(
        { _id: arg._id },
        {
          $set: {
            ...arg,
          },
          // @ts-ignore
        },
        function (err) {
          if (err) return rej(err);
          res(arg);
        }
      );
    });
  });

  ipcMain.handle("tutorials-storage", async () => {
    try {
      let stats = await fsp.stat(path.join(dbPath, "tutorials.db"));
      return stats.size;
    } catch {
      return 0;
    }
  });

  ipcMain.handle("tutorials-version", async () => {
    try {
      let vs = await fsp.readFile(path.join(dbPath, "versions.json"), { encoding: "utf8" });
      let vsJSON = JSON.parse(vs);

      if (vsJSON.tutorials) {
        return vsJSON.tutorials;
      }
    } catch (err) {
      console.log("ERROR: ", err);
    }

    return { version: "0.0.0", minVersion: "0.0.0" };
  });

  ipcMain.handle("tutorials-check", async () => {
    try {
      let data = await fetch(FOREIGN_PATH + "/tutversion.json").then(res => res.json());

      if (data) {
        return data;
      }
    } catch {}
    return { version: "0.0.0", minVersion: "0.0.0" };
  });

  ipcMain.handle("update-tutorials", async () => {
    try {
      let data = await fetch(FOREIGN_PATH + "/tutorials.db").then(res => res.text());
      await fsp.writeFile(path.join(dbPath, "tutorials.db"), data, { encoding: "utf8" });

      let tutVersion = await fetch(FOREIGN_PATH + "/tutversion.json").then(res => res.text());
      await fsp.writeFile(path.join(dbPath, "tutversion.json"), tutVersion, { encoding: "utf8" });

      setTimeout(() => {
        app.relaunch({ args: process.argv.slice(1) });
        app.exit(0);
      }, 5000);

      return true;
    } catch {}
    return false;
  });
};
