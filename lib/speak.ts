"use client";

/** Pronounce an English word via the Web Speech API (no network, no deps). */
export function speakWord(word: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.cancel(); // stop any previous word
  window.speechSynthesis.speak(utterance);
  return true;
}
