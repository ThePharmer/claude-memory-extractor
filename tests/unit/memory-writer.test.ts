import * as fs from 'fs';
import * as path from 'path';
import { MemoryWriter } from '../../src/storage/memory-writer';
import { ExtractedInsight } from '../../src/types';

describe('MemoryWriter', () => {
  const testDir = path.join(__dirname, '../test-memories');
  let writer: MemoryWriter;

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
    writer = new MemoryWriter(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should write a memory to file', async () => {
    const insight: ExtractedInsight = {
      content: 'Never inline imports',
      reasoning: 'Keeps code organized',
      context: 'TypeScript files',
      type: 'rule',
      confidence: 0.95,
      source: {
        session_id: 'session-123',
        message_uuids: ['msg-1'],
        timestamp: new Date()
      }
    };

    const memory = await writer.writeMemory(insight, {
      projects: ['test-project'],
      languages: ['typescript']
    });

    expect(memory.id).toMatch(/^mem-\d{4}-\d{2}-\d{2}-\d+$/);
    expect(memory.content).toContain('Never inline imports');
    expect(memory.metadata.confidence).toBe(0.95);
    expect(memory.metadata.projects).toContain('test-project');

    // Verify file was written
    const savedMemory = await writer.readMemory(memory.id);
    expect(savedMemory).not.toBeNull();
    expect(savedMemory?.content).toContain('Never inline imports');
  });

  it('should update memory metadata', async () => {
    const insight: ExtractedInsight = {
      content: 'Test memory',
      reasoning: '',
      context: '',
      type: 'rule',
      confidence: 0.5,
      source: {
        session_id: 'session-123',
        message_uuids: [],
        timestamp: new Date()
      }
    };

    const memory = await writer.writeMemory(insight, {});

    await writer.updateMemory(memory.id, {
      usefulness_score: 2.5,
      tags: ['updated', 'test']
    });

    const updated = await writer.readMemory(memory.id);
    expect(updated?.metadata.usefulness_score).toBe(2.5);
    expect(updated?.metadata.tags).toContain('updated');
  });

  it('should read all memories', async () => {
    // Write multiple memories
    const insights: ExtractedInsight[] = [
      {
        content: 'Memory 1',
        reasoning: '',
        context: '',
        type: 'rule',
        confidence: 0.8,
        source: {
          session_id: 'session-1',
          message_uuids: [],
          timestamp: new Date()
        }
      },
      {
        content: 'Memory 2',
        reasoning: '',
        context: '',
        type: 'pattern',
        confidence: 0.7,
        source: {
          session_id: 'session-2',
          message_uuids: [],
          timestamp: new Date()
        }
      }
    ];

    for (const insight of insights) {
      await writer.writeMemory(insight, {});
    }

    const memories: any[] = [];
    for await (const memory of writer.readAllMemories()) {
      memories.push(memory);
    }

    expect(memories).toHaveLength(2);
    const contents = memories.map(m => m.content);
    expect(contents.some(c => c.includes('Memory 1'))).toBe(true);
    expect(contents.some(c => c.includes('Memory 2'))).toBe(true);
  });
});