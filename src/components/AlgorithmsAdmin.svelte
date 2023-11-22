<script lang="ts">
  import { onMount } from "svelte";
  import { CubeViewMap, type Algorithm, nameToPuzzle, type AlgorithmTree } from "@interfaces";
  import { DataService } from "@stores/data.service";
  import Modal from "./Modal.svelte";
  import Input from "@material/Input.svelte";
  import Select from "@material/Select.svelte";
  import { CubeMode, CubeModeMap } from "@constants";
  import { generateCubeBundle } from "@helpers/cube-draw";
  import { Puzzle } from "@classes/puzzle/puzzle";
  import Button from "./material/Button.svelte";
  import Tree from "./material/Tree.svelte";
  import Checkbox from "./material/Checkbox.svelte";

  const dataService = DataService.getInstance();

  let algs: Algorithm[] = [];
  let fAlgs: Algorithm[] = [];
  let show = false;
  let showQuery = false;
  let sAlg: Algorithm;
  let fAlg: Algorithm = {
    mode: CubeMode.NORMAL,
    name: '',
    order: 3,
    scramble: '',
    shortName: '',
    puzzle: '333',
    parentPath: '',
    view: '2d',
    ready: false,
  };

  let fAlgr: Algorithm = {
    mode: CubeMode.NORMAL,
    name: '',
    order: 3,
    scramble: '',
    shortName: '',
    puzzle: '333',
    parentPath: '',
    view: '2d',
    ready: false,
  };

  let fAlgAct: any = {
    mode: false,
    name: false,
    order: false,
    scramble: false,
    shortName: false,
    puzzle: false,
    parentPath: false,
    view: false,
  };

  let fAlgrAct: any = {
    mode: false,
    name: false,
    order: false,
    scramble: false,
    shortName: false,
    puzzle: false,
    parentPath: false,
    view: false,
  };

  let img = '';
  let t: AlgorithmTree;

  function renderSAlg() {
    let args = nameToPuzzle(sAlg.puzzle || '');

    sAlg._puzzle = Puzzle.fromSequence(sAlg.scramble + " z2", {
      type: args[0],
      order: args.slice(1, args.length),
      mode: sAlg.mode,
      view: sAlg.view,
      tips: sAlg.tips,
      headless: true,
    }, true);

    console.log("PUZZLE: ", sAlg._puzzle);

    generateCubeBundle([ sAlg._puzzle ], 200, false).then(gen => {
      let subsc = gen.subscribe((c) => {
        if ( c === null ) {
          return subsc();
        }
        img = c as string;
      });
    });
  }

  function selectAlg(a: Algorithm) {
    sAlg = { ...a };
    sAlg.tips = (a.tips || []).slice();
    show = true;
    renderSAlg();
  }

  function makeTree() {
    for (let i = 0, maxi = algs.length; i < maxi; i += 1) {
      let a = algs[i];
      let pp = a.parentPath || '';
      let path = pp.split('/');
      let o = t;
      let obj = {
        route: a.shortName,
        name: a.name,
        alg: a,
        children: []
      };

      if ( !pp ) {
        t.children.push(obj);
        continue;
      }

      for (let j = 0, maxj = path.length; j < maxj; j += 1) {
        o = o.children.filter((obj: any) => obj.route === path[j])[0];
      }

      o.children.push(obj);
    }
  }

  function sortTree(tr: any) {
    tr.children.sort((a: any, b: any) => a.route < b.route ? -1 : 1);

    tr.children.forEach((c: any) => sortTree(c));
  }

  function resetT() {
    t = {
      route: '',
      name: 'Root',
      alg: {} as Algorithm,
      children: [],
    };
  }

  resetT();

  function handleEdit(ev: CustomEvent<Algorithm>) {
    let alg = ev.detail;

    if ( alg.name != 'Root' ) {
      selectAlg(alg);
    }
  }

  function handleUpdateAlgorithms(alg: Algorithm) {
    let Q = [t];

    while( Q.length ) {
      let subt: AlgorithmTree = Q[0];
      Q.shift();

      if ( subt.alg._id === alg._id ) {
        subt.alg = alg;
        Q.length = 0;
        break;
      }

      subt.children.forEach(st => Q.push(st));
    }
  }

  function saveAlgorithm() {
    dataService.updateAlgorithm(sAlg).then( handleUpdateAlgorithms );
    show = false;
  }

  function findAlgs() {
    fAlgs.length = 0;

    let k = Object.keys(fAlgAct);
    let ft: any = [];

    for (let i = 0, maxi = k.length; i < maxi; i += 1) {
      if ( fAlgAct[ k[i] ] ) {
        ft.push( k[i] );
      }
    }

    fAlgs = algs.filter(alg => {
      return ft.every((key: keyof Algorithm) => alg[key] === fAlg[key]);
    });
  }

  function applyFilter() {
    let k = Object.keys(fAlgrAct);
    let ft: any[] = [];

    for (let i = 0, maxi = k.length; i < maxi; i += 1) {
      if ( fAlgrAct[ k[i] ] ) {
        ft.push( k[i] );
      }
    }

    ft.forEach((f: keyof Algorithm) => {
      fAlgs.forEach(alg => {
        // @ts-ignore
        alg[f] = fAlgr[f];
      });
    });

    if ( ft.length ) {
      fAlgs.forEach(alg => dataService.updateAlgorithm(alg).then( handleUpdateAlgorithms ));
    }

  }

  function refresh() {
    dataService.getAlgorithms('', true)
      .then(a => {
        algs = a;

        if ( !algs.some(a => a.parentPath === '') ) return;
        
        resetT();

        algs.sort((a1, a2) => {
          let p1 = a1.parentPath || '';
          let p2 = a2.parentPath || '';

          if ( p1.length != p2.length ) {
            return p1.length < p2.length ? -1 : 1;
          }

          return p1 < p2 ? -1 : 1;
        });

        makeTree();
        sortTree(t);
        t = t;
      })
      .catch(err => console.log('ERROR: ', err));
  }

  function removeSolutions() {
    fAlgs.forEach(alg => {
      delete alg.solutions;
      dataService.updateAlgorithm(alg).then( handleUpdateAlgorithms );
    });
  }
  
  onMount(() => {
    refresh();
  });
</script>

<main class="container-mini text-gray-400 bg-white bg-opacity-10 m-4 p-4 rounded-md">
  <h1 class="text-3xl text-gray-300 text-center mb-4">Algoritmos</h1>

  <section class="actions mb-4 gap-2">
    <Button class="bg-purple-700 text-gray-300" on:click={ () => showQuery = true }>Query</Button>
    <Button class="bg-blue-700 text-gray-300" on:click={ refresh }>Refresh</Button>
  </section>

  <Tree obj={ t } on:edit={ handleEdit }></Tree>
</main>

<Modal bind:show onClose={ () => show = false }>
  <div class="grid grid-cols-3 max-md:grid-cols-2 gap-4 place-items-center max-w-[50rem]">
    <section>
      Nombre: <Input bind:value={ sAlg.name }/>
    </section>
    <section>
      Nombre corto: <Input bind:value={ sAlg.shortName } disabled/>
    </section>
    <section>
      Padre: <Input bind:value={ sAlg.parentPath }/>
    </section>
    <section>
      Orden: <Input bind:value={ sAlg.order } type="number"/>
    </section>
    <section>
      Scramble: <Input bind:value={ sAlg.scramble }/>
    </section>
    <section>
      Puzzle: <Input bind:value={ sAlg.puzzle }/>
    </section>
    <section>
      Modo <Select class="w-full" items={ CubeModeMap } label={ e => e[0] } transform={ e => e[1] }
        bind:value={ sAlg.mode }/>
    </section>
    <section>
      Vista <Select class="w-full" items={ CubeViewMap } label={ e => e[1] } transform={ e => e[0] }
        bind:value={ sAlg.view }/>
    </section>
    <section>
      Tips: { sAlg.tips?.length || '-' }
    </section>
    <section class="place-items-center">
      <img src={ img } alt="" class="max-h-52">
    </section>
    <section>
      Soluciones: { sAlg.solutions ? sAlg.solutions[0].moves : '-' }
    </section>
    <section class="actions col-span-full">
      <Button class="text-gray-300 bg-purple-700" on:click={ renderSAlg }>Actualizar Imagen</Button>
      <Button class="text-gray-300 bg-green-700" on:click={ saveAlgorithm }>Guardar</Button>
    </section>
  </div>
</Modal>

<Modal bind:show={ showQuery } onClose={ () => showQuery = false }>
  <div class="grid grid-cols-3 max-md:grid-cols-2 gap-4 place-items-center max-w-[50rem]">
    <section>
      Nombre:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgAct.name }/> <Input bind:value={ fAlg.name }/>
      </div>
    </section>
    <section>
      Nombre corto:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgAct.shortName }/> <Input bind:value={ fAlg.shortName }/>
      </div>
    </section>
    <section>
      Padre:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgAct.parentPath }/> <Input bind:value={ fAlg.parentPath }/>
      </div>
    </section>
    <section>
      Orden:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgAct.order }/> <Input bind:value={ fAlg.order } type="number"/>
      </div>
    </section>
    <section>
      Puzzle:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgAct.puzzle }/> <Input bind:value={ fAlg.puzzle }/>
      </div>
    </section>
    <section>
      Modo:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgAct.mode }/> <Select class="w-full" items={ CubeModeMap } label={ e => e[0] } transform={ e => e[1] }
        bind:value={ fAlg.mode }/>
      </div>
    </section>
    <section>
      Vista:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgAct.view }/> <Select class="w-full" items={ CubeViewMap } label={ e => e[1] } transform={ e => e[0] }
        bind:value={ fAlg.view }/>
      </div>
    </section>
  </div>
  <section class="actions col-span-full">
    <Button class="text-gray-300 bg-purple-700" on:click={ findAlgs }>Buscar</Button>
  </section>
  <span>Encontrados: { fAlgs.length }</span>

  <hr class="my-4">

  <div class="grid grid-cols-3 max-md:grid-cols-2 gap-4 place-items-center max-w-[50rem]">
    <section>
      Nombre:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgrAct.name }/> <Input bind:value={ fAlgr.name }/>
      </div>
    </section>
    <section>
      Nombre corto:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgrAct.shortName }/> <Input bind:value={ fAlgr.shortName }/>
      </div>
    </section>
    <section>
      Padre:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgrAct.parentPath }/> <Input bind:value={ fAlgr.parentPath }/>
      </div>
    </section>
    <section>
      Orden:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgrAct.order }/> <Input bind:value={ fAlgr.order } type="number"/>
      </div>
    </section>
    <section>
      Puzzle:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgrAct.puzzle }/> <Input bind:value={ fAlgr.puzzle }/>
      </div>
    </section>
    <section>
      Modo:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgrAct.mode }/> <Select class="w-full" items={ CubeModeMap } label={ e => e[0] } transform={ e => e[1] }
        bind:value={ fAlgr.mode }/>
      </div>
    </section>
    <section>
      Vista:
      <div class="flex items-center gap-4">
        <Checkbox bind:checked={ fAlgrAct.view }/> <Select class="w-full" items={ CubeViewMap } label={ e => e[1] } transform={ e => e[0] }
        bind:value={ fAlgr.view }/>
      </div>
    </section>
    <section class="actions col-span-full">
      <Button class="text-gray-300 bg-red-700" on:click={ removeSolutions }>Eliminar soluciones</Button>
      <Button class="text-gray-300 bg-green-700" on:click={ applyFilter }>Aplicar</Button>
    </section>
  </div>
</Modal>

<style lang="postcss">
  section {
    @apply w-full grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  }

  .actions {
    display: flex;
    gap: .5rem;
    justify-content: center;
  }
</style>