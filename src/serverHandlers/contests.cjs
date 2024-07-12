/**
 * @typedef {import('electron').IpcMain} IpcMain
 * @typedef {import('nedb')} NeDB
 * 
 * @param {IpcMain} ipcMain 
 * @param {NeDB} Contests
 */
module.exports = (ipcMain, Contests) => {
  
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
};