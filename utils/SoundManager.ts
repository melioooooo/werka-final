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

    public playSFX(type: 'STEP' | 'PICK' | 'ENTER' | 'CRAFT') {
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
        }
    }
}
