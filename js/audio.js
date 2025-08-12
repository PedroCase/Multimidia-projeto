// audio.js - inicialização de áudio via Tone.js (CDN)

export function initAudio() {
  if (audioInitialized) return;
  // Tone é carregado via CDN e está no escopo global
  // Pode falhar em ambientes sem gesto do usuário; chamamos no keydown
  Tone.start();
  sounds = {
    attack: new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }).toDestination(),
    hurt: new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 } }).toDestination(),
    pickup: new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 } }).toDestination(),
    door: new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0, release: 0.1 } }).toDestination(),
    nextLevel: new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 0.3 } }).toDestination(),
    defeat: new Tone.Synth({ oscillator: { type: 'fmsquare' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.2 } }).toDestination(),
  };
  audioInitialized = true;
}