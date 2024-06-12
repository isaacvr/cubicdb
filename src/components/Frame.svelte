<script lang="ts">
  import moment from 'moment';
  import Minus from 'svelte-material-icons/Minus.svelte';
  import Close from 'svelte-material-icons/Close.svelte';
  import { onDestroy, onMount } from 'svelte';
  import { DataService } from '@stores/data.service';
  import { Breadcrumb, BreadcrumbItem, Button, Dropdown, DropdownItem, NavHamburger, NavUl, Navbar, Popover, Span, Progressbar, Tooltip } from 'flowbite-svelte';
  import { LANGUAGES } from '@lang/index';
  import { globalLang, localLang } from '@stores/language.service';
  import { NotificationService } from '@stores/notification.service';
  import { randomUUID } from '@helpers/strings';
  import { Link, navigate, useLocation } from 'svelte-routing';
  import ChevronIcon from '@icons/ChevronDown.svelte';
  import { screen } from '@stores/screen.store';
  import type { RouteLocation } from 'svelte-routing/types/Route';
  import { CubeDBICON } from '@constants';
  import FlagIcon from './FlagIcon.svelte';
  import { ArrowUpRightDownLeftOutline } from 'flowbite-svelte-icons';

  const dataService = DataService.getInstance();
  const notService = NotificationService.getInstance();
  const loc = useLocation();

  let date: string, itv: any;
  let progress = 0;
  let languageSelector = false;
  let parts: { link: string, name: string }[] = [];

  function handleProgress(p: number) {
    progress = Math.round(p * 100) / 100;
  }
  
  function handleDone() {
    notService.addNotification({
      header: $localLang.SETTINGS.update,
      text: $localLang.SETTINGS.updateCompleted,
      actions: [
        { text: $localLang.global.accept, callback: () => {}, color: "alternative" },
        { text: $localLang.global.restart, callback: () => dataService.close(), color: 'purple' },
      ],
      fixed: true,
      key: randomUUID(),
      icon: CubeDBICON,
    });
  }

  function cancelUpdate() {
    dataService.cancelUpdate()
      .then(() => {
        progress = 0;
      })
      .catch((err) => {
        console.log("ERROR: ", err);
      });
  }

  function minimize() {
    dataService.minimize();
  }

  function close() {
    dataService.close();
  }

  function updateLang(code: string) {
    $globalLang = code;
    localStorage.setItem('language', $globalLang);
  }

  function updateParts(rt: RouteLocation) {
    parts.length = 0;

    if ( !rt ) {
      navigate("/");
      return;
    }

    let arr = rt.pathname.split('/').filter(s => s);

    parts = arr.map((e: string, p: number) => ({
      link: "/" + arr.slice(0, p + 1).join('/'),
      name: $localLang.NAVBAR.routeMap(e)
    }));
  }

  function fullScreen() {
    document.documentElement.requestFullscreen();
  }

  onMount(() => {
    date = moment().format('hh:mm a');

    itv = setInterval(() => {
      date = moment().format('hh:mm a');
    }, 1000);

    dataService.on('download-progress', handleProgress);
    dataService.on('update-downloaded', handleDone);
  });

  onDestroy(() => {
    clearInterval(itv);
    dataService.off('download-progress', handleProgress);
    dataService.off('update-downloaded', handleDone);
  });

  $: $localLang, updateParts( $loc );
</script>

<div class="relative py-6 bg-red-200">
  <Navbar let:hidden let:toggle class="justify-between fixed top-0 left-0 w-full z-50 border-b p-2" fluid>
    <Link to="/">
      <div class="flex">
        <img draggable="false" src={ CubeDBICON } alt="" width="100%" height="100%" class="ml-1 w-8 flex my-auto">
        <Span class="self-center whitespace-nowrap text-base font-semibold ml-2">CubeDB</Span>
      </div>
    </Link>

    {#if parts.length }
      {#if !$screen.isMobile && !hidden && Boolean(toggle())} &nbsp; {/if}

      <NavUl key="path-list" {hidden} class="order-2 md:order-1" ulClass="md:p-0 max-md:p-4">
        <Breadcrumb>
          <Link to="/" class="inline-flex -mr-4" on:click={ () => !hidden && toggle() }>
            <BreadcrumbItem home></BreadcrumbItem>
          </Link>
          {#each parts as part}
            <Link to={ part.link } class="inline-flex" on:click={ () => !hidden && toggle() }>
              <BreadcrumbItem>{ part.name.toUpperCase() }</BreadcrumbItem>
            </Link>
          {/each}
        </Breadcrumb>
      </NavUl>
    {/if}

    <div class="flex order-1 md:order-2">
      <div {hidden} class="flex ml-auto items-center">
        {#if progress}
          <span class="mr-2 text-yellow-500 cursor-default"> { progress + "%" } </span>
          <Popover>
            <Span class="flex justify-center">{ $localLang.global.downloading }</Span>
            <Progressbar { progress } divClass="w-[10rem] my-3"/>
            <Button color="red" class="py-2 w-full" on:click={ cancelUpdate }>{ $localLang.global.cancel }</Button>
          </Popover>
        {/if}
    
        <Button class="py-1 border border-primary-100 rounded-md mr-2 gap-2 px-2" color="none">
          <FlagIcon icon={ LANGUAGES.find(l => l[1].code === $globalLang)?.[2] || '' } size="1.2rem"/>
          { LANGUAGES.find(l => l[1].code === $globalLang)?.[1].name || 'English' }
          <ChevronIcon />
        </Button>
          
        <Dropdown color="dark" bind:open={ languageSelector }>
          {#each LANGUAGES as lg}
            <DropdownItem on:click={() => { updateLang(lg[1].code); languageSelector = false; }}>
              <div class="flex items-center gap-2">
                <FlagIcon icon={ lg[2] } size="1.2rem"/> { lg[1].name }
              </div>
            </DropdownItem>
          {/each}
        </Dropdown>
          
        {#if dataService.isElectron && $screen.width > 640}
          <span>{date}</span>
          
          <Button color="none" class="ml-2 cursor-pointer rounded-sm hover:bg-primary-600 hover:text-white" on:click={ minimize }>
            <Minus />
          </Button>
          <Button color="none" class="cursor-pointer rounded-sm hover:bg-red-600 hover:text-white" on:click={ close }>
            <Close height="100%"/>
          </Button>
        {:else if !document.fullscreenElement}
          <Button color="alternative" class="p-2" on:click={ fullScreen }> <ArrowUpRightDownLeftOutline size="sm" /> </Button>
          <Tooltip>{ $localLang.global.fullScreen }</Tooltip>
        {/if}
      </div>

      {#if parts.length}
        <NavHamburger on:click={toggle} />
      {/if}
    </div>
  </Navbar>
</div>