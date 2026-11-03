import { useState, useEffect, useCallback, useRef } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;

      return () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    }
  }, []);

  const cleanTextForSpeech = (text: string): string => {
    // Remove markdown code blocks, URLs, and bold/italic asterisks
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`.*?`/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[*#_~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
  };

  const speak = useCallback(
    (text: string, options?: { lang?: string; rate?: number; pitch?: number }) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      currentUtteranceRef.current = utterance;

      // Detect language (Arabic / French / English)
      const hasArabic = /[\u0600-\u06FF]/.test(cleaned);
      const targetLang = options?.lang || (hasArabic ? 'ar' : 'en-US');
      utterance.lang = targetLang;
      utterance.rate = options?.rate || 1.0;
      utterance.pitch = options?.pitch || 1.0;

      // Try to find matching voice
      if (voices.length > 0) {
        const matchingVoice = voices.find((v) =>
          v.lang.toLowerCase().startsWith(targetLang.slice(0, 2).toLowerCase())
        );
        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [voices]
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isSpeaking,
    isSupported,
    voices,
    speak,
    stop,
  };
}
