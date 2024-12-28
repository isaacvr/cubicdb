<script lang="ts">
  import { onDestroy } from "svelte";
  import { Penalty } from "@interfaces";
  import { Button, Card, Input, Modal } from "flowbite-svelte";
  import { localLang } from "@stores/language.service";
  import RightHandIcon from "@icons/HandBackRight.svelte";
  import LeftHandIcon from "@icons/HandBackLeft.svelte";
  import { RemoteMachine } from "./RemoteMachine";
  import ResetIcon from "@icons/Refresh.svelte";
  import PowerIcon from "@icons/Power.svelte";
  import Close from "@icons/Close.svelte";
  import ThumbDown from "@icons/ThumbDown.svelte";
  import Flag from "@icons/FlagOutline.svelte";
  import CommentIcon from "@icons/CommentPlusOutline.svelte";

  let leftDown = false;
  let rightDown = false;
  let machine = new RemoteMachine();
  let mLeftDown = machine.context.leftDown;
  let mRightDown = machine.context.rightDown;
  let session = machine.context.session;
  let mState = machine.state;
  let url = "https://192.168.136.108:12345/";
  // let url = 'https://127.0.0.1:12345/';
  let penalty: Penalty = Penalty.NONE;
  let showModal = false;
  let loaded = false;

  let solveControl = [
    {
      text: "Delete",
      icon: Close,
      highlight: (p: any) => false,
      handler: () => {
        machine.delete();
      },
    },
    {
      text: "DNF",
      icon: ThumbDown,
      highlight: (p: any) => penalty === Penalty.DNF,
      handler: () => {
        penalty = penalty === Penalty.DNF ? Penalty.NONE : Penalty.DNF;
        machine.penalty(penalty);
      },
    },
    {
      text: "+2",
      icon: Flag,
      highlight: (p: any) => penalty === Penalty.P2,
      handler: () => {
        penalty = penalty === Penalty.P2 ? Penalty.NONE : Penalty.P2;
        machine.penalty(penalty);
      },
    },
    {
      text: "Comments",
      icon: CommentIcon,
      highlight: (p: any) => false,
      handler: () => {
        machine.editSolve();
      },
    },
  ];

  machine.init();

  function handleLeft(e: MouseEvent) {
    machine.handleLeft(e);
    leftDown = e.type === "pointerdown";
  }

  function handleRight(e: MouseEvent) {
    machine.handleRight(e);
    rightDown = e.type === "pointerdown";
  }

  function reset() {
    machine.reset();
  }

  function getStateName(st: typeof $mState): string {
    return st;
  }

  function getColor(st: typeof $mState): string {
    let col = "";

    switch (st) {
      case "CLEAN": {
        col = "gray";
        break;
      }

      case "CONNECTING":
      case "STARTING": {
        col = "yellow";
        break;
      }

      case "CONNECTION_ERROR":
      case "DISCONNECTED": {
        col = "red";
        break;
      }

      case "READY": {
        col = "green";
        break;
      }
      case "RUNNING": {
        col = "primary";
        break;
      }
      case "STOPPED": {
        col = "purple";
        break;
      }

      default: {
        col = "gray";
        break;
      }
    }

    return `border-${col}-500 ${st === "RUNNING" ? "text-primary-400 animate-pulse" : ""}`;
  }

  function connect() {
    machine.updateUrl(url);
  }

  function onOff() {
    machine.onOff();
  }

  onDestroy(() => machine.disconnect());

  $: $mState === "RUNNING" && (penalty = Penalty.NONE);
</script>

<div
  class="bg-backgroundLeve1 w-[min(90%,36rem)] flex mx-auto my-4 p-2 border-l-4 border-l-primary-700 landscape:hidden"
>
  {$localLang.TOOLS.portraitWarning}
</div>

{#if $mState === "DISCONNECTED" || $mState === "CONNECTING" || $mState === "CONNECTION_ERROR"}
  <Card class="flex-row gap-2 max-w-sm w-full items-center justify-between mt-4 mb-0 mx-auto">
    <Input bind:value={url} />
    <Button on:click={connect}>Connect</Button>
    <Button on:click={() => (showModal = true)}>Auth</Button>
  </Card>
{/if}

<Card
  class="flex flex-row relative items-center justify-between mt-4 w-[calc(100vw-2rem)]
  max-w-[unset] mx-auto mb-8"
  style="aspect-ratio: 3 / 1 !important;"
>
  <Card
    class={"h-full aspect-square border !border-primary-700 shadow-primary-700 !p-0 " +
      ($mLeftDown ? "!bg-primary-800 " : "")}
  >
    <button
      class={"w-full h-full grid place-items-center " + ($mLeftDown ? "text-primary-400" : "")}
      on:touchstart|preventDefault
      on:pointerdown={handleLeft}
      on:pointerup={handleLeft}
    >
      <LeftHandIcon size="40%" class={$mLeftDown ? "text-white " : "text-primary-200"} />
    </button>
  </Card>

  <div class="h-full w-full grid">
    <!-- <span class={"state flex mx-auto border-2 mt-auto py-3 px-6 rounded-full " + getColor($mState)}> -->
    <!-- { getStateName($mState) } -->
    <span class={"state flex mx-auto border-2 mt-auto p-2 rounded-lg"}>
      {$session?.name || `<${$localLang.global.session}>`}
    </span>

    <div class={"flex justify-evenly w-full items-end " + ($mState === "STOPPED" ? "" : "hidden")}>
      {#each solveControl as control}
        <Button
          color="none"
          class="flex my-3 mx-1 w-5 h-5 p-0 {control.highlight(penalty) ? 'text-red-500' : ''}"
          on:click={control.handler}
        >
          <svelte:component this={control.icon} width="100%" height="100%" />
        </Button>
      {/each}
    </div>

    <div class="flex justify-evenly items-center mt-auto">
      {#if $mState != "DISCONNECTED" && $mState != "CONNECTING" && $mState != "CONNECTION_ERROR"}
        <Button
          color="none"
          class="rounded-full border border-red-500 ring-red-800 p-3"
          on:click={onOff}
        >
          <PowerIcon size="1.4rem" />
        </Button>
      {/if}
      <Button color="none" class="rounded-full border border-primary-500 p-3" on:click={reset}>
        <ResetIcon size="1.4rem" />
      </Button>
      <!-- <Button color="none" class="rounded-full border border-purple-500 ring-purple-800 p-3" on:click={ reset }>
        <SettingsIcon size="1.4rem"/>
      </Button> -->
    </div>
  </div>

  <Card
    class={"h-full aspect-square border !border-primary-700 shadow-primary-700 !p-0 " +
      ($mRightDown ? "!bg-primary-800 " : "")}
  >
    <button
      class={"w-full h-full grid place-items-center " + ($mRightDown ? "text-primary-400" : "")}
      on:touchstart|preventDefault
      on:pointerdown={handleRight}
      on:pointerup={handleRight}
    >
      <RightHandIcon size="40%" class={$mRightDown ? "text-white " : "text-primary-200"} />
    </button>
  </Card>
</Card>

<Modal bind:open={showModal} autoclose outsideclose>
  {$localLang.TOOLS.clickToAuth}

  <a href={url} target="_blank" class="flex bg-gray-900 w-max mx-auto p-2 rounded-md">{url}</a>

  <svelte:fragment slot="footer">
    <div class="flex items-center justify-center gap-2 w-full">
      <Button color="alternative">{$localLang.global.cancel}</Button>
      <Button color="primary">{$localLang.global.accept}</Button>
    </div>
  </svelte:fragment>
</Modal>
