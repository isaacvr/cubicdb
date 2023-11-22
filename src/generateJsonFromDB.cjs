let fs = require('node:fs/promises');
let path = require('node:path');

let dbPath = path.join( __dirname, 'database' );

async function convert() {
  let files = await fs.readdir(dbPath);
  let dbFiles = files.filter(f => f.endsWith('.db'));

  dbFiles.forEach(async file => {
    let data = (await fs.readFile( path.join(dbPath, file), 'utf-8'));
  
    await fs.writeFile( path.join(dbPath, file.replace(/\.db$/, '.json')), `[
      ${ data.split('\n').filter(e => e).join(',\n') }
    ]` );
  
    console.log('Done: ' + file.replace(/\.db$/, '.json') + '!');
  });
}

convert();