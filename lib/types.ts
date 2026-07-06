export interface Definition {
  word: string;
  phonetic?: string;
  meaning: string;
  example?: string;
  source: "dictionary" | "llm" | "mock" | "fallback";
}

export interface WordCard extends Definition {
  pageId: number;
  count: number;
  addedAt: number;
}

export interface FramePayload {
  room: string;
  image?: string;
  pageChanged?: boolean;
  /** Test/demo hook: only honored in mock mode. */
  mockWords?: string[];
}

export interface SnapshotEvent {
  pageId: number;
  words: WordCard[];
}

export interface WordsEvent {
  pageId: number;
  added: WordCard[];
  updated: WordCard[];
}
