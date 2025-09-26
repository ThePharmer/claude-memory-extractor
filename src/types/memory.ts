// ABOUTME: Type definitions for memory storage and metadata
// ABOUTME: Defines structure of extracted memories and their attributes

export interface Memory {
  id: string;
  created: Date;
  content: string;
  metadata: MemoryMetadata;
}

export interface MemoryMetadata {
  source_sessions: string[];
  projects: string[];
  languages: string[];
  tags: string[];
  confidence: number;
  usefulness_score: number;
  last_reinforced: Date;
  decay_next: Date;
  related_memories?: string[];
  reinforcement_history?: ReinforcementEntry[];
}

export interface ReinforcementEntry {
  date: Date;
  session: string;
  signal: 'explicit_citation' | 'implicit_reference' | 'no_correction' | 'user_correction' | 'contradiction';
  delta: number;
}

export interface ExtractedInsight {
  content: string;
  reasoning: string;
  context: string;
  type: 'rule' | 'preference' | 'pattern' | 'case_study' | 'constraint';
  confidence: number;
  source: {
    session_id: string;
    message_uuids: string[];
    timestamp: Date;
  };
}