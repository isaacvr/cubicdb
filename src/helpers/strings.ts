export function getSearchParams(loc: string): Map<string, string> {
  return loc.slice(1).split("&").reduce((m, e) => {
    let p = e.split("=").map(s => decodeURIComponent(s));
    m.set(p[0], p[1]);
    return m;
  }, new Map());
}

// Process Keybindings signature
// Copy scramble [Ctrl + C]
export function processKey(str: string) {
  let m = str.match(/\[.*\]$/);

  if ( m ) {
    return [ str.slice(0, m.index).trim(), m[0] ];
  }
  return [str, ''];
}

export function copyToClipboard(s: string) {
  return navigator.clipboard.writeText(s);
}

export function randomUUID () {
  if ( crypto && crypto.randomUUID ) {
    return crypto.randomUUID();
  }

  let lens = [ 8, 4, 4, 4, 12 ];
  let res: string[][] = [];

  for (let i = 0; i < 5; i += 1) {
    res[i] = [];

    for (let j = 0; j < lens[i]; j += 1) {
      res[i].push( (~~(Math.random() * 15)).toString(16) );
    }
  }

  return res.map(s => s.join('')).join('-');
}