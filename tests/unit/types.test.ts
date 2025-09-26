import { SessionMessage, Memory } from '../../src/types';

describe('Type Definitions', () => {
  it('should create valid SessionMessage', () => {
    const message: SessionMessage = {
      uuid: 'test-uuid',
      parentUuid: null,
      sessionId: 'session-123',
      timestamp: '2025-01-01T00:00:00Z',
      type: 'user',
      isSidechain: false,
      cwd: '/test/path',
      version: '1.0.0',
      message: {
        role: 'user',
        content: 'Test message'
      }
    };
    expect(message.uuid).toBe('test-uuid');
  });

  it('should create valid Memory', () => {
    const memory: Memory = {
      id: 'mem-2025-01-01-001',
      created: new Date('2025-01-01'),
      content: 'Test memory content',
      metadata: {
        source_sessions: ['session-123'],
        projects: ['test-project'],
        languages: ['typescript'],
        tags: ['test'],
        confidence: 0.9,
        usefulness_score: 1.0,
        last_reinforced: new Date('2025-01-01'),
        decay_next: new Date('2025-02-01')
      }
    };
    expect(memory.id).toBe('mem-2025-01-01-001');
  });
});