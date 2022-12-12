import type { AverageSetting, Solve, Statistics, TimerState, Session } from "@interfaces";

function debug(...args) {
  // console.log.apply(null, args);
}

function getTime(n: number, ndec: boolean, suff): string {
  return transform(n, ndec, suff);
}

let LAST_CLICK = 0;

export class TimerClass {
  state: TimerState;
  decimals: boolean;
  time: number;
  hasInspection: boolean;
  inspectionTime: number;
  showTime: boolean;
  scramble: string;
  cross: string[];
  xcross: string;
  stateMessage: string;
  stats: Statistics;
  AoX: number;
  preview: string;
  Ao5: number[];
  calcAoX: AverageSetting;

  group: number;
  groups: string[];
  
  mode: { 0: string, 1: string, 2: number };
  modes: { 0: string, 1: string, 2: number }[];
  
  filters: string[];

  prob: number;

  allSolves: Solve[];
  solves: Solve[];
  lastSolve: Solve;
  session: Session;
  sessions: Session[];
  tab: number;
  hint: boolean;
  hintDialog: boolean;
  selected: number;
  ready: boolean;

  private ref: number;
  private refPrevention: number;
  private itv: any;
  private isValid: boolean;
  private enableKeyboard: boolean;

  /// Subscription
  // private subs: Subscription[];

  /// Test
  // lineChartData: ChartDataSets[] = [];
  // lineChartLabels: Label[] = [];
  // lineChartOptions: ChartOptions = {
  //   responsive: true,
  //   maintainAspectRatio: false,
  //   legend: {
  //     labels: {
  //       // fontColor: 'black'
  //       fontColor: '#bbbbbb'
  //     },
  //   },
  //   scales: {
  //     xAxes: [
  //       {
  //         ticks: {
  //           display: false, 
  //         },
  //         gridLines: {
  //           display: false
  //         },
  //       }
  //     ],
  //     yAxes: [
  //       {
  //         id: 'y',
  //         position: 'left',
  //         gridLines: {
  //           color: '#555'
  //         },
  //         ticks: {
  //           // fontColor: 'black',
  //           fontColor: '#bbbbbb',
  //           callback: (value) => {
  //             return getTime(<number> value, false, true);
  //           }
  //         }
  //       }
  //     ]
  //   },
  //   layout: {
  //     padding: {
  //       left: 10,
  //       right: 10,
  //     },
  //   },
  //   tooltips: {
  //     mode: 'nearest',
  //     intersect: false,
  //     callbacks: {
  //       label: function(tooltipItem, data) {
  //         let label = data.datasets[ tooltipItem.datasetIndex ].label;
  //         return label + ": " + getTime(+tooltipItem.yLabel, false, true);
  //       },
  //       title: (items) => 'Solve #' + (+items[0].xLabel + 1)
  //     },
  //   }
  // };
  // lineChartColors: Color[] = [];
  // lineChartLegend = true;
  // lineChartType = 'line';
  // lineChartPlugins = [];

  constructor() {
    this.inspectionTime = 15000;
    this.hasInspection = true;
    this.showTime = true;
    this.time = 0;
    this.ref = 0;
    this.refPrevention = 0;
    this.state = TimerState.CLEAN;
    this.tab = 0;
    this.hint = false;
    this.selected = 0;
    this.AoX = 100;
    this.enableKeyboard = true;
    this.preview = '';
    this.calcAoX = AverageSetting.GROUP;

    this.Ao5 = null;

    this.ready = false;
    this.decimals = true;
    this.isValid = true;

    this.scramble = null;
    this.stateMessage = 'Starting...';

    this.groups = MENU.map(e => e[0]);

    this.modes = [];
    this.filters = [];
    this.cross = [];
    this.solves = [];
    this.allSolves = [];

    this.lastSolve = null;

    this.stats = {
      best: { value: 0, better: false },
      worst: { value: 0, better: false },
      count: { value: 0, better: false },
      avg: { value: 0, better: false },
      dev: { value: 0, better: false },
      Mo3: { value: -1, better: false },
      Ao5: { value: -1, better: false },
      Ao12: { value: -1, better: false },
      Ao50: { value: -1, better: false },
      Ao100: { value: -1, better: false },
      Ao200: { value: -1, better: false },
      Ao500: { value: -1, better: false },
      Ao1k: { value: -1, better: false },
      Ao2k: { value: -1, better: false },
      __counter: 0,
    };

    this.subs = [
      this.dataService.solveSub.subscribe((data) => {

        if ( !data.data ) {
          return;
        }

        switch(data.type) {
          case 'get-solves': {
            this.allSolves = data.data;
            this.setSolves();
            break;
          }
          case 'add-solve': {
            let s = this.allSolves.find(s => s.date === data.data[0].date);
            s._id = data.data[0]._id;
            this.updateSolves();
            break;
          }
          case 'remove-solves': {
            let ids = data.data;
            for (let i = this.allSolves.length - 1; i >= 0; i -= 1) {
              if ( ids.indexOf(this.allSolves[i]._id) > -1 ) {
                this.allSolves.splice(i, 1);
              }
            }
            this.setSolves();
            break;
          }
        }
      }),
      this.themeService.subscr.subscribe((name) => {
        if ( name === 'dark' ) {
          this.lineChartOptions.legend.labels.fontColor = '#bbbbbb';
          this.lineChartOptions.scales.yAxes[0].ticks.fontColor = '#bbbbbb';
          // this.lineChartColors = [
          //   { borderColor: "#e23c7e", pointBackgroundColor: "#e23c7e", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#b651e1", pointBackgroundColor: "#b651e1", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#3166c9", pointBackgroundColor: "#3166c9", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#63ab75", pointBackgroundColor: "#63ab75", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#ab8254", pointBackgroundColor: "#ab8254", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#ffffff", pointBackgroundColor: "#ffffff", pointRadius: 2, borderWidth: 2 },
          // ];
        } else {
          // this.lineChartColors = [
          //   { borderColor: "#cc0063", pointBackgroundColor: "#cc0063", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#8d28b8", pointBackgroundColor: "#8d28b8", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#0359b5", pointBackgroundColor: "#0359b5", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#0b982f", pointBackgroundColor: "#0b982f", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#ad5f05", pointBackgroundColor: "#ad5f05", pointRadius: 2, borderWidth: 1 },
          //   { borderColor: "#555555", pointBackgroundColor: "#555555", pointRadius: 2, borderWidth: 2 },
          // ];
          this.lineChartOptions.legend.labels.fontColor = 'black';
          this.lineChartOptions.scales.yAxes[0].ticks.fontColor = 'black';
        }
      }),
      this.dataService.sessSub.subscribe((data) => {
        
        if ( !data.data ) {
          return;
        }

        switch ( data.type ) {
          case 'get-sessions': {
            this.sessions = <Session[]> data.data;
            let ss = localStorage.getItem('session');
            let currentSession = this.sessions.find(s => s._id === ss);

            if ( currentSession ) {
              this.session = currentSession;
            } else {
              this.session = this.sessions[0];
            }
            this.selectedSession();
            localStorage.setItem('session', this.session._id);
            break;
          }
          case 'rename-session': {
            let session = <Session> data.data;
            let renamedSession = this.sessions.find(s => s._id === session._id);
            renamedSession.name = session.name;
            break;
          }
          case 'add-session': {
            this.sessions.push(<Session> data.data);
            this.session = <Session> data.data;
            break;
          }
        }
      }),
    ];

    this.themeService.getTheme();
    this.dataService.getSessions();
    this.dataService.getSolves();

  }

  ngOnInit() {

    this.group = 0;
    this.selectedGroup();
    this.updateChart();
    this.updateStatistics(false);
    
    debug('SCRAMBLERS', all.pScramble.scramblers);

  }

  ngOnDestroy() {
    for (let i = 0, maxi = this.subs.length; i < maxi; i += 1) {
      this.subs[i].unsubscribe();
    }
  }

  changeAoX(event: { target: HTMLInputElement }) {
    this.AoX = Math.min(Math.max(10, ~~event.target.value), 10000);
    this.lineChartData[4].data = TimerComponent.getAverage(this.AoX, this.solves, this.calcAoX);
    this.lineChartData[4].label = 'Ao' + this.AoX;
  }

  static getAverage(n: number, arr: Solve[], calc: AverageSetting): number[] {
    let res = [];
    let len = arr.length - 1;
    let elems = [];
    let disc = (n === 3) ? 0 : Math.ceil(n * 0.05);
 
    for (let i = 0, maxi = len; i <= maxi; i += 1) {
      if ( arr[len - i].penalty === Penalty.DNF ) {
        res.push(null);
        continue;
      }

      elems.push( arr[len - i].time );
      if ( elems.length < n ) {
        res.push(null);
      } else {
        let e1 = elems.map(e => e).sort((a, b) => a - b);
        let sumd = e1.reduce((s, e, p) => {
          return (p >= disc && p < n - disc) ? s + e : s;
        }, 0);
        
        res.push( sumd / (n - disc * 2) );

        calc === AverageSetting.GROUP && (elems.length = 0);
        calc === AverageSetting.SEQUENTIAL && elems.shift();
      }
    }

    return res;
  }

  static getBest(arr: Solve[], rev?: boolean): any[] {
    let best = Infinity;
    let bests = [];
    let len = arr.length - 1;
    
    let idx = (i: number) => rev ? len - i : i;

    for (let i = 0, maxi = len + 1; i < maxi; i += 1) {
      if ( arr[ idx(i) ].penalty === Penalty.DNF ) {
        continue;
      }
      if ( arr[ idx(i) ].time < best ) {
        best = arr[ idx(i) ].time;
        bests.push({ x: i.toString(), y: best });
      }
    }

    return bests;
  }

  updateStatistics(inc ?: boolean) {
    let AON = [ 3, 5, 12, 50, 100, 200, 500, 1000, 2000 ];
    let AVG = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
    let BEST = [ Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity ];
    let len = this.solves.length;
    let sum = 0;
    let avg = 0;
    let dev = 0;
    let bw = this.solves.reduce((ac: number[], e) => {
      if ( e.penalty === Penalty.DNF ) {
        len -= 1;
      } else {
        sum += e.time;
      }
      return ( e.penalty === Penalty.DNF ) ? ac : [ Math.min(ac[0], e.time), Math.max(ac[1], e.time) ];
    }, [Infinity, 0]);

    avg = (len > 0) ? sum / len : null;
    dev = (len > 0) ? Math.sqrt( this.solves.reduce((acc, e) => {
      return e.penalty === Penalty.DNF ? acc : (acc + (e.time - avg)**2 / len);
    }, 0) ) : null;
    
    for (let i = 0, maxi = AON.length; i < maxi; i += 1) {
      let avgs = TimerComponent.getAverage(AON[i], this.solves, this.calcAoX);
      BEST[i] = avgs.reduce((b, e) => (e) ? Math.min(b, e) : b, BEST[i]);
      let lastAvg = avgs.pop();
      AVG[i] = ( lastAvg ) ? lastAvg : -1;
    }

    let ps = Object.assign({}, this.stats);

    this.stats = {
      best:  { value: bw[0], better: ps.best.value > bw[0] },
      worst: { value: bw[1], better: false },
      avg:   { value: avg, better: false },
      dev:   { value: dev, better: false },
      count: { value: this.solves.length, better: false },
      Mo3:   { value: AVG[0], better: AVG[0] <= BEST[0] },
      Ao5:   { value: AVG[1], better: AVG[1] <= BEST[1] },
      Ao12:  { value: AVG[2], better: AVG[2] <= BEST[2] },
      Ao50:  { value: AVG[3], better: AVG[3] <= BEST[3] },
      Ao100: { value: AVG[4], better: AVG[4] <= BEST[4] },
      Ao200: { value: AVG[5], better: AVG[5] <= BEST[5] },
      Ao500: { value: AVG[6], better: AVG[6] <= BEST[6] },
      Ao1k:  { value: AVG[7], better: AVG[7] <= BEST[7] },
      Ao2k:  { value: AVG[8], better: AVG[8] <= BEST[8] },
      __counter: (inc) ? ps.__counter + 1 : ps.__counter,
    };

    if ( this.stats.best.better && ps.best.value != Infinity ) {
      this.ripple.launch({
        centered: true,
        color: '#00ff0099'
      });
    }

  }

  updateChart() {

    let len = this.solves.length - 1;
    // this.lineChartLabels = this.solves.map((e, p) => p.toString());
    this.lineChartData = [
      {
        data: this.solves.map((e, p) => this.solves[len - p].time),
        type: 'line',
        fill: false,
        label: 'Time',
        lineTension: 0
      }
    ];
    let avgs = [ 5, 12, 50, this.AoX ];
    
    avgs.forEach(e => {
      this.lineChartData.push({
        data: TimerComponent.getAverage(e, this.solves, this.calcAoX),
        type: 'line',
        fill: false,
        label: 'Ao' + e,
        lineTension: 0,
        hidden: true,
      });
    });

    this.lineChartData.push({
      data: TimerComponent.getBest(this.solves, true),
      type: 'line',
      fill: false,
      label: 'Best',
      lineTension: 0,
      borderDash: [5, 5]
    });
  }

  createNewSolve() {
    this.lastSolve = {
      date: null,
      penalty: Penalty.NONE,
      scramble: this.scramble,
      time: this.time,
      comments: '',
      selected: false,
      session: ""
    };
  }

  setSolves() {
    this.sortSolves();
    this.updateChart();
    this.updateStatistics(true);
    if ( this.solves.length > 0 ) {
      this.setConfigFromSolve(this.solves[0]);
    }
  }

  initScrambler(scr?: string, mode ?: string) {
    this.scramble = null;
    this.hintDialog = false;

    debug('CROSS NULL');

    setTimeout(() => {
      debug('PUZZLE_MODE_FILTER_PROB: ', this.mode);
      let md = (mode) ? mode : this.mode[1];

      this.scramble = (scr) ? scr : all.pScramble.scramblers.get(md).apply(null, [
        md, Math.abs(this.mode[2]), this.prob < 0 ? undefined : this.prob
      ]).replace(/\\n/g, '<br>').trim(); 

      let modes = ["333", "333fm" ,"333oh" ,"333o" ,"easyc" ,"333ft"];

      if ( modes.indexOf(md) > -1 ) {
        this.cross = solve_cross(this.scramble).map(e => e.map(e1 => e1.trim()).join(' '))[0];
        this.xcross = solve_xcross(this.scramble, 0).map(e => e.trim()).join(' ');
        
        debug("CROSS", this.cross);
        debug("XCROSS", this.xcross);
        this.hintDialog = true;
      } else {
        this.hint = false;
        this.hintDialog = false;
      }

      if ( all.pScramble.options.has(md) ) {        
        let cb = Puzzle.fromSequence(
          this.scramble, all.pScramble.options.get(md)
        );
        let subscr = generateCubeBundle([cb], 500).subscribe({
            next: (img: string) => {
              this.preview = img;
            },
            complete: () => {
              subscr.unsubscribe();
            }
        });
      }

      debug(this.scramble);
    }, 10);
  }

  runTimer(direction: number, roundUp ?: boolean) {
    this.itv = setInterval(() => {
      let t = (direction < 0) ? this.ref - performance.now() : performance.now() - this.ref;

      if ( roundUp ) {
        t = Math.ceil(t / 1000) * 1000;
      }

      if ( t <= 0 ) {
        this.time = 0;
        this.stopTimer();
        debug('+2');
        this.lastSolve.penalty = Penalty.P2;
        return;
      }

      this.time = ~~t;
    }, 47);
  }

  stopTimer() {
    if ( this.time != 0 ) {
      this.time = performance.now() - this.ref;
    }
    clearInterval(this.itv);
  }

  dnf() {
    if ( this.lastSolve.penalty === Penalty.P2 ) {
      this.lastSolve.time -= 2000;
      this.time -= 2000;
    }
    this.lastSolve.penalty = (this.lastSolve.penalty != Penalty.DNF) ? Penalty.DNF : Penalty.NONE;
  }

  plus2() {
    this.lastSolve.penalty = (this.lastSolve.penalty != Penalty.P2) ? Penalty.P2 : Penalty.NONE;
    if ( this.lastSolve.penalty === Penalty.P2 ) {
      this.lastSolve.time += 2000;
      this.time += 2000;
    } else {
      this.lastSolve.time -= 2000;
      this.time -= 2000;
    }
  }

  addSolve() {
    this.lastSolve.date = Date.now();
    this.lastSolve.time = this.time;
    this.lastSolve.group = this.group;
    this.lastSolve.mode = this.mode[1];
    this.lastSolve.len = this.mode[2];
    this.lastSolve.prob = this.prob;
    this.lastSolve.session = this.session._id;
    this.allSolves.push( this.lastSolve );
    this.solves.push( this.lastSolve );
    this.dataService.addSolve(this.lastSolve);
    this.sortSolves();
    this.updateChart();
    this.updateStatistics(true);
  }

  sortSolves() {
    this.allSolves.sort((a, b) => b.date - a.date);
    this.updateSolves();
  }

  updateSolves() {
    this.solves = this.allSolves.filter(s => s.session === this.session._id);
    let arr = [];

    for (let i = 0, j = 0, maxi = this.solves.length; i < maxi && j < 4; i += 1) {
      if ( this.solves[i].penalty != Penalty.DNF ) {
        arr.push( this.solves[i].time );
        j += 1;
      }
    }

    if ( arr.length === 4 ) {
      arr.sort();
      let sum = arr.reduce((ac, e) => ac + e, 0);
      this.Ao5 = [ ( sum - arr[3] ) / 3, ( sum - arr[0] ) / 3 ].sort((a, b) => a - b);
    } else {
      this.Ao5 = null;
    }
  }

  selectedGroup() {
    this.modes = MENU[ this.group ][1];
    this.mode = this.modes[0];
    debug('MENU_GROUP_MODES_MODE: ', MENU, this.group, this.modes, this.mode);
    this.selectedMode();
  }

  selectedMode() {
    this.filters = all.pScramble.filters.get(this.mode[1]) || [];
    debug('FILTERS_PUZZLE: ', this.filters);
    this.prob = -1;
    this.selectedFilter();
  }

  selectedFilter() {
    this.initScrambler();
  }

  handleTab(idx) {
    if ( idx != 1 ) {
      this.selectNone();
    }
  }

  solveClick(solve: Solve, force?: boolean) {
    if ( this.tab != 1 ) {
      return;
    }
    if ( this.selected || force ) {
      solve.selected = !solve.selected;
      this.selected += (solve.selected) ? 1 : -1;
    }
  }

  handleClick(s: Solve) {
    if ( performance.now() - LAST_CLICK < 200 || this.selected ) {
      this.solveClick(s, true);
    } else {
      setTimeout(() => performance.now() - LAST_CLICK >= 200 && this.editSolve(s), 200);
    }
    LAST_CLICK = performance.now();
  }

  selectAll() {
    this.selected = this.solves.length;
    for (let i = 0, maxi = this.selected; i < maxi; i += 1) {
      this.solves[i].selected = true;
    }
  }

  selectInvert() {
    this.selected = this.solves.length - this.selected;
    for (let i = 0, maxi = this.solves.length; i < maxi; i += 1) {
      this.solves[i].selected = !this.solves[i].selected;
    }
  }

  selectInterval() {
    let i1, i2;
    let len = this.solves.length;

    for (i1 = 0; i1 < len && !this.solves[i1].selected; i1 += 1);
    for (i2 = len - 1; i2 >= 0 && !this.solves[i2].selected; i2 -= 1);

    for (let i = i1; i <= i2; i += 1) {
      if ( !this.solves[i].selected ) {
        this.solves[i].selected = true;
        this.selected += 1;
      }
    }
  }

  selectNone() {
    this.selected = 0;
    for(let i = 0, maxi = this.solves.length; i < maxi; i += 1) {
      this.solves[i].selected = false;
    }
  }

  reset() {
    debug("RESET");
    this.stopTimer();
    this.time = 0;
    this.state = TimerState.CLEAN;
    this.ready = false;
    this.decimals = true;
    this.lastSolve = null;
  }

  deleteSelected() {
    this.delete( this.solves.filter(s => s.selected) );
    this.selected = 0;
  }

  delete(s: Solve[]) {
    this.dataService.removeSolves(s);
    this.initScrambler();
    this.reset();
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.scramble);
  }

  private openDialog(type: string, data: any, handler) {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        type,
        data
      }
    });

    this.enableKeyboard = false;    

    const subscr = dialogRef.afterClosed().subscribe((data) => {
      document.documentElement.style.setProperty('--panel-height', '');
      document.documentElement.style.setProperty('--panel-padding', '24px');
      this.enableKeyboard = true;
      subscr.unsubscribe();
      handler(data);
    });
  }

  editSolve(solve: Solve) {
    this.openDialog('edit-solve', solve, (s: Solve) => {
      if ( s ) {
        solve.comments = (s.comments || '').trim();
        solve.penalty = s.penalty;
        this.dataService.updateSolve(s);
      }
    });
  }

  editScramble() {
    this.openDialog('edit-scramble', this.scramble, (s: string) => {
      if ( s && s.trim() != '' ) {
        this.initScrambler(s.trim());
      }
    });
  }

  oldScrambles() {
    this.openDialog('old-scrambles', this.solves, (s: Solve) => {
      if ( s ) {
        this.setConfigFromSolve(s);
        this.initScrambler(s.scramble);
      }
    });
  }

  editSessions() {
    this.openDialog('edit-sessions', this.sessions, () => {
      if ( this.sessions.indexOf( this.session ) < 0 ) {
        this.session = this.sessions[0];
      }
    });
  }

  settings() {
    this.openDialog('settings', {
      hasInspection: this.hasInspection,
      inspection: this.inspectionTime,
      showElapsedTime: this.showTime,
      calcAoX: this.calcAoX
    }, (data) => {
      if ( data ) {
        this.hasInspection = data.hasInspection;
        this.inspectionTime = data.inspection * 1000;
        this.showTime = data.showElapsedTime;

        if ( this.calcAoX != data.calcAoX ) {
          this.calcAoX = data.calcAoX;       
          this.updateStatistics(false);
        } else {
          this.calcAoX = data.calcAoX;
        }
      }
    });
  }

  deleteAll() {
    this.openDialog('delete-all', this.solves, (data) => {
      if ( data ) {
        this.delete(this.solves);
      }
    });
  }

  setConfigFromSolve(s: Solve) {
    this.group = s.group || 0;
    let menu = MENU[ this.group ];
    this.mode = ( typeof s.group != 'undefined' ) ? menu[1].filter(m => m[1] === s.mode)[0] : menu[1][0];
    this.prob = s.prob;
  }

  selectedSession() {
    localStorage.setItem('session', this.session._id);
    this.setSolves();
  }

  @HostListener('window:keydown', ['$event'])
  keyDown(event: KeyboardEvent) {
    if ( !this.enableKeyboard ) {
      return;
    }
    switch(this.tab) {
      case 0: {
        // debug("KEYDOWN EVENT: ", event);
        if ( event.code === 'Space' ) {
          if ( !this.isValid && this.state === TimerState.RUNNING ) {
            return;
          }
          this.isValid = false;

          if ( this.state === TimerState.STOPPED || this.state === TimerState.CLEAN ) {
            debug('PREVENTION');
            this.state = TimerState.PREVENTION;
            this.time = 0;
            this.refPrevention = performance.now();
          }
          else if ( this.state === TimerState.PREVENTION ) {
            if ( performance.now() - this.refPrevention > 500 ) {
              debug('READY');
              this.ready = true;
            }
          } else if ( this.state === TimerState.RUNNING ) {
            debug('STOP');
            this.stopTimer();
            this.time = ~~(performance.now() - this.ref);
            this.addSolve();
            this.state = TimerState.STOPPED;
            this.ready = false;
            this.lastSolve.time = this.time;
            this.initScrambler();
          }
        } else if ( ['KeyR', 'Escape', 'KeyS'].indexOf(event.code) > -1 ) {
          this.reset();
          if ( event.code === 'KeyS' ) {
            this.initScrambler();
          }
        } else if ( this.state === TimerState.RUNNING ) {
          debug('STOP');
          this.stopTimer();
          this.time = ~~(performance.now() - this.ref);
          this.addSolve();
          this.state = TimerState.STOPPED;
          this.ready = false;
          this.lastSolve.time = this.time;
          this.initScrambler();
        }
        break;
      }
      case 1: {
        if ( event.code === 'Escape' && this.selected ) {
          this.selectNone();
        }
        break;
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  keyUp(event: KeyboardEvent) {
    if ( !this.enableKeyboard ) {
      return;
    }

    if ( this.tab ) {
      return;
    }
    this.isValid = true;
    // debug("KEYUP EVENT: ", event);
    if ( event.code === 'Space' ) {
      if ( this.state === TimerState.PREVENTION ) {
        if ( this.ready ) {
          this.createNewSolve();
          
          if ( this.hasInspection ) {
            debug('INSPECTION');
            this.state = TimerState.INSPECTION;
            this.decimals = false;
            this.time = 0;
            this.ready = false;
            this.ref = performance.now() + this.inspectionTime;
            this.runTimer(-1, true);
          } else {
            debug('RUNNING');
            this.state = TimerState.RUNNING;
            this.ready = false;
            this.ref = performance.now();
            this.decimals = true;
            this.stopTimer();

            if ( this.lastSolve.penalty === Penalty.P2 ) {
              this.ref -= 2000;
            }

            this.runTimer(1);
          }
        } else {
          debug("CLEAN");
          this.state = TimerState.CLEAN;
        }
      } else if ( this.state === TimerState.INSPECTION ) {
        debug('RUNNING');
        this.state = TimerState.RUNNING;
        this.ref = performance.now();
        this.decimals = true;
        this.stopTimer();

        if ( this.lastSolve.penalty === Penalty.P2 ) {
          this.ref -= 2000;
        }

        this.runTimer(1);
      }
    }
  }

}
