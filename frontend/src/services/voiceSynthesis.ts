/**
 * LEARNOVA Professor Nova Voice Engine
 * Real Web Speech synthesis with explicit voice inspection, custom voice picker,
 * dynamic masculine/deep heuristics, subtle robotic resonance tuning, and multilingual fallback.
 * Turn Information Into Understanding.
 */

export interface VoiceSettings {
  voiceMode: 'male_deep' | 'auto' | 'neutral' | 'custom';
  selectedVoiceURI: string;
  style: 'robotic' | 'natural';
  pitch: number; // 0.6 to 1.4 (default 0.88 for calm subtle robotic resonance)
  speed: number; // 0.75 to 1.5 (default 0.95 for calm articulate delivery)
}

const DEFAULT_SETTINGS: VoiceSettings = {
  voiceMode: 'male_deep',
  selectedVoiceURI: '',
  style: 'robotic',
  pitch: 0.88,
  speed: 0.95,
};

const STORAGE_KEY = 'learnova_voice_settings_v2';

// Known masculine voice markers across macOS, Windows, Chrome, Android, Linux
const MALE_DEEP_PRIORITY_KEYWORDS = [
  'daniel',
  'google uk english male',
  'alex',
  'microsoft david',
  'david',
  'reed',
  'eddy',
  'ralph',
  'fred',
  'rishi',
  'guy',
  'george',
  'thomas',
  'arthur',
  'oliver',
  'male',
  'man',
];

const FEMALE_EXCLUSION_KEYWORDS = [
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'fiona',
  'zira',
  'susan',
  'linda',
  'female',
  'woman',
  'girl',
  'lekha',
  'soumya',
  'geeta',
  'vani',
];

class VoiceSynthesisService {
  private settings: VoiceSettings;
  private voices: SpeechSynthesisVoice[] = [];
  private listeners: Array<(settings: VoiceSettings) => void> = [];
  private voicesReadyPromise: Promise<SpeechSynthesisVoice[]>;
  private resolveVoicesReady!: (voices: SpeechSynthesisVoice[]) => void;

  constructor() {
    this.settings = this.loadSettings();

    this.voicesReadyPromise = new Promise((resolve) => {
      this.resolveVoicesReady = resolve;
    });

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshVoices();

      window.speechSynthesis.onvoiceschanged = () => {
        this.refreshVoices();
      };

      // Chrome sometimes delays onvoiceschanged or loads synchronously
      setTimeout(() => this.refreshVoices(), 250);
      setTimeout(() => this.refreshVoices(), 800);
    }
  }

  private loadSettings(): VoiceSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Fallback to default
    }
    return { ...DEFAULT_SETTINGS };
  }

  public refreshVoices(): SpeechSynthesisVoice[] {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const list = window.speechSynthesis.getVoices();
      if (list && list.length > 0) {
        this.voices = list;
        this.resolveVoicesReady(list);
      }
    }
    return this.voices;
  }

  public async getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
    if (this.voices.length > 0) return this.voices;
    this.refreshVoices();
    if (this.voices.length > 0) return this.voices;

    // Wait for voiceschanged or 600ms timeout
    const timeout = new Promise<SpeechSynthesisVoice[]>((res) =>
      setTimeout(() => res(this.voices), 600)
    );
    return Promise.race([this.voicesReadyPromise, timeout]);
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.refreshVoices();
    }
    return this.voices;
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage write issues
    }
    this.listeners.forEach((cb) => cb(this.settings));
  }

  public subscribe(cb: (settings: VoiceSettings) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  /**
   * Resolves the optimal voice for Professor Nova dynamically and deterministically.
   * Returns: { voice, name, isGenuineMale, isFallback }
   */
  public resolveVoiceInfo(lang: string = 'en'): {
    voice: SpeechSynthesisVoice | null;
    name: string;
    isGenuineMale: boolean;
    isFallback: boolean;
  } {
    if (this.voices.length === 0) {
      this.refreshVoices();
    }

    const available = this.voices;
    if (available.length === 0) {
      return {
        voice: null,
        name: 'Browser Default Voice',
        isGenuineMale: false,
        isFallback: true,
      };
    }

    // 1. If non-English requested (e.g. Hindi, Kannada, Telugu, Tamil)
    if (lang && !lang.startsWith('en')) {
      const langPrefix = lang.split('-')[0].toLowerCase();
      const langVoice = available.find((v) =>
        v.lang.toLowerCase().startsWith(langPrefix)
      );
      if (langVoice) {
        return {
          voice: langVoice,
          name: `${langVoice.name} (${langVoice.lang})`,
          isGenuineMale: false, // Indic voices on current OS platforms are generally neutral/female
          isFallback: false,
        };
      }
    }

    // 2. Custom mode: explicitly chosen by user
    if (this.settings.voiceMode === 'custom' && this.settings.selectedVoiceURI) {
      const match = available.find(
        (v) => v.voiceURI === this.settings.selectedVoiceURI || v.name === this.settings.selectedVoiceURI
      );
      if (match) {
        const isMale = MALE_DEEP_PRIORITY_KEYWORDS.some((kw) =>
          match.name.toLowerCase().includes(kw)
        );
        return {
          voice: match,
          name: `${match.name} (${match.lang})`,
          isGenuineMale: isMale,
          isFallback: false,
        };
      }
    }

    const englishVoices = available.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : available;

    // 3. Male / Deep mode: search prioritized masculine/deeper voice pool
    if (this.settings.voiceMode === 'male_deep' || this.settings.voiceMode === 'auto') {
      for (const kw of MALE_DEEP_PRIORITY_KEYWORDS) {
        const found = pool.find((v) => v.name.toLowerCase().includes(kw));
        if (found) {
          return {
            voice: found,
            name: `${found.name} (${found.lang})`,
            isGenuineMale: true,
            isFallback: false,
          };
        }
      }

      // Reject known female names to find closest masculine/neutral
      const nonFemale = pool.find(
        (v) => !FEMALE_EXCLUSION_KEYWORDS.some((kw) => v.name.toLowerCase().includes(kw))
      );
      if (nonFemale) {
        return {
          voice: nonFemale,
          name: `${nonFemale.name} (${nonFemale.lang})`,
          isGenuineMale: false,
          isFallback: true,
        };
      }
    }

    // 4. Neutral or final fallback
    const firstEn = pool[0] || available[0];
    return {
      voice: firstEn || null,
      name: firstEn ? `${firstEn.name} (${firstEn.lang})` : 'Default Voice',
      isGenuineMale: false,
      isFallback: true,
    };
  }

  /**
   * Speaks text using Professor Nova's calibrated persona and selected voice.
   */
  public async speak(
    text: string,
    options?: {
      lang?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: () => void;
    }
  ) {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // Ensure voices are loaded before firing utterance
    await this.getVoicesAsync();

    // Clean markdown formatting characters
    const cleanText = text.replace(/[*#_`>]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voiceInfo = this.resolveVoiceInfo(options?.lang || 'en');
    if (voiceInfo.voice) {
      utterance.voice = voiceInfo.voice;
      utterance.lang = voiceInfo.voice.lang;
    }

    // Pacing
    utterance.rate = this.settings.speed || 0.95;

    // Pitch:
    // 'robotic': apply subtle resonance frequency (default 0.88)
    // 'natural': normal pitch 1.0 (or user-tuned pitch)
    if (this.settings.style === 'robotic') {
      utterance.pitch = Math.min(1.2, Math.max(0.6, this.settings.pitch || 0.88));
    } else {
      utterance.pitch = 1.0;
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };
    utterance.onend = () => {
      options?.onEnd?.();
    };
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      options?.onError?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const voiceSynthesis = new VoiceSynthesisService();
