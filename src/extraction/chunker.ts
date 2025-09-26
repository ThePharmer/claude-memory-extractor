// ABOUTME: Breaks sessions into coherent conversation chunks for analysis
// ABOUTME: Groups related messages into extractable units

import { SessionMessage, Session } from '../types';

export interface ConversationChunk {
  messages: SessionMessage[];
  startIndex: number;
  endIndex: number;
  hasUserCorrection: boolean;
  hasToolUse: boolean;
  topicShift: boolean;
}

export class SessionChunker {
  private readonly CHUNK_SIZE_TARGET = 200000; // Target size in characters (~50k tokens)
  private readonly MAX_CHUNK_SIZE = 280000;     // Maximum size in characters (~70k tokens)
  // Rough approximation: 1 token ≈ 4 characters for English text

  chunkSession(session: Session): ConversationChunk[] {
    const chunks: ConversationChunk[] = [];
    let currentChunk: SessionMessage[] = [];
    let startIndex = 0;
    let currentChunkSize = 0;

    for (let i = 0; i < session.messages.length; i++) {
      const message = session.messages[i];
      const messageSize = this.getMessageSize(message);

      // Check if adding this message would exceed max size
      if (currentChunkSize + messageSize > this.MAX_CHUNK_SIZE && currentChunk.length > 0) {
        // Save current chunk before adding this message
        chunks.push({
          messages: [...currentChunk],
          startIndex,
          endIndex: i - 1,
          hasUserCorrection: this.detectUserCorrection(currentChunk),
          hasToolUse: this.hasToolUse(currentChunk),
          topicShift: false
        });

        currentChunk = [];
        currentChunkSize = 0;
        startIndex = i;
      }

      currentChunk.push(message);
      currentChunkSize += messageSize;

      // Check for natural breakpoints only after reaching target size
      if (currentChunkSize >= this.CHUNK_SIZE_TARGET) {
        const isTopicShift = this.detectTopicShift(currentChunk, session.messages[i + 1]);
        const hasCorrection = this.detectUserCorrection(currentChunk);

        if (isTopicShift || i === session.messages.length - 1) {
          chunks.push({
            messages: [...currentChunk],
            startIndex,
            endIndex: i,
            hasUserCorrection: hasCorrection,
            hasToolUse: this.hasToolUse(currentChunk),
            topicShift: isTopicShift
          });

          currentChunk = [];
          currentChunkSize = 0;
          startIndex = i + 1;
        }
      }
    }

    // Add any remaining messages
    if (currentChunk.length > 0) {
      chunks.push({
        messages: [...currentChunk],
        startIndex,
        endIndex: session.messages.length - 1,
        hasUserCorrection: this.detectUserCorrection(currentChunk),
        hasToolUse: this.hasToolUse(currentChunk),
        topicShift: false
      });
    }

    return chunks;
  }

  private detectTopicShift(currentChunk: SessionMessage[], nextMessage?: SessionMessage): boolean {
    if (!nextMessage) return false;

    // Simple heuristics for topic shift
    const lastUserMessage = this.getLastUserMessage(currentChunk);
    if (!lastUserMessage) return false;

    const content = this.getMessageContent(lastUserMessage);

    // Look for explicit topic markers
    const topicMarkers = [
      /^(now|next|also|another|different|separate)/i,
      /^(okay|ok|alright|good|great|perfect|thanks).*now/i,
      /^(let's|lets|can you|could you|please)/i,
      /^##+ /,  // Markdown headers
    ];

    return topicMarkers.some(marker => marker.test(content));
  }

  private detectUserCorrection(messages: SessionMessage[]): boolean {
    const correctionPatterns = [
      /\b(no|wrong|incorrect|actually|wait|stop|don't|never|always)\b/i,
      /\b(that's not|that is not|you're wrong|you are wrong)\b/i,
      /\b(fix|correct|undo|revert)\b/i,
    ];

    return messages.some(msg => {
      if (msg.type !== 'user') return false;
      const content = this.getMessageContent(msg);
      return correctionPatterns.some(pattern => pattern.test(content));
    });
  }

  private hasToolUse(messages: SessionMessage[]): boolean {
    return messages.some(msg => {
      if (msg.type !== 'assistant') return false;
      if (typeof msg.message.content === 'string') return false;

      return msg.message.content.some(block => block.type === 'tool_use');
    });
  }

  private getLastUserMessage(messages: SessionMessage[]): SessionMessage | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        return messages[i];
      }
    }
    return undefined;
  }

  private getMessageContent(message: SessionMessage): string {
    if (!message?.message?.content) {
      return '';
    }
    if (typeof message.message.content === 'string') {
      return message.message.content;
    }

    return message.message.content
      .filter(block => block.type === 'text')
      .map(block => block.text || '')
      .join(' ');
  }

  private getMessageSize(message: SessionMessage): number {
    // Calculate approximate size in characters
    let size = 0;

    // Add message content size
    const content = this.getMessageContent(message);
    size += content.length;

    // Add tool use content if present
    if (message?.message?.content && typeof message.message.content !== 'string') {
      message.message.content.forEach(block => {
        if (block.type === 'tool_use') {
          // Tool inputs can be large, count them
          size += JSON.stringify(block).length;
        }
        if (block.type === 'tool_result') {
          // Tool results can be very large
          size += JSON.stringify(block).length;
        }
      });
    }

    // Add some overhead for metadata
    size += 100;

    return size;
  }
}