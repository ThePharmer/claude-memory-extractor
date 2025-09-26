// ABOUTME: Extract command implementation for processing sessions
// ABOUTME: Orchestrates the extraction pipeline using markdown memories

import * as fs from 'fs';
import * as path from 'path';
import { SessionParser } from '../extraction/parser';
import { SessionChunker } from '../extraction/chunker';
import { AgentExtractor } from '../extraction/agent-extractor';

export interface ExtractOptions {
  since?: string;
  projectsDir: string;
  memoriesDir: string;
  indexDir: string;
  dryRun?: boolean;
}

export class ExtractCommand {
  private lastExtractionFile: string;

  constructor(private options: ExtractOptions) {
    this.lastExtractionFile = path.join(options.indexDir, 'last-extraction.json');
  }

  async execute(): Promise<void> {
    console.log('🚀 Starting memory extraction...\n');

    // Validate directories
    if (!this.options.projectsDir) {
      console.error('❌ Projects directory not specified. Set CLAUDE_PROJECTS_DIR or use --projects-dir');
      process.exit(1);
    }

    if (!fs.existsSync(this.options.projectsDir)) {
      console.error(`❌ Projects directory not found: ${this.options.projectsDir}`);
      process.exit(1);
    }

    // Initialize components
    const parser = new SessionParser(this.options.projectsDir);
    const chunker = new SessionChunker();
    // Use the memories directory for insights (shared location)
    const insightsDir = path.join(this.options.memoriesDir, 'extracted');
    const extractor = new AgentExtractor(insightsDir);

    // Determine since date
    const sinceDate = await this.getSinceDate();
    if (sinceDate) {
      console.log(`📅 Processing sessions since: ${sinceDate.toISOString()}\n`);
    }

    // Process sessions
    let sessionCount = 0;
    let chunkCount = 0;
    let totalInsights = 0;

    for await (const session of parser.readSessions(sinceDate)) {
      sessionCount++;
      console.log(`\n📂 Processing session ${sessionCount}: ${session.id}`);
      console.log(`   Project: ${session.projectPath}`);
      console.log(`   Messages: ${session.messages.length}`);

      // Chunk the session
      const chunks = chunker.chunkSession(session);
      const avgChunkSize = chunks.length > 0 ? chunks.reduce((acc, chunk) => {
        const size = chunk.messages.reduce((s, m) => {
          if (!m?.message?.content) return s;
          const content = typeof m.message.content === 'string'
            ? m.message.content
            : m.message.content.map(b => b.type === 'text' ? b.text : JSON.stringify(b)).join('');
          return s + content.length;
        }, 0);
        return acc + size;
      }, 0) / chunks.length : 0;
      console.log(`   Chunks: ${chunks.length} (avg ~${Math.round(avgChunkSize / 1000)}k chars)`);

      // Process each chunk
      for (const chunk of chunks) {
        chunkCount++;

        // Skip chunks with too few messages
        if (chunk.messages.length < 2) {
          process.stdout.write('.');
          continue;
        }

        // Extract insights from chunk
        try {
          const count = await extractor.extractFromChunk(chunk, session.id, session.startTime, session.projectPath);
          if (count > 0) {
            process.stdout.write('✓');
            totalInsights += count;
          } else {
            process.stdout.write('.');
          }
        } catch (error: any) {
          process.stdout.write('✗');
          console.error(`\n   ❌ Extraction error: ${error.message}`);
        }
      }

      console.log(''); // New line after dots

      // In dry-run mode, stop after more sessions for testing
      if (this.options.dryRun && sessionCount >= 20) {
        console.log('\n   (Dry run - stopping after 20 sessions)');
        break;
      }
    }

    console.log(`\n\n📊 Extraction complete:`);
    console.log(`   Sessions processed: ${sessionCount}`);
    console.log(`   Chunks analyzed: ${chunkCount}`);
    console.log(`   Insights extracted: ${totalInsights}`);
    console.log(`   Output directory: ${insightsDir}\n`);

    // Update last extraction timestamp
    if (!this.options.dryRun && sessionCount > 0) {
      await this.updateLastExtraction();
    }

    // Clean up temp extraction sessions to avoid disk clutter
    try {
      const tempDir = '/tmp/claude-extraction-sessions';
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('   🧹 Cleaned up temporary extraction sessions');
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  private async getSinceDate(): Promise<Date | undefined> {
    // Check command line option first
    if (this.options.since) {
      return new Date(this.options.since);
    }

    // Check last extraction file
    if (fs.existsSync(this.lastExtractionFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.lastExtractionFile, 'utf-8'));
        return new Date(data.timestamp);
      } catch (e) {
        console.warn('⚠️  Could not read last extraction timestamp');
      }
    }

    return undefined;
  }

  private async updateLastExtraction(): Promise<void> {
    const data = {
      timestamp: new Date().toISOString(),
      version: '0.1.0'
    };

    fs.mkdirSync(path.dirname(this.lastExtractionFile), { recursive: true });
    fs.writeFileSync(this.lastExtractionFile, JSON.stringify(data, null, 2));
  }
}