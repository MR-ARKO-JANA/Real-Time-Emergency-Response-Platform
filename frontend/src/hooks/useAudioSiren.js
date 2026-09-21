import { useCallback, useRef } from 'react';

export function useAudioSiren() {
    const audioCtxRef = useRef(null);
    const oscillatorRef = useRef(null);
    const lfoRef = useRef(null);
    const gainNodeRef = useRef(null);
    const isPlayingRef = useRef(false);

    const startSiren = useCallback(() => {
        if (isPlayingRef.current) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;

            if (ctx.state === 'suspended') ctx.resume();

            oscillatorRef.current = ctx.createOscillator();
            oscillatorRef.current.type = 'sawtooth';
            oscillatorRef.current.frequency.setValueAtTime(600, ctx.currentTime);

            lfoRef.current = ctx.createOscillator();
            lfoRef.current.type = 'sine';
            lfoRef.current.frequency.setValueAtTime(2.5, ctx.currentTime);

            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(250, ctx.currentTime);

            lfoRef.current.connect(lfoGain);
            lfoGain.connect(oscillatorRef.current.frequency);

            gainNodeRef.current = ctx.createGain();
            gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
            gainNodeRef.current.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.3);

            const shaper = ctx.createWaveShaper();
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) {
                const x = (i * 2) / 256 - 1;
                curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
            }
            shaper.curve = curve;
            shaper.oversample = '4x';

            oscillatorRef.current.connect(shaper);
            shaper.connect(gainNodeRef.current);
            gainNodeRef.current.connect(ctx.destination);

            oscillatorRef.current.start();
            lfoRef.current.start();
            isPlayingRef.current = true;
        } catch (e) {
            console.error('Failed to start SOS siren:', e);
        }
    }, []);

    const stopSiren = useCallback(() => {
        if (!isPlayingRef.current) return;
        try {
            const ctx = audioCtxRef.current;
            if (gainNodeRef.current && ctx) {
                gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            }
            setTimeout(() => {
                if (oscillatorRef.current) { try { oscillatorRef.current.stop(); } catch(e){} }
                if (lfoRef.current) { try { lfoRef.current.stop(); } catch(e){} }
                if (ctx) { try { ctx.close(); } catch(e){} }
                oscillatorRef.current = null;
                lfoRef.current = null;
                gainNodeRef.current = null;
                audioCtxRef.current = null;
            }, 250);
        } catch(e) {}
        isPlayingRef.current = false;
    }, []);

    return { startSiren, stopSiren };
}
