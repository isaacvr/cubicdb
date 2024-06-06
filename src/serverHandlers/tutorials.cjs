module.exports = (ipcMain, Tutorials) => {
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
};

