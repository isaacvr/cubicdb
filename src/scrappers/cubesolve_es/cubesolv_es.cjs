const { app, BrowserWindow } = require("electron");
let fs = require("node:fs/promises");
let { join } = require("node:path");

function createWindow() {
  let win = new BrowserWindow();
  win.webContents.openDevTools();

  let number = 5000;
  let wc = win.webContents;

  win.loadURL(`http://cubesolv.es/solve/${number}`);

  wc.on("did-finish-load", async () => {
    let url = await wc.executeJavaScript(`window.location.href`);

    console.log("#" + number);

    if (number < 6000) {
      if (url != `http://cubesolv.es/solve/${number}`) {
        number += 1;
        win.loadURL(`http://cubesolv.es/solve/${number}`);
        return;
      }
    } else {
      win.close();
      return;
    }

    let data = await wc.executeJavaScript(`
      (() => {
        let h3 = document.querySelectorAll("h3");
        let scramble = '';
        let solution = '';

        for (let i = 0, maxi = h3.length; i < maxi; i += 1) {
          if ( h3[i].innerText === 'Scramble' ) {
            scramble = h3[i].nextElementSibling.innerText;
          } else if ( h3[i].innerText === 'Solution' ) {
            solution = h3[i].nextElementSibling.innerText;
          }
        }

        return [ document.querySelector("h2").innerText, scramble, solution ];
      })()`);

    console.log("DATA: ", data[0]);

    await fs.writeFile(
      join(__dirname, `${number}.json`),
      JSON.stringify({
        title: data[0],
        scramble: data[1] || "",
        solution: data[2] || "",
      })
    );

    if (number < 6000) {
      number += 1;
      win.loadURL(`http://cubesolv.es/solve/${number}`);
    } else {
      win.close();
    }
  });

  // @ts-ignore
  win.on("closed", () => (win = null));
  return win;
}

try {
  app.on("ready", () => setTimeout(createWindow, 400));

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // @ts-ignore
    if (win === null) {
      createWindow();
    }
  });
} catch (e) {}
