<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { duration, paused } from '$lib/stores'
  import { FPS, WINDOW_SECONDS, FRAMES_PER_WINDOW, BEAT_TOLERANCE, COLOR } from '$lib/config'
  import { getPlaybackTime } from './AudioContext.svelte'
  import { processGridLine, type GridLine } from '$lib/utils'

  export let predBeats: number[]
  export let predDownbeats: number[]
  export let trueBeats: number[]
  export let trueDownbeats: number[]

  let mounted = false
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  let width: number
  let height: number
  let dpr: number
  let hopSize: number

  let beats: GridLine[] = processGridLine(predBeats, trueBeats)
  const downbeats: GridLine[] = processGridLine(predDownbeats, trueDownbeats)

  beats = beats.filter(({ pred: predBeat }) => {
    const predDiffs = downbeats.map(({ pred: predDownbeat }) => Math.abs(predDownbeat - predBeat))
    const trueDiffs = downbeats.map(({ true: trueDownbeat }) => Math.abs(trueDownbeat - predBeat))
    const predMin = Math.min(...predDiffs)
    const trueMin = Math.min(...trueDiffs)
    if (predMin > BEAT_TOLERANCE && trueMin > BEAT_TOLERANCE) {
      return true
    } else if (trueMin <= BEAT_TOLERANCE) {
      return false
    } else {
      downbeats[predDiffs.indexOf(predMin)].pred = predBeat // beat has a better precision
      return false
    }
  })

  $: if (!$paused) draw()
  $: if ($duration) draw()

  onMount(() => {
    dpr = window.devicePixelRatio || 1
    mounted = true

    setupSize()
    draw()
  })

  onDestroy(() => {
    mounted = false
  })

  function onResize() {
    setupSize()
    if ($paused) draw()
  }

  function setupSize() {
    const rect = canvas.getBoundingClientRect()
    width = canvas.width = rect.width * dpr
    height = canvas.height = rect.height * dpr
    hopSize = width / FRAMES_PER_WINDOW
    ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  }

  function draw() {
    if (!mounted) return
    if (!$paused) requestAnimationFrame(draw)

    ctx.clearRect(0, 0, width, height)

    drawTimebar()
    drawGrids()
  }

  function drawGrids() {
    drawGrid(beats, '#FFFE', true)
    // drawGrid(downbeats, '#FFFC')
    drawGrid(downbeats, '#FFFE')
  }

  function drawDownbeatNumber(ctx: CanvasRenderingContext2D, x: number, height: number, number: number) {
    const text = number.toString();
    
    ctx.save();
    
    // Set up the font and measure text width
    ctx.font = `${12 * dpr}px Arial`;
    const textWidth = ctx.measureText(text).width;
    const padding = 5 * dpr; // 5px padding around text
    
    // Draw the semi-opaque white rectangle
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';  // Semi-opaque white
    ctx.fillRect(x, height - 12 * dpr - 2 * padding, textWidth + 2 * padding, 12 * dpr + 2 * padding);
    
    // Now draw the text (number) in black
    ctx.fillStyle = 'white';  // Set the color of the text to black
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, x + padding, height - 10);  // Draw the number 10px above the bottom of the canvas
    
    ctx.restore();
  }

  function drawGrid(gridLines: GridLine[], color: string, dottedLine: boolean = false) {
    const playbackTime = getPlaybackTime()
    const centerFrame = playbackTime * FPS
    const centerX = centerFrame * hopSize
    const start = playbackTime - WINDOW_SECONDS / 2
    const end = playbackTime + WINDOW_SECONDS / 2
    const startIndex = gridLines.findIndex((t) => t.pred >= start)
    const endIndex = gridLines.findIndex((t) => t.pred >= end)

    const windowGridLines = gridLines.slice(startIndex, endIndex)
    const correctGridLines = windowGridLines.filter((t) => !t.wrong)
    const wrongGridLines = windowGridLines.filter((t) => t.wrong)

    const timeToX = (t: number) => t * FPS * hopSize - centerX + width / 2
    const correctGridLineXs = correctGridLines.map((t) => timeToX(t.pred))
    const wrongGridLineXs = wrongGridLines.map((t) => [timeToX(t.pred), timeToX(t.true)])

    ctx.save()
    ctx.lineWidth = dpr * 1
    const dashWidth = 8 * dpr
    if (dottedLine) ctx.setLineDash([dashWidth, dpr * 2])

    ctx.strokeStyle = color
    ctx.beginPath()
    for (const gridLineX of correctGridLineXs) {
      ctx.moveTo(gridLineX, 0)
      ctx.lineTo(gridLineX, height)
    }
    ctx.stroke()

    if (dottedLine) {  // Only for beats
        for (const gridLineX of correctGridLineXs) {
            ctx.moveTo(gridLineX, 0);
            ctx.lineTo(gridLineX, height);
        }
    } else {  // Only for downbeats
        let firstVisibleDownbeatNumber = predDownbeats.slice(0, startIndex).length + 1;

        for (const gridLineX of correctGridLineXs) {
            ctx.moveTo(gridLineX, 0);
            ctx.lineTo(gridLineX, height);
            drawDownbeatNumber(ctx, gridLineX, height, firstVisibleDownbeatNumber);  // draw downbeat number for each downbeat
            firstVisibleDownbeatNumber++;
        }
    }


    for (const [predX, trueX] of wrongGridLineXs) {
      ctx.lineWidth = dpr * 1
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.moveTo(trueX, 0)
      ctx.lineTo(trueX, height)
      ctx.stroke()

      ctx.lineWidth = dpr * 2
      ctx.beginPath()
      if (dottedLine) ctx.strokeStyle = COLOR.GRID_WRONG_BEAT
      else ctx.strokeStyle = COLOR.GRID_WRONG_DOWNBEAT
      ctx.moveTo(predX, 0)
      ctx.lineTo(predX, height)
      ctx.stroke()
    }

    ctx.restore()
  }

  function drawTimebar() {
    const centerX = width / 2

    ctx.save()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = dpr * 1
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, height)
    ctx.stroke()
    ctx.restore()
  }
</script>

<div class="w-full h-full flex">
  <div class="relative grow h-full">
    <canvas class="h-full w-full" bind:this={canvas} />
  </div>
</div>

<svelte:window on:resize={onResize} />
