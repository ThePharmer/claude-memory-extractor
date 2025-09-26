// ABOUTME: Agent-based memory extractor using custom Claude Code agent
// ABOUTME: Launches memory-extractor agent to analyze conversations and write memories

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { ConversationChunk } from './chunker';

const execAsync = promisify(exec);

export class AgentExtractor {
  private outputDir: string;
  private agentPromptPath: string;

  constructor(outputDir: string = './insights') {
    this.outputDir = outputDir;
    this.agentPromptPath = path.join(__dirname, '../../agents/multi-dimensional-extractor.md');

    // Ensure the output directory exists
    fs.mkdirSync(outputDir, { recursive: true });
  }

  async extractFromChunk(chunk: ConversationChunk, sessionId: string, sessionStartTime: Date, projectPath?: string): Promise<number> {
    console.log('\n📝 Launching memory extraction agent...');
    console.log(`   Chunk has ${chunk.messages.length} messages`);

    const messages = chunk.messages
      .filter(m => m.message && m.message.content)
      .map(m => `${m.type.toUpperCase()} [${m.uuid}]: ${this.getContent(m.message.content)}`)
      .join('\n\n');

    if (!messages.trim()) {
      console.log('   ⚠️  No valid messages after filtering');
      return 0;
    }

    console.log(`   Message content length: ${messages.length} chars`);

    const chunkProjectPath = projectPath || chunk.messages[0].cwd || 'unknown';
    const projectName = this.extractProjectName(chunkProjectPath);

    // Use extraction timestamp as fallback
    const extractionTimestamp = new Date().toISOString();
    const sessionTimestamp = (sessionStartTime && !isNaN(sessionStartTime.getTime()))
      ? sessionStartTime.toISOString()
      : extractionTimestamp;

    // Read the agent prompt
    const agentInstructions = await fs.promises.readFile(this.agentPromptPath, 'utf8');

    const prompt = `${agentInstructions}

## Current Extraction Task

Extract memories from this conversation chunk and save them to: ${this.outputDir}

Use this naming pattern for files:
${this.outputDir}/${sessionTimestamp.replace(/[:.]/g, '-')}-${projectName}-[type]-${sessionId.substring(0,6)}-[index].md

Where:
- [type] is one of: pattern, rule, failure, discovery, workflow
- [index] is a 3-digit number starting from 000

Session Info:
- Session ID: ${sessionId}
- Session Time: ${sessionTimestamp}
- Project: ${projectName} (${chunkProjectPath})

<conversation>
${messages}
</conversation>

Your task: Analyze this conversation using all three dimensions (Root Cause, Psychological Driver, Prevention Strategy) and synthesize into ONE comprehensive memory file using the Write tool.`;

    console.log(`   Writing prompt to temp file...`);
    console.log(`   Prompt length: ${prompt.length} chars`);

    try {
      // Write prompt to temp file
      const tmpFile = path.join('/tmp', `agent-prompt-${Date.now()}.txt`);
      await fs.promises.writeFile(tmpFile, prompt, 'utf8');
      console.log(`   Temp file: ${tmpFile}`);

      // Count files before
      const filesBefore = fs.existsSync(this.outputDir)
        ? fs.readdirSync(this.outputDir).filter(f => f.includes(sessionId.substring(0,6))).length
        : 0;

      // Launch the agent with Write tool access
      // Using opus for better extraction quality
      const tempProjectsDir = '/tmp/claude-extraction-sessions';
      await fs.promises.mkdir(tempProjectsDir, { recursive: true });

      const command = `claude --model sonnet --allowed-tools "Write" --add-dir "${this.outputDir}" --print < "${tmpFile}"`;
      console.log('   🤖 Launching extraction agent (sonnet)...');

      const startTime = Date.now();
      const { stdout } = await execAsync(command, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        shell: '/bin/bash',
        timeout: 120000 // 2 minute timeout
      });

      const elapsed = Date.now() - startTime;
      console.log(`   ✅ Agent completed in ${elapsed}ms`);

      // Log first part of response for debugging
      if (process.env.DEBUG) {
        console.log(`   Response preview: ${stdout.substring(0, 500)}...`);
      }

      // Clean up
      await fs.promises.unlink(tmpFile).catch(() => {});

      // Count files created
      const filesAfter = fs.existsSync(this.outputDir)
        ? fs.readdirSync(this.outputDir).filter(f => f.includes(sessionId.substring(0,6))).length
        : 0;
      const filesCreated = filesAfter - filesBefore;

      if (filesCreated > 0) {
        console.log(`   📄 Agent created ${filesCreated} memory files`);
      } else {
        console.log(`   ⚠️  No files created - agent may have found no insights`);
        if (process.env.DEBUG) {
          console.log(`   Full response: ${stdout}`);
        }
      }

      return filesCreated;
    } catch (error: any) {
      console.error('\n❌ Agent extraction error:', error.message);
      if (process.env.DEBUG) {
        console.error('   Stack:', error.stack);
      }
      return 0;
    }
  }

  private getContent(content: string | any[]): string {
    if (typeof content === 'string') return content;
    return content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text || '')
      .join(' ');
  }

  private extractProjectName(projectPath: string): string {
    // Handle Claude projects format: -Users-jesse-Documents-GitHub-projects-project-name
    if (projectPath.includes('-Users-')) {
      const parts = projectPath.split('-');
      return parts[parts.length - 1] || 'unknown';
    }

    // Handle regular paths
    const parts = projectPath.split('/');
    return parts[parts.length - 1] || 'unknown';
  }
}