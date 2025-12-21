import { useCallback, useRef } from 'react';

export function useAlertSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAlertSound = useCallback((priority: 'low' | 'medium' | 'high' | 'critical') => {
    // Create AudioContext on demand (to avoid autoplay restrictions)
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Different sounds for different priorities
    const sounds: Record<string, { freq: number[]; duration: number; repeat: number }> = {
      low: { freq: [440], duration: 0.2, repeat: 1 },
      medium: { freq: [523, 659], duration: 0.15, repeat: 2 },
      high: { freq: [659, 784, 880], duration: 0.12, repeat: 3 },
      critical: { freq: [880, 1047, 880, 1047], duration: 0.1, repeat: 4 },
    };

    const sound = sounds[priority] || sounds.medium;

    // Create oscillator pattern
    sound.freq.forEach((freq, i) => {
      for (let r = 0; r < sound.repeat; r++) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = freq;
        oscillator.type = priority === 'critical' ? 'sawtooth' : 'sine';

        const startTime = now + (i * sound.duration) + (r * sound.freq.length * sound.duration * 1.5);
        const endTime = startTime + sound.duration;

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

        oscillator.start(startTime);
        oscillator.stop(endTime);
      }
    });
  }, []);

  return { playAlertSound };
}
