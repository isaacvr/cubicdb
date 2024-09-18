const fs = require("node:fs");
const path = require("node:path");

/**
 * @typedef {import('electron').IpcMain} IpcMain
 * @typedef {import('nedb')} NeDB
 *
 * @param {IpcMain} ipcMain
 * @param {NeDB} Solves
 * @param {string} dbPath
 */
module.exports = (ipcMain, Solves, dbPath) => {
  ipcMain.handle("get-solves", async event => {
    return new Promise((res, rej) => {
      // @ts-ignore
      Solves.find({}, (err, solves) => {
        if (err) return rej(err);
        res(solves);
      });
    });
  });

  ipcMain.handle("add-solve", async (event, arg) => {
    return new Promise((res, rej) => {
      Solves.insert(arg, function (err, solve) {
        if (err) return rej(err);
        res(solve);
      });
    });
  });

  ipcMain.handle("add-solves", async (event, arg) => {
    return new Promise((res, rej) => {
      Solves.insert(arg, function (err, solves) {
        if (err) return rej(err);
        res(solves);
      });
    });
  });

  ipcMain.handle("update-solve", async (event, arg) => {
    return new Promise((res, rej) => {
      Solves.update(
        { _id: arg._id },
        {
          $set: {
            comments: arg.comments,
            penalty: arg.penalty,
            time: arg.time,
          },
          // @ts-ignore
        },
        err => {
          if (err) return rej(err);
          res(arg);
        }
      );
    });
  });

  ipcMain.handle("remove-solves", async (event, arg) => {
    return new Promise((res, rej) => {
      Solves.remove({ _id: { $in: arg.map(s => s._id) } }, { multi: true }, function (err) {
        if (err) return rej(err);
        res(arg);
      });
    });
  });

  ipcMain.handle("solves-storage", async () => {
    let stats = fs.statSync(path.join(dbPath, "solves.db"));
    return stats.size;
  });

  ipcMain.handle("clear-solves", async () => {
    return new Promise((res, rej) => {
      Solves.remove({}, { multi: true }, function (err) {
        if (err) return rej(err);
        Solves.once("compaction.done", res);
        Solves.persistence.compactDatafile();
      });
    });
  });

  Solves.find({}).exec((err, docs) => {
    if (err) return;
    let cant = 0;

    docs.forEach(sv => {
      let cnt = sv.time % 10 ? 1 : 0;
      cant += cnt;
      cnt && Solves.update({ _id: sv._id }, { $set: { time: Math.floor(sv.time / 10) * 10 } });
    });

    cant && console.log("%d times with error", cant);
  });
};
