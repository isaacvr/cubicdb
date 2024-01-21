import type { Algorithm, AlgorithmOptions, CubeEvent, IPC, ContestPDFOptions, Session, Sheet, Solve, Tutorial, UpdateCommand, PDFOptions } from "@interfaces";
import algs from '../database/algs.json';
import { clone } from "@helpers/object";
import { openDB, type IDBPDatabase } from "idb";
import { randomUUID } from "@helpers/strings";

const AlgorithmStore = 'Algorithms';
const TutorialStore = 'Tutorials';
const SessionStore = 'Sessions';
const SolveStore = 'Solves';
const ContestStore = 'Contests';
const CacheStore = 'Cache';
const dbVersion = 1;
const debug = true;

interface ICacheImg {
  _id: string;
  img: string;
}

export class IndexedDBAdaptor implements IPC {
  cache: Map<string, string>;
  algDB: IDBPDatabase<Algorithm> | null;
  tutDB: IDBPDatabase<Tutorial> | null;
  sesDB: IDBPDatabase<Session> | null;
  solDB: IDBPDatabase<Solve> | null;
  cntDB: IDBPDatabase<CubeEvent> | null;
  cacheDB: IDBPDatabase<ICacheImg> | null;
  private initialized = false;
  private isInit = false;
  private providePutKey = true;

  constructor() {
    this.cache = new Map<string, string>();
    this.algDB = null;
    this.tutDB = null;
    this.sesDB = null;
    this.solDB = null;
    this.cntDB = null;
    this.cacheDB = null;
    
    // Check for the browser since they differ from indexedDB put implementation
    const browsers = [ 'Firefox', 'Edg' ];
    const UA = navigator.userAgent;

    if ( browsers.some(b => UA.includes(b)) ) {
      this.providePutKey = false;
    }

    this.init();
  }

  async init() {
    if ( this.initialized ) return;
    if ( !this.isInit ) {
      this.isInit = true;
    } else {
      await new Promise((res) => {
        let itv = setInterval(() => {
          if ( !this.isInit ) {
            clearInterval(itv);
            res(null);
          }
        }, 50);
      });
      return;
    }
    
    // ALGS
    try {
      this.algDB = await openDB(AlgorithmStore, dbVersion, { upgrade(db) {
        !db.objectStoreNames.contains(AlgorithmStore) && db.createObjectStore(AlgorithmStore, { keyPath: '_id', autoIncrement: false });
        debug && console.log('OK: ', AlgorithmStore);
      }});
    } catch(err) {
      console.log("ERROR: ", err);
    }

    // TUTS
    try {
      this.tutDB = await openDB(TutorialStore, dbVersion, { upgrade(db) {
        !db.objectStoreNames.contains(TutorialStore) && db.createObjectStore(TutorialStore, { keyPath: '_id', autoIncrement: false });
        debug && console.log('OK: ', TutorialStore);
      }});
    } catch(err) {
      console.log("ERROR: ", err);
    }

    // SESS
    try {
      this.sesDB = await openDB(SessionStore, dbVersion, { upgrade(db) {
        !db.objectStoreNames.contains(SessionStore) && db.createObjectStore(SessionStore, { keyPath: '_id', autoIncrement: false });
        debug && console.log('OK: ', SessionStore);
      }});

      // Ensure at least one session
      if ( (await this.sesDB.getAll(SessionStore)).length === 0 ) {
        const tx = this.sesDB.transaction(SessionStore, 'readwrite');
        const id = randomUUID();

        await Promise.all([
          tx.store.put(<Session>{
            _id: id,
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
          }, this.providePutKey ? id : undefined ),
          tx.done
        ]);
      }
    } catch(err) {
      console.log("ERROR: ", err);
    }

    // SOLS
    try {
      this.solDB = await openDB(SolveStore, dbVersion, { upgrade(db) {
        !db.objectStoreNames.contains(SolveStore) && db.createObjectStore(SolveStore, { keyPath: '_id', autoIncrement: false });
        debug && console.log('OK: ', SolveStore);
      }});
    } catch(err) {
      console.log("ERROR: ", err);
    }

    // CONT
    try {
      this.cntDB = await openDB(ContestStore, dbVersion, { upgrade(db) {
        !db.objectStoreNames.contains(ContestStore) && db.createObjectStore(ContestStore, { keyPath: '_id', autoIncrement: false });
        debug && console.log('OK: ', ContestStore);
      }});
    } catch(err) {
      console.log("ERROR: ", err);
    }
    
    // CACHE
    try {
      this.cacheDB = await openDB(CacheStore, dbVersion, { upgrade(db) {
        !db.objectStoreNames.contains(CacheStore) && db.createObjectStore(CacheStore, { keyPath: '_id', autoIncrement: false });
        debug && console.log('OK: ', CacheStore);
      }});

      this.cache.clear();

      let allRecords: ICacheImg[] = await this.cacheDB.getAll(CacheStore);

      for (let i = 0, maxi = allRecords.length; i < maxi; i += 1) {
        let { _id, img } = allRecords[i];
        this.cache.set( _id, img );
      }

      debug && console.log(`Loaded ${allRecords.length} records from cache`);

    } catch(err) {
      console.log("ERROR: ", err);
    }

    this.initialized = true;
    this.isInit = false;
  }

  addDownloadProgressListener(cb: any) {}
  addDownloadDoneListener(cb: any) {}
  addBluetoothListener(cb: any) {}
  
  // Algorithms are handled from a fixed object
  getAlgorithms(options: AlgorithmOptions): Promise<Algorithm[]> {
    if ( options.all ) return Promise.resolve(clone(algs) as Algorithm[]);
    let fAlgs = algs.filter(a => a.parentPath === options.path) as Algorithm[];
    return Promise.resolve( clone(fAlgs) );
  }

  updateAlgorithm(alg: Algorithm) {
    return Promise.reject();
  }
  
  addAlgorithm(alg: Algorithm) {
    return Promise.reject();
  }

  removeAlgorithm(alg: Algorithm) {
    return Promise.reject();
  }
  
  // Tutorials (not for now)
  getTutorials() { return Promise.resolve([]); }
  addTutorial(t: Tutorial) { return Promise.reject(); }
  updateTutorial(t: Tutorial) { return Promise.reject(); }
  
  // Solves
  async getSolves() {
    await this.init();
    if ( !this.solDB ) return [];
    return this.solDB.getAll(SolveStore) as Promise<Solve[]>;
  }
  
  async addSolve(s: Solve) {
    await this.init();
    if ( !this.solDB ) return Promise.resolve(s);

    const tx = this.solDB.transaction(SolveStore, 'readwrite');
    const sv = clone(s);
    sv._id = randomUUID();

    await Promise.all([
      tx.store.put(sv, this.providePutKey ? sv._id : undefined ),
      tx.done
    ]);

    return sv;
  }

  async addSolves(s: Solve[]) {
    await this.init();
    if ( !this.solDB ) return Promise.resolve(s);

    let ss = s.map(sv => {
      const id = randomUUID();
      
      const res: Solve = clone(sv);
      res._id = id;
      return res;
    });

    const tx = this.solDB.transaction(SolveStore, 'readwrite');

    await Promise.all([
      ...ss.map(sv => tx.store.put(sv, this.providePutKey ? sv._id : undefined )),
      tx.done
    ]);

    return ss;
  }

  async updateSolve(s: Solve) {
    await this.init();
    if ( !this.solDB ) return Promise.resolve(s);

    let rs: Solve | undefined = await this.solDB.get(SolveStore, s._id);

    if ( rs ) {
      rs.comments = s.comments;
      rs.penalty = s.penalty;
      rs.time = s.time;

      const tx = this.solDB.transaction(SolveStore, 'readwrite');
      
      await Promise.all([
        tx.store.put(rs, this.providePutKey ? rs._id : undefined ),
        tx.done
      ]);

      return rs;
    }

    return s;
  }

  async removeSolves(s: Solve[]) {
    await this.init();
    if ( !this.solDB ) return Promise.resolve(s);

    const tx = this.solDB.transaction(SolveStore, 'readwrite');
    
    await Promise.all([
      ...s.map(sv => tx.store.delete(sv._id)),
      tx.done
    ]);

    return s;
  }
  
  // Sessions
  async getSessions() {
    await this.init();
    if ( !this.sesDB ) return [];

    return this.sesDB.getAll(SessionStore) as Promise<Session[]>;
  }

  async addSession(s: Session) {
    await this.init();
    if ( !this.sesDB ) return Promise.resolve(s);

    const tx = this.sesDB.transaction(SessionStore, 'readwrite');
    const id = randomUUID();
    
    const ss: Session = {
      _id: id,
      name: s.name,
      settings: s.settings,
      tName: s.tName || ''
    };

    await Promise.all([
      tx.store.put(ss, this.providePutKey ? id : undefined ),
      tx.done
    ]);

    return ss;
  }

  async removeSession(s: Session) {
    await this.init();
    if ( !this.sesDB || !this.solDB ) return Promise.resolve(s);

    const allSolves = (await this.solDB.getAll(SolveStore)).filter((sv: Solve) => sv.session === s._id);
    const stx = this.solDB.transaction(SolveStore, 'readwrite');

    await Promise.all([
      ...allSolves.map(sv => stx.store.delete(sv._id)),
      stx.done
    ]);

    const tx = this.sesDB.transaction(SessionStore, 'readwrite');
    
    await Promise.all([
      tx.store.delete(s._id),
      tx.done
    ]);

    return s;
  }
  
  async renameSession(s: Session) {
    await this.init();
    if ( !this.sesDB ) return Promise.resolve(s);

    let rs: Session | undefined = await this.sesDB.get(SessionStore, s._id);

    if ( rs ) {
      rs.name = s.name;

      const tx = this.sesDB.transaction(SessionStore, 'readwrite');
      
      await Promise.all([
        tx.store.put(rs, this.providePutKey ? rs._id : undefined ),
        tx.done
      ]);

      return rs;
    }

    return s;
  }
  
  async updateSession(s: Session) {
    await this.init();
    if ( !this.sesDB ) return Promise.resolve(s);

    let rs: Session | undefined = await this.sesDB.get(SessionStore, s._id);

    if ( rs ) {
      rs.name = s.name;
      rs.settings = s.settings;

      const tx = this.sesDB.transaction(SessionStore, 'readwrite');
      
      await Promise.all([
        tx.store.put(rs, this.providePutKey ? rs._id : undefined ),
        tx.done
      ]);

      return rs;
    }

    return s;
  }

  // Contests
  addContest(c: CubeEvent) { return Promise.reject(); }
  getContests() { return Promise.resolve([]); }
  updateContest(c: CubeEvent) { return Promise.reject(); }
  removeContests(c: CubeEvent[]) { return Promise.reject(); }

  // UI handlers
  minimize() { return Promise.resolve(); }
  maximize() { return Promise.resolve(); }
  close() { return Promise.resolve(); }

  // PDF generation
  generatePDF(args: PDFOptions) { return Promise.reject(); }
  generateContestPDF(args: ContestPDFOptions) { return Promise.reject(); }
  zipPDF(s: { name: string, files: Sheet[]}) { return Promise.reject(); }
  openFile(f: string) { return Promise.reject(); }
  revealFile(f: string) { return Promise.reject(); }

  // Update
  update(cmd: UpdateCommand) { return Promise.reject(); }
  cancelUpdate() { return Promise.resolve(true); }

  // Power saving options
  sleep(s: boolean) { return Promise.resolve(); }

  connectBluetoothDevice() { return Promise.reject(); }
  cancelBluetoothRequest() { return Promise.reject(); }
  pairingBluetoothResponse() { return Promise.reject(); }
  
  async cacheCheckImage(hash: string): Promise<boolean> {
    await this.init();
    return this.cache.has( hash );
  }

  async cacheGetImage(hash: string): Promise<string> {
    await this.init();
    return this.cache.get(hash) || '';
  }
  
  async cacheGetImageBundle(hashes: string[]): Promise<string[]> {
    await this.init();
    return hashes.map(h => this.cache.get(h) || '');
  }

  async cacheSaveImage(hash: string, data: string): Promise<void> {
    await this.init();
    if ( !this.cacheDB ) return;

    const tx = await this.cacheDB.transaction(CacheStore, 'readwrite');
    
    await Promise.all([
      tx.store.put(<ICacheImg>{
        _id: hash, img: data
      }, this.providePutKey ? hash : undefined ),
      tx.done
    ]);
    
    this.cache.set(hash, data);
  }

  getAllDisplays() { return Promise.resolve([]); }
  useDisplay(id: number) { return Promise.resolve(); }
}