export function checkPath(obj: any, path: string[], useMap: boolean = false): boolean {
  if ( typeof obj === 'undefined' ) return false;

  let tmp = obj;

  for ( let i = 0, maxi = path.length - 1; i < maxi; i += 1 ) {
    if ( typeof tmp === 'undefined' ) return false;
  
    if ( useMap && tmp.has( path[i] ) ) {
      tmp = tmp.get( path[i] );
    } else if ( !useMap && Object.prototype.hasOwnProperty.call(tmp, path[i]) ) {
      tmp = tmp[ path[i] ];
    } else {
      return false;
    }
  }

  return true;
}

export function pushPath(obj: any, path: string[], value: any, useMap: boolean = false): any {
  if ( typeof obj === 'undefined' ) return obj;

  path.reduce((acc, p, pos) => {
    if ( pos + 1 === path.length ) {
      if ( useMap ) {
        acc.get(p).push(value);
      } else {
        acc[p].push(value);
      }
    }

    return useMap ? acc.get(p) : acc[p];
  }, obj);

  return obj;
}

export function createPath(obj: any, path: string[], def: any, useMap: boolean = false): any {
  if ( typeof obj === 'undefined' ) return obj;

  const objSetter = (o: any, p: any, v: any) => o[p] = v;
  const mapSetter = (m: Map<any, any>, p: any, v: any) => m.set(p, v);

  path.reduce((acc, p, pos) => {
    let altV = pos + 1 === path.length
      ? def
      : useMap
        ? new Map<string, any>()
        : {};

    if ( (!pos && acc instanceof Map) || (pos && useMap) ) {
      mapSetter(acc, p, altV); 
    } else {
      objSetter(acc, p, acc[p] || altV);
    }

    return acc instanceof Map ? acc.get(p) : acc[p];
  }, obj);

  return obj;
}

export function clone(obj: any): any {
  switch(typeof obj) {
    case 'boolean':
    case 'number':
    case 'string':
    case 'undefined':
    case 'function':
      return obj;
  }

  if ( typeof obj === 'bigint' ) {
    return BigInt(obj);
  }

  if ( Array.isArray(obj) ) return obj.map(clone);
  
  return Object.entries(obj).reduce((acc: any, e) => {
    acc[ e[0] ] = clone(e[1]);
    return acc;
  }, {});
}