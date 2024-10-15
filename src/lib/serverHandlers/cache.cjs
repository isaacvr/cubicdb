const fsp = require("node:fs/promises");
const { join } = require("node:path");

/**
 * @typedef {import('electron').IpcMain} IpcMain
 *
 * @param {IpcMain} ipcMain
 * @param {string} dbPath
 */
module.exports = (ipcMain, dbPath) => {
  let cachePath = join(dbPath, "ImgCache");

  fsp
    .mkdir(cachePath, { recursive: true })
    .then(() => console.log("Cache path created!"))
    .catch(err => console.log("CACHE ERROR: ", err));

  let cache = new Map();

  (async function () {
    let list = await fsp.readdir(cachePath);

    for (let i = 0, maxi = list.length; i < maxi; i += 1) {
      if ((await fsp.stat(join(cachePath, list[i]))).isFile()) {
        cache.set(list[i], await fsp.readFile(join(cachePath, list[i]), { encoding: "utf8" }));
      }
    }
  })();

  ipcMain.handle("check-image", async (_, hash) => {
    return cache.has(hash);
  });

  ipcMain.handle("get-image", async (_, hash) => {
    if (cache.has(hash)) {
      return cache.get(hash);
    }

    return "";
  });

  ipcMain.handle("get-image-bundle", async (_, hashes) => {
    return hashes.map(h => (cache.has(h) ? cache.get(h) : ""));
  });

  ipcMain.handle("save-image", async (_, hash, data) => {
    if (cache.has(hash)) {
      return true;
    }

    try {
      await fsp.writeFile(join(cachePath, hash), data);
      cache.set(hash, data);
      return true;
    } catch (err) {
      console.log("CACHE ERROR: ", err);
    }
  });

  ipcMain.handle("cache-storage", async () => {
    let res = 0;
    for (let ent of cache) {
      res += ent[1].length;
    }

    return res;
  });

  ipcMain.handle("clear-cache", async () => {
    let list = await fsp.readdir(cachePath);

    for (let i = 0, maxi = list.length; i < maxi; i += 1) {
      if ((await fsp.stat(join(cachePath, list[i]))).isFile()) {
        try {
          await fsp.unlink(join(cachePath, list[i]));
          cache.delete(list[i]);
        } catch {}
      }
    }
  });

  ipcMain.handle("cache-get-all", async () => {
    return [...cache];
  });
};
