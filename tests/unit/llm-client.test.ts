import { LLMClient } from '../../src/extraction/llm-client';
import { ConversationChunk } from '../../src/extraction/chunker';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn()
    }
  }));
});

describe('LLMClient', () => {
  let client: LLMClient;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new LLMClient('test-api-key');
    mockCreate = Anthropic.mock.results[0].value.messages.create;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should screen a chunk for valuable content', async () => {
    // Mock the response
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          hasValue: true,
          reason: 'Contains explicit coding rule',
          confidence: 0.9
        })
      }]
    });

    const chunk: ConversationChunk = {
      messages: [
        {
          uuid: 'msg-1',
          type: 'user',
          message: { role: 'user', content: 'Never inline imports' }
        } as any
      ],
      startIndex: 0,
      endIndex: 0,
      hasUserCorrection: true,
      hasToolUse: false,
      topicShift: false
    };

    const result = await client.screenChunk(chunk);

    expect(result.hasValue).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(result.reason).toContain('explicit coding rule');
  });

  it('should extract insights from a chunk', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify([
          {
            content: 'Never inline imports',
            reasoning: 'Keeps code organized',
            context: 'All TypeScript files',
            type: 'rule',
            confidence: 0.95,
            message_uuids: ['msg-1']
          }
        ])
      }]
    });

    const chunk: ConversationChunk = {
      messages: [
        {
          uuid: 'msg-1',
          type: 'user',
          cwd: '/test/project',
          timestamp: '2025-01-01T10:00:00Z',
          message: { role: 'user', content: 'Never inline imports' }
        } as any
      ],
      startIndex: 0,
      endIndex: 0,
      hasUserCorrection: true,
      hasToolUse: false,
      topicShift: false
    };

    const insights = await client.extractInsights(chunk, 'session-123');

    expect(insights).toHaveLength(1);
    expect(insights[0].content).toBe('Never inline imports');
    expect(insights[0].type).toBe('rule');
    expect(insights[0].confidence).toBe(0.95);
  });
});