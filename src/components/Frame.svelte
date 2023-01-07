<script>
  import moment from 'moment';
  import Minus from 'svelte-material-icons/Minus.svelte';
  import Close from 'svelte-material-icons/Close.svelte';
  import { onDestroy, onMount } from 'svelte';

  let date, itv;

  onMount(() => {
    date = moment().format('hh:mm a');

    itv = setInterval(() => {
      date = moment().format('hh:mm a');
    }, 1000);
  });

  onDestroy(() => {
    clearInterval(itv);
  });

  function minimize() {
    console.log("minimize");
    // this.dataService.window.minimize();
  }

  function maximize() {
    console.log('maximize');
    // if ( this.dataService.window.isMaximized ) {
    //   this.dataService.window.unmaximize();
    // } else {
    //   this.dataService.window.maximize();
    // }
  }

  function close() {
    console.log('close');
    // this.dataService.close();
  }
</script>

<section class="w-full h-8 shadow-sm bg-white bg-opacity-10 text-gray-400 fixed z-10 mb-3 select-none flex items-center">

  <img draggable="false" src="/assets/logo.png" alt="" class="ml-1 w-8 flex my-auto">
  
  <h4 class="ml-1">CubeDB</h4>

  <div class="absolute right-0 top-0 flex h-8 items-center">
    <span>{date}</span>
    <span class="ml-2 cursor-pointer" on:click={ minimize }>
      <Minus />
    </span>
    <span class="ml-2 mr-1 cursor-pointer" on:click={ maximize }>
      <Close height="100%"/>
    </span>
  </div>
</section>