let fs = require('node:fs/promises');
let { join } = require('node:path');

async function bundle() {
  let list = (await fs.readdir(__dirname)).filter(s => /\.json$/.test(s) && s != 'bundle.json');

  let arr = [];

  for (let i = 0, maxi = list.length; i < maxi; i += 1) {
    arr.push( await fs.readFile( join(__dirname, list[i]) ) );
  }

  fs.writeFile( join(__dirname, 'bundle.json'), `[${ arr.join(',') }]`, 'utf-8' );
}

bundle();