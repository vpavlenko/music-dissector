<script lang="ts">
  import Icon from '@iconify/svelte'
  import Navigator from '$lib/Navigator.svelte'
  import { paused, mutes, metronome, editURL, analysis } from '$lib/stores'
  import Labels from '$lib/Labels.svelte'
  import Waveform from '$lib/Waveform.svelte'
  import WaveformGrid from '$lib/WaveformGrid.svelte'
  import { page } from '$app/stores'
  import AudioContext from '$lib/AudioContext.svelte'
  import TimeDisplay from '$lib/TimeDisplay.svelte'
  import WaveformTitle from '$lib/WaveformTitle.svelte'
  import { base } from '$app/paths'
  import { onMount } from 'svelte';
  import JSZip from 'jszip'
  import type { Note } from '../../types.js';

  export let data

  function handleKeydown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      $paused = !$paused
      event.preventDefault()
    }
  }

function parseNotesCSV(dataStr: string): Note[] {
    const lines = dataStr.trim().split('\n');
    
    // Ignore the header line
    const noteLines = lines.slice(1);

    return noteLines.map(line => {
        const values = line.split(',');
        return {
            start: parseFloat(values[0]),
            end: parseFloat(values[1]),
            pitch: parseInt(values[2], 10)
        };
    });
}

  const fetchData = async (url: string) => {
    if (!url) return
    const response = await fetch(url, { cache: 'force-cache' });
    const archiveBuffer = await response.arrayBuffer();
    const zip = new JSZip();

    const newAnalysis = await zip.loadAsync(archiveBuffer);

    data = JSON.parse(await newAnalysis.files['dissector.json'].async('string'));
    let bassMidi = parseNotesCSV(await newAnalysis.files['bass_basic_pitch.csv'].async('string'))
    let vocalsMidi = parseNotesCSV(await newAnalysis.files['vocals_basic_pitch.csv'].async('string'))
    let otherMidi = parseNotesCSV(await newAnalysis.files['other_basic_pitch.csv'].async('string'))
    analysis.set({files: newAnalysis.files, bassMidi, vocalsMidi, otherMidi});
  };

  onMount(() => {
    // Refetch whenever the editURL changes
    const unsubscribe = editURL.subscribe(url => {
      fetchData(url);
    });

    return () => {
      unsubscribe(); // Cleanup subscription on component destroy
    };
  });

</script>
{#if $analysis.files}
{#key $page.params.track}
  <AudioContext
    trackId={$page.params.track}
    beats={data.inferences.beats}
    downbeats={data.inferences.downbeats}
  />

  <div class="grid grid-cols-[6rem_auto] divide-y my-2">
    <div class="flex flex-row">
      <div class="navigator-label w-[4.5rem] flex items-center justify-center bg-primary-600">
        <span class="text-black pr-2">allin1</span>
      </div>
      <div class="navigator-label-triangle-top" />
    </div>
    <div style="border: none">
      <Labels
        top
        labels={data.inferences.labels}
        boundaries={data.inferences.segments}
        trueLabels={data.truths.labels}
        trueBoundaries={data.truths.segments}
      />
    </div>

    <div class="navigator-label">Drum</div>
    <div><Navigator energy={data.nav.drum} /></div>

    <div class="navigator-label">Bass</div>
    <div><Navigator energy={data.nav.bass} /></div>

    <div class="navigator-label">Vocal</div>
    <div><Navigator energy={data.nav.vocal} /></div>

    <div class="navigator-label">Other</div>
    <div><Navigator energy={data.nav.other} /></div>
  </div>

  <div class="relative my-2" style="height: calc(24rem + 7px);">
    <div class="absolute w-full grid grid-cols-[6rem_auto] divide-y">
      <!-- Waveforms -->
      <div class="z-10 pl-2" style="border-top-width: 2px">
        <WaveformTitle index={0} title="Drum" />
      </div>
      <div style="border-top-width: 2px">
        <Waveform wav={data.wav.drum} />
      </div>

      <div class="z-10 pl-2">
        <WaveformTitle index={1} title="Bass" />
      </div>
      <div><Waveform wav={data.wav.bass} midi={$analysis.bassMidi}/></div>

      <div class="z-10 pl-2">
        <WaveformTitle index={2} title="Vocal" />
      </div>
      <div><Waveform wav={data.wav.vocal} midi={$analysis.vocalsMidi}/></div>

      <div class="z-10 pl-2" style="border-bottom-width: 2px">
        <WaveformTitle index={3} title="Other" />
      </div>
      <div style="border-bottom-width: 2px">
        <Waveform wav={data.wav.other} midi={$analysis.otherMidi}/>
      </div>
    </div>

    <div class="absolute w-full grid grid-cols-[6rem_auto]" style="pointer-events: none;">
      <div />
      <div class="w-full" style="height: calc(24rem + 7px);">
        <WaveformGrid
          predBeats={data.inferences.beats}
          predDownbeats={data.inferences.downbeats}
          trueBeats={data.truths.beats}
          trueDownbeats={data.truths.downbeats}
        />
      </div>
    </div>
  </div>

  <!-- Bottom Bar -->
  <div class="grid grid-cols-3">
    <!-- Lead -->
    <div class="items-center justify-start px-2" style="width: 6rem;">
      <button
        type="button"
        class="btn btn-sm w-10 h-7"
        class:variant-ghost-primary={$mutes.some((m) => m)}
        class:variant-soft-primary={!$mutes.some((m) => m)}
        on:click={() => ($mutes = $mutes.map((m) => false))}
      >
        <span class="text-primary-500 text-lg">
          <Icon icon="carbon:reset-alt" />
        </span>
      </button>
    </div>

    <!-- Center -->
    <div class="flex flex-row items-center justify-center">
      <button
        type="button"
        class="btn btn-sm h-7 w-7 p-0 text-lg"
        class:variant-ghost-primary={$metronome}
        class:variant-soft-primary={!$metronome}
        on:click={() => ($metronome = !$metronome)}
      >
        <Icon icon="ph:metronome" />
      </button>

      <button
        type="button"
        class="btn btn-sm h-7 w-7 mx-1 p-0 text-lg variant-ghost-primary"
        on:click={() => ($paused = !$paused)}
      >
        {#if $paused}
          <Icon icon="ph:play" />
        {:else}
          <Icon icon="ph:pause" />
        {/if}
      </button>

      <div class="mx-1"><TimeDisplay /></div>
    </div>

    <!-- Tail -->
    <div class="flex flex-row items-end justify-end">
      <a href="https://mac.kaist.ac.kr/" target="_blank">
        <img class="img-bar" src="{base}/maclab.png" />
      </a>
      <a href="https://kaist.ac.kr/" target="_blank" style="margin-left: 0.3rem">
        <img class="img-bar" src="{base}/kaist.png" />
      </a>
    </div>
  </div>
{/key}
{/if}


<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Music Dissector | {$page.params.track}</title>
</svelte:head>

<style>
  .navigator-label {
    @apply flex items-center justify-start pl-2 font-bold;
  }
  .navigator-label-triangle-top {
    border-bottom: 1.5rem solid rgb(var(--color-primary-600));
    border-right: 1.5rem solid transparent;
  }
  .navigator-label-triangle-bottom {
    border-top: 1.5rem solid rgb(var(--color-primary-600));
    border-right: 1.5rem solid transparent;
  }
  div {
    @apply border-surface-600;
  }

  .img-bar {
    @apply h-6;
    filter: brightness(85%);
    transition: all 200ms ease-in-out;
  }
  .img-bar:hover {
    filter: brightness(100%);
  }
</style>
