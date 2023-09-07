<script lang="ts">
  import * as THREE from 'three'
  import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
  import helvetikerRegular from 'three/examples/fonts/helvetiker_regular.typeface.json';
  import { FontLoader } from "three/examples/jsm/loaders/FontLoader"
  import { onMount, onDestroy } from 'svelte'
  import { duration, paused } from '$lib/stores'
  import { FPS, FRAMES_PER_WINDOW, COLOR } from '$lib/config'
  import { getPlaybackTime } from './AudioContext.svelte'
  import type { Note } from '../types';

  export let wav: { [key: string]: number[] }
  export let midi: Note[] = []

  const FONT = new FontLoader().parse(helvetikerRegular)

  let mounted = false

  let canvas: HTMLCanvasElement
  let camera: THREE.OrthographicCamera
  let scene: THREE.Scene
  let renderer: THREE.WebGLRenderer

  let width: number
  let height: number
  let dpr: number
  let hopSize: number

  $: if (!$paused) animate()
  $: if ($duration) animate()

  function midiToNoteName(midiPitch: number) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    let octave = Math.floor(midiPitch / 12) - 1; // This is to get the octave number. The minus 1 is because MIDI's lowest octave starts from C-1.
    let noteIndex = midiPitch % 12; // This gives us the position of the note within the 12-note scale.

    return noteNames[noteIndex] + octave;
  }

  onMount(() => {
    dpr = window.devicePixelRatio || 1
    mounted = true

    resizeAndDraw()
    animate()
 })

  onDestroy(() => {
    mounted = false
    dispose()
  })

  function onResize() {
    resizeAndDraw()
    if (!$paused) animate()
  }

  function animate() {
    if (!mounted) return
    if (!$paused) requestAnimationFrame(animate)
    camera.position.x = getPlaybackTime() * FPS * hopSize
    renderer.render(scene, camera)
  }

  function dispose() {
    if (renderer) renderer.dispose()
    if (scene)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          obj.material.dispose()
        }
      })
  }

  function resizeAndDraw() {
    dispose()

    const rect = canvas.getBoundingClientRect()
    width = canvas.width = rect.width
    height = canvas.height = rect.height
    hopSize = width / FRAMES_PER_WINDOW

    camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000)
    camera.position.set(getPlaybackTime() * FPS * hopSize, 0, height)

    scene = new THREE.Scene()

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas,
    })
    renderer.setPixelRatio(dpr)

    drawWave(wav.low, COLOR.WAV_LOW, COLOR.WAV_LOW_OPACITY)
    drawWave(wav.mid, COLOR.WAV_MID, COLOR.WAV_MID_OPACITY)
    drawWave(wav.high, COLOR.WAV_HIGH, COLOR.WAV_HIGH_OPACITY)
    drawNotes()
  }

  function drawWave(wave: number[], color: string, opacity: number) {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    wave.forEach((v, i) => {
      shape.lineTo(i * hopSize, (v / 256) * height)
    })
    shape.lineTo((wave.length - 1) * hopSize, 0)
    shape.lineTo(0, 0)

    const geometryUpper = new THREE.ShapeGeometry(shape)

    const material = new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const meshUpper = new THREE.Mesh(geometryUpper, material)

    scene.add(meshUpper)
  }

  // const midiNotes = [
  //   { start: 0, end: 1, pitch: 50 },
  //   { start: 2, end: 3, pitch: 50 },
  //   { start: 4, end: 5.5, pitch: 55 },
  //   { start: 28, end: 30, pitch: 55 }
  // ];

  function drawNotes() {
    midi.forEach(note => {
      const width = (note.end - note.start) * FPS * hopSize; // adjust as per your requirement
      const height = 1; // a constant height for now, but you can map this based on pitch if required

      const geometry = new THREE.PlaneGeometry(width, height);
      geometry.translate(width / 2, 0, 0);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // red color for now
      const mesh = new THREE.Mesh(geometry, material);

      // Setting the position
      mesh.position.x = note.start * FPS * hopSize;  // position it at note.start

      // mesh.position.y = note.pitch; // adjust this based on your scene size and range of pitch
      mesh.position.y = -80 + note.pitch;

      mesh.userData = { pitch: note.pitch }; // store pitch data for later retrieval on hover

      scene.add(mesh);

      const textStr = midiToNoteName(note.pitch);  // Convert pitch to string or whatever text you want to display
      const textSize = 7;  // Set the size of the text. Adjust this as needed.

      const textGeometry = new TextGeometry(textStr, {
        font: FONT,
        size: textSize,
        height: 0.1,  // The thickness to extrude the text. Adjust if needed.
        curveSegments: 12,
        bevelEnabled: false
      });

      const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Set text color to black or adjust as needed
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);

      // Position the text mesh above the rectangle
      textMesh.position.x = mesh.position.x;
      textMesh.position.y = mesh.position.y - 5 + textSize;  // Adjust this as needed to position the text above the rectangle

      scene.add(textMesh);

    });
  }
</script>

<div class="w-full h-24 flex">
  <div class="relative grow h-full">
    <canvas class="h-full w-full" bind:this={canvas} />
  </div>
</div>

<svelte:window on:resize={onResize} />

<style>
  canvas {
    @apply bg-surface-900;
  }
</style>
