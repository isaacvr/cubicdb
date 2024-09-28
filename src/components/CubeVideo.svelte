<script lang="ts">
  import type { ITutorialAlg } from "@interfaces";
  import { Button, Spinner } from "flowbite-svelte";
  import PlayIcon from "@icons/Play.svelte";
  import PauseIcon from "@icons/Pause.svelte";
  import { genVideo } from "@helpers/genVideo";

  export let cube: ITutorialAlg;

  let videoSrc: string | null = null;
  let video: HTMLVideoElement;
  let playing = false;

  async function updateVideo(alg: ITutorialAlg) {
    genVideo(alg, 300)
      .then(res => {
        videoSrc = res;
      })
      .catch(err => {
        console.log("ERROR: ", err);
      });
  }

  $: updateVideo(cube);
</script>

<div class="rounded-md border border-green-600 w-full h-full grid place-items-center">
  {#if videoSrc}
    <video
      class="rounded-md"
      bind:this={video}
      src={videoSrc}
      on:play={() => (playing = true)}
      on:pause={() => (playing = false)}
    >
      <track kind="captions" />
    </video>

    <!-- Controls -->
    <div class="flex absolute bottom-0 justify-end w-full">
      <Button
        color="none"
        on:click={() => (playing ? video?.pause() : video?.play())}
        class="w-[2rem] h-full rounded-none shadow-none hover:bg-green-600 !p-1 mr-1"
      >
        {#if playing}
          <PauseIcon size="1.2rem" />
        {:else}
          <PlayIcon size="1.2rem" />
        {/if}
      </Button>
    </div>
  {:else}
    <Spinner size="8" color="green" />
  {/if}
</div>
