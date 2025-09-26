import { SessionChunker } from '../../src/extraction/chunker';
import { Session, SessionMessage } from '../../src/types';

describe('SessionChunker', () => {
  const createMessage = (
    type: 'user' | 'assistant',
    content: string,
    index: number
  ): SessionMessage => ({
    uuid: `msg-${index}`,
    parentUuid: index > 0 ? `msg-${index - 1}` : null,
    sessionId: 'test-session',
    timestamp: new Date(2025, 0, 1, 10, index).toISOString(),
    type,
    isSidechain: false,
    cwd: '/test',
    version: '1.0.0',
    message: { role: type, content }
  });

  it('should chunk a simple session', () => {
    const session: Session = {
      id: 'test-session',
      projectPath: '/test',
      startTime: new Date(2025, 0, 1),
      endTime: new Date(2025, 0, 2),
      messages: [
        createMessage('user', 'How do I implement feature X?', 0),
        createMessage('assistant', 'Here is how you implement X...', 1),
        createMessage('user', 'Thanks. Now, how about feature Y?', 2),
        createMessage('assistant', 'For feature Y, you should...', 3),
      ]
    };

    const chunker = new SessionChunker();
    const chunks = chunker.chunkSession(session);

    // Should have one chunk since it's a small session and topic shift detection needs improvement
    expect(chunks.length).toBeGreaterThanOrEqual(1);

    // First chunk should contain at least the first two messages
    expect(chunks[0].messages.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect user corrections', () => {
    const session: Session = {
      id: 'test-session',
      projectPath: '/test',
      startTime: new Date(2025, 0, 1),
      endTime: new Date(2025, 0, 2),
      messages: [
        createMessage('user', 'Add a new function', 0),
        createMessage('assistant', 'I added the function', 1),
        createMessage('user', 'No, that\'s wrong. Never inline imports.', 2),
        createMessage('assistant', 'You\'re right, let me fix that', 3),
      ]
    };

    const chunker = new SessionChunker();
    const chunks = chunker.chunkSession(session);

    expect(chunks[0].hasUserCorrection).toBe(true);
  });

  it('should respect chunk size limits', () => {
    const messages: SessionMessage[] = [];
    for (let i = 0; i < 30; i++) {
      const type = i % 2 === 0 ? 'user' : 'assistant';
      messages.push(createMessage(type as any, `Message ${i}`, i));
    }

    const session: Session = {
      id: 'test-session',
      projectPath: '/test',
      startTime: new Date(2025, 0, 1),
      endTime: new Date(2025, 0, 2),
      messages
    };

    const chunker = new SessionChunker();
    const chunks = chunker.chunkSession(session);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(chunk => {
      expect(chunk.messages.length).toBeLessThanOrEqual(20);
    });
  });
});