// ABOUTME: JSONL parser for Claude Code session files
// ABOUTME: Reads and parses session transcripts from filesystem

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { SessionMessage, Session } from '../types';

export class SessionParser {
  constructor(private projectsDir: string) {
    if (!fs.existsSync(projectsDir)) {
      throw new Error(`Projects directory does not exist: ${projectsDir}`);
    }
  }

  async *readSessionFiles(): AsyncGenerator<string> {
    // Walk directory tree and yield JSONL file paths
    const walk = async function* (dir: string): AsyncGenerator<string> {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          yield* walk(fullPath);
        } else if (entry.name.endsWith('.jsonl')) {
          yield fullPath;
        }
      }
    };

    yield* walk(this.projectsDir);
  }

  async parseSession(filePath: string): Promise<Session> {
    const messages: SessionMessage[] = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as SessionMessage;
          messages.push(message);
        } catch (e) {
          console.error(`Failed to parse line in ${filePath}:`, e);
        }
      }
    }

    if (messages.length === 0) {
      throw new Error(`No valid messages found in ${filePath}`);
    }

    // Extract session metadata
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    const sessionId = firstMessage.sessionId || path.basename(filePath, '.jsonl');
    const projectPath = firstMessage.cwd || path.dirname(filePath);

    return {
      id: sessionId,
      projectPath: projectPath,
      messages,
      startTime: new Date(firstMessage.timestamp),
      endTime: new Date(lastMessage.timestamp)
    };
  }

  async *readSessions(since?: Date): AsyncGenerator<Session> {
    for await (const filePath of this.readSessionFiles()) {
      // Check file modification time if 'since' is provided
      if (since) {
        const stats = await fs.promises.stat(filePath);
        if (stats.mtime < since) {
          continue;
        }
      }

      try {
        const session = await this.parseSession(filePath);
        yield session;
      } catch (e) {
        console.error(`Failed to parse session ${filePath}:`, e);
      }
    }
  }
}