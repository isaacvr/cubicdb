module.exports = (ipcMain, Algorithms) => {
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
    return await new Promise((res, rej) => {
      Algorithms.insert(
        {
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
          // @ts-ignore
        },
        function (err, alg) {
          if (err) return rej(err);
          res(alg);
        }
      );
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
};
