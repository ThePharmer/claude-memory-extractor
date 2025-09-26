#!/usr/bin/env node
// ABOUTME: Main CLI entry point for memory extraction and management
// ABOUTME: Provides commands for extracting, searching, and managing memories

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as os from 'os';
import * as path from 'path';
import { ExtractCommand } from './commands/extract';

// Load environment variables
dotenv.config();

// Helper to expand tilde in paths
function expandPath(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

const program = new Command();

program
  .name('claude-memory')
  .description('🧠 Multi-dimensional memory extraction for Claude Code conversations')
  .version('1.0.0')
  .configureHelp({
    sortSubcommands: true,
  });

// Extract command
program
  .command('extract')
  .description('🔍 Extract memories from Claude Code conversation logs')
  .option('-s, --since <date>', 'Only process sessions after this date (e.g., "2025-09-01T00:00:00")')
  .option('-p, --projects-dir <dir>', 'Claude projects directory', expandPath(process.env.CLAUDE_PROJECTS_DIR) || path.join(os.homedir(), '.claude/projects'))
  .option('-m, --memories-dir <dir>', 'Memories output directory', expandPath(process.env.MEMORIES_DIR) || path.join(os.homedir(), '.claude/memories'))
  .option('-i, --index-dir <dir>', 'Vector index directory', process.env.INDEX_DIR || './index')
  .option('--dry-run', 'Preview what would be extracted without writing')
  .addHelpText('after', `
Examples:
  $ claude-memory extract --since="2025-09-01T00:00:00"
  $ claude-memory extract --projects-dir=/custom/path

Note: Requires authenticated Claude CLI installation`)
  .action(async (options) => {
    // Expand paths in options
    options.projectsDir = expandPath(options.projectsDir) || options.projectsDir;
    options.memoriesDir = expandPath(options.memoriesDir) || options.memoriesDir;
    options.indexDir = expandPath(options.indexDir) || options.indexDir;

    const command = new ExtractCommand(options);
    await command.execute();
  });

// Info command
program
  .command('info')
  .description('📊 Show system information and status')
  .action(() => {
    console.log('🧠 Claude Memory v1.0.0');
    console.log('Multi-dimensional memory extraction for Claude Code');
    console.log('');
    console.log('📍 Default paths:');
    console.log(`  Projects: ${path.join(os.homedir(), '.claude/projects')}`);
    console.log(`  Memories: ${path.join(os.homedir(), '.claude/memories/extracted')}`);
    console.log('');
    console.log('🔧 Requirements:');
    console.log('  - Claude CLI installed and authenticated');
    console.log('  - Node.js 18+');
    console.log('');
    console.log('📚 Learn more: https://github.com/obra/claude-memory');
  });

// Future commands can be added here

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}