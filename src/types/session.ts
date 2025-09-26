// ABOUTME: Type definitions for Claude Code session data structures
// ABOUTME: Represents JSONL message formats and session metadata

export interface SessionMessage {
  uuid: string;
  parentUuid: string | null;
  sessionId?: string;
  timestamp: string;
  type: 'user' | 'assistant';
  userType?: 'external';
  isSidechain: boolean;
  cwd?: string;
  gitBranch?: string;
  version: string;
  thinkingMetadata?: {
    level: 'none' | 'medium' | 'high';
    disabled: boolean;
    triggers: string[];
  };
  message: {
    role: 'user' | 'assistant';
    content: string | MessageContent[];
    usage?: TokenUsage;
  };
  requestId?: string;
}

export interface MessageContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  name?: string;
  input?: Record<string, any>;
  tool_use_id?: string;
  content?: string;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface Session {
  id: string;
  projectPath: string;
  messages: SessionMessage[];
  startTime: Date;
  endTime: Date;
}