module.exports = (ipcMain, Sessions, Solves) => {
  ipcMain.handle('get-sessions', async () => {
    return await new Promise((res, rej) => {
      // @ts-ignore
      Sessions.find({}, function(err, sessions) {
        if ( err ) return rej(err);
        res(sessions);
      });
    });
  });
  
  ipcMain.handle('add-session', async (event, arg) => {
    return await new Promise((res, rej) => {
      Sessions.insert({
        name: arg.name,
        settings: arg.settings,
        tName: arg.tName || "",
      }, function(err, session) {
        if ( err ) return rej(err);
        res(session);
      });
    });
  });
  
  ipcMain.handle('remove-session', async (event, arg) => {
    return await new Promise((res, rej) => {
      Solves.remove({ session: arg._id }, { multi: true }, function(err) {
        Sessions.remove({ _id: arg._id }, function(err1) {
          if ( err ) return rej(err);
          res(arg);
        });
      });
    });
  
  });
  
  ipcMain.handle('rename-session', async (event, arg) => {
    return await new Promise((res, rej) => {
      // @ts-ignore
      Sessions.update({ _id: arg._id }, { $set: { name: arg.name } }, function(err) {
        if ( err ) return rej(err);
        res(arg);
      });
    });
  });
  
  ipcMain.handle('update-session', async (event, arg) => {
    return await new Promise((res, rej) => {
      // @ts-ignore
      Sessions.update({ _id: arg._id }, { $set: { name: arg.name, settings: arg.settings } }, function(err) {
        if ( err ) return rej(err);
        res(arg);
      });
    });
  
  });

  // Clean unparented solves
  Sessions.find({}, (err, ss) => {
    if ( err ) {
      return console.log('Error reading sessions');
    }

    let ids = new Set(ss.map(s => s._id));
    let ids1 = new Set();

    Solves.find({}, (err1, svs) => {
      if ( err1 ) {
        return console.log('Error reading solves');
      }

      let count = 0;

      for (let i = 0, maxi = svs.length; i < maxi; i += 1) {
        if ( !ids.has( svs[i].session ) ) {
          ids1.add( svs[i].session );
        }
      }

      let sArr = [ ...ids1 ];

      Solves.remove({ session: { $in: sArr } }, { multi: true });

      console.log("Unparented solves: ", count, "/", svs.length);
    });
  });

  Sessions.count({}, function(err, count) {
    if ( !count ) {
      Sessions.insert({
        name: "Session 1",
        settings: {
          hasInspection: true,
          inspection: 15,
          showElapsedTime: true,
          calcAoX: 0,
          genImage: true,
          scrambleAfterCancel: false,
          input: 'Keyboard',
          withoutPrevention: true,
          recordCelebration: true,
          showBackFace: false,
          sessionType: 'mixed'
        }
      });
    }
  });

  // @ts-ignore
  Sessions.find({}, (err, sessions) => {
    if ( err ) return;

    for (let i = 0, maxi = sessions.length; i < maxi; i += 1) {
      if ( !sessions[i].settings.sessionType ) {
        sessions[i].settings.sessionType = "mixed";

        // @ts-ignore
        Sessions.update({ _id: sessions[i]._id }, { $set: { settings: sessions[i].settings } }, () => {});
      }
    }
  });
};