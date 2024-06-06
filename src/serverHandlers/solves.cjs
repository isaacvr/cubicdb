module.exports = (ipcMain, Solves) => {
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
};