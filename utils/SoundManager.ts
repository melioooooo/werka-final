export class SoundManager {
    private static instance: SoundManager;
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = false;

    private constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
        // iOS only allows audio after a user gesture
        const unlock = () => this.audioContext?.resume();
        ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { once: true }));
    }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public playBGM() {
        // Placeholder: In a real app, load and loop an audio file.
        // For now, we won't play a constant tone as it's annoying.
        console.log("Playing BGM (Placeholder)");
    }

    public playSFX(type: 'STEP' | 'PICK' | 'ENTER' | 'CRAFT' | 'CHIME' | 'FLAP' | 'RIBBIT' | 'PLOP' | 'RARE') {
        if (this.isMuted || !this.audioContext) return;

        // Resume context if suspended (browser policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        switch (type) {
            case 'STEP':
                // Short, low click
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;

            case 'PICK':
                // High, happy ding
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
                break;

            case 'ENTER':
                // Door opening / transition sound
                osc.type = 'square';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;

            case 'CRAFT':
                // Magical shimmer
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(800, now + 0.5);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;

            case 'FLAP':
                // Soft flutter: quick wobbling whoosh
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(320, now);
                for (let i = 1; i <= 5; i++) osc.frequency.setValueAtTime(i % 2 ? 420 : 300, now + i * 0.035);
                gain.gain.setValueAtTime(0.035, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.start(now);
                osc.stop(now + 0.22);
                break;

            case 'RIBBIT':
                // Two low croaks
                osc.type = 'square';
                osc.frequency.setValueAtTime(190, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);
                osc.frequency.setValueAtTime(200, now + 0.13);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.24);
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.linearRampToValueAtTime(0.025, now + 0.01);
                gain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
                gain.gain.linearRampToValueAtTime(0.025, now + 0.14);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
                osc.start(now);
                osc.stop(now + 0.27);
                break;

            case 'PLOP':
                // Water plop: falling sine blip
                osc.type = 'sine';
                osc.frequency.setValueAtTime(900, now);
                osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                osc.start(now);
                osc.stop(now + 0.16);
                break;

            case 'RARE':
                // Sparkly four-note arpeggio for rare finds
                osc.type = 'sine';
                [1047, 1319, 1568, 2093].forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.08));
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                osc.start(now);
                osc.stop(now + 0.8);
                break;

            case 'CHIME':
                // Soft rising three-note bell
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                osc.frequency.setValueAtTime(1175, now + 0.09);
                osc.frequency.setValueAtTime(1568, now + 0.18);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
                break;
        }
    }
}
