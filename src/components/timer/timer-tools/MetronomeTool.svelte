<script lang="ts">
  import { Button, Range } from "flowbite-svelte";
  import { onDestroy, onMount } from "svelte";

  let bpm = 60;
  let vol = 50;
  let running = false;
  let ac = new AudioContext();
  let source: AudioBufferSourceNode;
  let gainNode = ac.createGain();

  gainNode.gain.value = vol / 100;

  function setup() {
    let buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    let channel = buffer.getChannelData(0);
    let phase = 0;
    let amp = 1;
    let durationFrames = ac.sampleRate / 40;
    let f = 880;

    const PI2 = Math.PI * 2;

    for (let i = 0; i < durationFrames; i += 1) {
      channel[i] = Math.sin(phase) * amp;
      phase += (PI2 * f) / ac.sampleRate;
      if (phase > PI2) {
        phase -= PI2;
      }
      amp -= 1 / durationFrames;
    }

    source = ac.createBufferSource();

    source.buffer = buffer;
    source.loop = true;
    source.loopEnd = 60 / bpm;
    gainNode.connect(ac.destination);
    source.connect(gainNode);
    source.start(0);
    ac.suspend();
  }

  function start() {
    if (running) return;
    running = true;
    ac.resume();
  }

  function stop() {
    if (!running) return;
    running = false;
    ac.suspend();
  }

  function adjustSource(_bpm: number, _vol: number) {
    if (!source) return;
    source.loopEnd = 60 / _bpm;
    gainNode.gain.value = vol / 100;
  }

  function keyUp(ev: KeyboardEvent) {
    if (ev.code === "KeyM") {
      running ? stop() : start();
    }
  }

  onMount(() => {
    setup();
  });

  onDestroy(() => {
    try {
      ac?.close();
    } catch {}
  });

  $: adjustSource(bpm, vol);
</script>

<svelte:window on:keyup={keyUp} />

<div class="metronome">
  <span>BPM</span>
  <Range size="md" bind:value={bpm} min={20} max={300} step="1" />
  <span>{bpm}</span>

  <span>Volume</span>
  <Range size="md" bind:value={vol} min={0} max={100} step="1" />
  <span>{vol}</span>

  <Button
    on:click={() => (running ? stop() : start())}
    color="none"
    class={"shadow-md col-span-full text-black " + (running ? "bg-red-300" : "bg-purple-300")}
  >
    {!running ? "Start" : "Stop"}
  </Button>
</div>

<style lang="postcss">
  .metronome {
    @apply grid items-center gap-4 m-2;
    grid-template-columns: repeat(3, auto);
  }

  :global(input[type="range"]) {
    @apply !bg-gray-800;
  }
</style>
