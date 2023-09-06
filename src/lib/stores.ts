import { writable } from 'svelte/store'

export const duration = writable(0)
export const paused = writable(true)
export const metronome = writable(false)
export const mutes = writable([false, false, false, false])
export const loading = writable(true)
export const editURL = writable(''); // Default value is an empty string
export const analysis = writable({}); // initially set to null or any default value
