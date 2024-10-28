const fs = require("node:fs/promises");
const { join } = require("node:path");

/**
 * @typedef {import('electron').IpcMain} IpcMain
 *
 * @param {IpcMain} ipcMain
 * @param {string} dbPath
 */
module.exports = (ipcMain, dbPath) => {
  ipcMain.handle("get-config", async () => {
    try {
      let file = await fs.readFile(join(dbPath, "user-config.json"), "utf-8");
      let config = JSON.parse(file);
      return config;
    } catch (err) {
      console.log("ERROR: ", err);
      return null;
    }
  });

  ipcMain.handle("save-config", async (event, arg) => {
    try {
      await fs.writeFile(join(dbPath, "user-config.json"), JSON.stringify(arg), "utf-8");
    } catch {}
  });
};
