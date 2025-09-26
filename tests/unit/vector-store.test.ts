import * as fs from 'fs';
import * as path from 'path';
import { VectorStore } from '../../src/storage/vector-store';
import { Memory } from '../../src/types';

// Mock LanceDB
jest.mock('@lancedb/lancedb', () => ({
  connect: jest.fn()
}));

describe('VectorStore', () => {
  const testIndexDir = path.join(__dirname, '../test-index');
  let store: VectorStore;
  let mockDb: any;
  let mockTable: any;

  beforeEach(async () => {
    fs.mkdirSync(testIndexDir, { recursive: true });

    // Setup mocks
    mockTable = {
      add: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      execute: jest.fn()
    };

    mockDb = {
      tableNames: jest.fn().mockResolvedValue([]),
      createTable: jest.fn().mockResolvedValue(mockTable),
      openTable: jest.fn().mockResolvedValue(mockTable)
    };

    const lancedb = require('@lancedb/lancedb');
    lancedb.connect.mockResolvedValue(mockDb);

    store = new VectorStore(testIndexDir);
    await store.initialize();
  });

  afterEach(() => {
    fs.rmSync(testIndexDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('should add and retrieve a memory', async () => {
    const memory: Memory = {
      id: 'test-mem-1',
      created: new Date(),
      content: 'Test memory content',
      metadata: {
        source_sessions: ['session-1'],
        projects: ['project-1'],
        languages: ['typescript'],
        tags: ['test'],
        confidence: 0.9,
        usefulness_score: 1.5,
        last_reinforced: new Date(),
        decay_next: new Date()
      }
    };

    const embedding = new Array(384).fill(0.1);

    await store.addMemory(memory, embedding);

    expect(mockTable.add).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'test-mem-1',
        confidence: 0.9
      })
    ]);
  });

  it('should search for similar memories', async () => {
    // Setup search mock
    const searchQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([
        {
          id: 'mem-1',
          content: 'Memory 1',
          confidence: 0.9,
          usefulness_score: 2.0,
          _distance: 0.1
        }
      ])
    };

    mockTable.search.mockReturnValue(searchQuery);

    const queryEmbedding = new Array(384).fill(0.5);
    const results = await store.searchSimilar(queryEmbedding, {
      limit: 5,
      filter: {
        minConfidence: 0.7
      }
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('mem-1');
    expect(results[0].score).toBe(0.1);
    expect(searchQuery.where).toHaveBeenCalledWith('confidence >= 0.7');
    expect(searchQuery.limit).toHaveBeenCalledWith(5);
  });

  it('should get statistics', async () => {
    mockTable.search.mockReturnValue({
      execute: jest.fn().mockResolvedValue([
        { confidence: 0.8, usefulness_score: 1.5 },
        { confidence: 0.6, usefulness_score: 2.5 }
      ])
    });

    const stats = await store.getStats();

    expect(stats.totalMemories).toBe(2);
    expect(stats.avgConfidence).toBeCloseTo(0.7, 1);
    expect(stats.avgUsefulness).toBeCloseTo(2.0, 1);
  });
});