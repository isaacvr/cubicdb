const fsp = require("node:fs/promises");
const path = require("node:path");
const { app } = require("electron");

const FOREIGN_PATH = "https://raw.githubusercontent.com/isaacvr/cubedb-svelte/beta/src/database";

/**
 * @typedef {import('electron').IpcMain} IpcMain
 * @typedef {import('nedb')} NeDB
 *
 * @param {IpcMain} ipcMain
 * @param {NeDB} Algorithms
 * @param {string} dbPath
 */
module.exports = (ipcMain, Algorithms, dbPath) => {
  ipcMain.handle("get-algorithms", async (_, arg) => {
    return await new Promise(res => {
      let filter = arg.all ? {} : { parentPath: arg.path };

      // @ts-ignore
      Algorithms.find(filter, (err, algs) => {
        if (err) {
          res([]);
          return;
        }

        res(algs);
      });
    });
  });

  ipcMain.handle("get-algorithm", async (_, arg) => {
    return await new Promise(res => {
      // @ts-ignore
      Algorithms.findOne({ parentPath: arg.path, shortName: arg.shortName }, (err, algs) => {
        if (err) {
          return res(null);
        }

        res(algs);
      });
    });
  });

  ipcMain.handle("update-algorithm", async (_, arg) => {
    return await new Promise((res, rej) => {
      Algorithms.update(
        { _id: arg._id },
        {
          $set: {
            name: arg.name,
            order: arg.order,
            scramble: arg.scramble,
            puzzle: arg.puzzle,
            mode: arg.mode,
            view: arg.view,
            tips: arg.tips,
            solutions: arg.solutions,
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

  ipcMain.handle("add-algorithm", async (_, arg) => {
    let obj = {
      name: arg.name,
      shortName: arg.shortName,
      parentPath: arg.parentPath,
      order: arg.order,
      scramble: arg.scramble,
      puzzle: arg.puzzle,
      mode: arg.mode,
      view: arg.view,
      tips: arg.tips,
      solutions: arg.solutions,
    };

    if (arg.rotation) {
      obj.rotation = arg.rotation;
    }

    return await new Promise((res, rej) => {
      Algorithms.insert(obj, function (err, alg) {
        if (err) return rej(err);
        res(alg);
      });
    });
  });

  ipcMain.handle("remove-algorithm", async (_, arg) => {
    let removeQ = [arg];

    while (removeQ.length) {
      let alg = removeQ.shift();
      let path = [arg.parentPath.trim(), arg.shortName].filter(e => e).join("/");

      Algorithms.remove({ _id: alg._id });

      let newAlgs = await new Promise(res => {
        Algorithms.find({ parentPath: path }, function (err, algs) {
          if (err) {
            return res([]);
          }

          res(algs);
        });
      });

      removeQ = [...removeQ, ...newAlgs];
    }

    return true;
  });

  ipcMain.handle("algorithms-storage", async () => {
    try {
      let stats = await fsp.stat(path.join(dbPath, "algs.db"));
      return stats.size;
    } catch {
      return 0;
    }
  });

  ipcMain.handle("algorithms-version", async () => {
    try {
      let vs = await fsp.readFile(path.join(dbPath, "versions.json"), { encoding: "utf8" });
      let vsJSON = JSON.parse(vs);

      if (vsJSON.algorithms) {
        return vsJSON.algorithms;
      }
    } catch {}

    return { version: "0.0.0", minVersion: "0.0.0" };
  });

  ipcMain.handle("algorithms-check", async () => {
    try {
      let data = await fetch(FOREIGN_PATH + "/algversion.json").then(res => res.json());

      if (data) {
        return data;
      }
    } catch {}
    return { version: "0.0.0", minVersion: "0.0.0" };
  });

  ipcMain.handle("update-algorithms", async () => {
    try {
      let data = await fetch(FOREIGN_PATH + "/algs.db").then(res => res.text());
      await fsp.writeFile(path.join(dbPath, "algs.db"), data, { encoding: "utf8" });

      let algVersion = await fetch(FOREIGN_PATH + "/algversion.json").then(res => res.text());
      await fsp.writeFile(path.join(dbPath, "algversion.json"), algVersion, { encoding: "utf8" });

      setTimeout(() => {
        app.relaunch({ args: process.argv.slice(1) });
        app.exit(0);
      }, 5000);

      return true;
    } catch {}
    return false;
  });
};
