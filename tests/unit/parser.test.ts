import * as fs from 'fs';
import * as path from 'path';
import { SessionParser } from '../../src/extraction/parser';

describe('SessionParser', () => {
  const fixturesDir = path.join(__dirname, '../fixtures');
  const testSessionPath = path.join(fixturesDir, 'test-session.jsonl');

  beforeAll(() => {
    // Create test fixture
    fs.mkdirSync(fixturesDir, { recursive: true });

    const testMessages = [
      {
        uuid: 'msg-1',
        parentUuid: null,
        sessionId: 'session-test',
        timestamp: '2025-01-01T10:00:00Z',
        type: 'user',
        isSidechain: false,
        cwd: '/test/project',
        version: '1.0.0',
        message: { role: 'user', content: 'Test message 1' }
      },
      {
        uuid: 'msg-2',
        parentUuid: 'msg-1',
        sessionId: 'session-test',
        timestamp: '2025-01-01T10:01:00Z',
        type: 'assistant',
        isSidechain: false,
        cwd: '/test/project',
        version: '1.0.0',
        message: { role: 'assistant', content: 'Test response' }
      }
    ];

    fs.writeFileSync(
      testSessionPath,
      testMessages.map(m => JSON.stringify(m)).join('\n')
    );
  });

  afterAll(() => {
    // Clean up
    fs.rmSync(fixturesDir, { recursive: true, force: true });
  });

  it('should parse a session file', async () => {
    const parser = new SessionParser(fixturesDir);
    const session = await parser.parseSession(testSessionPath);

    expect(session.id).toBe('session-test');
    expect(session.messages).toHaveLength(2);
    expect(session.messages[0].message.content).toBe('Test message 1');
    expect(session.projectPath).toBe('/test/project');
  });

  it('should iterate over sessions', async () => {
    const parser = new SessionParser(fixturesDir);
    const sessions: any[] = [];

    for await (const session of parser.readSessions()) {
      sessions.push(session);
    }

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('session-test');
  });

  it('should filter sessions by date', async () => {
    const parser = new SessionParser(fixturesDir);
    const futureDate = new Date('2030-01-01');
    const sessions: any[] = [];

    for await (const session of parser.readSessions(futureDate)) {
      sessions.push(session);
    }

    expect(sessions).toHaveLength(0);
  });
});