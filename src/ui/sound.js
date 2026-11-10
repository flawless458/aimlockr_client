let audioContext = null;

/**
 * @param {Window} windowObject
 * @param {{ sounds: boolean, soundVolume: number }} menu
 * @returns {void}
 */
export const playTick = (windowObject, menu) => {
  if (!menu.sounds || menu.soundVolume <= 0) return;
  const AudioContextClass = windowObject.AudioContext ?? windowObject.webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    audioContext ??= new AudioContextClass();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(720, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime((menu.soundVolume / 100) * 0.045, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  } catch {
    audioContext = null;
  }
};
