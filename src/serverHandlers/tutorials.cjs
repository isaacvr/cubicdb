module.exports = (ipcMain, Tutorials) => {
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
};
