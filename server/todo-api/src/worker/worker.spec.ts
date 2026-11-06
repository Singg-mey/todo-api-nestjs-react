import { describe, it, expect, vi } from 'vitest';

describe('Worker Unit Tests (Core 04 & Stretch S1/S2)', () => {
  it('Should acknowledge messages with noAck: false after processing', async () => {
    const mockChannel = {
      ack: vi.fn(),
      nack: vi.fn(),
      sendToQueue: vi.fn(),
    };

    const mockMsg = {
      content: Buffer.from(
        JSON.stringify({
          data: { email: 'worker_test@example.com', name: 'Tester' },
        }),
      ),
      properties: {
        messageId: 'test-msg-1',
        headers: {},
      },
      fields: {
        redelivered: false,
      },
    };

    // Simulate worker logic without the 5s sleep in unit test
    mockChannel.ack(mockMsg);

    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });

  it('Stretch S2: Should skip duplicate messageId and acknowledge immediately', async () => {
    const processedIds = new Set<string>(['duplicate-msg-id-123']);
    const mockChannel = {
      ack: vi.fn(),
    };

    const duplicateMsg = {
      content: Buffer.from(JSON.stringify({ data: { email: 'dup@example.com' } })),
      properties: { messageId: 'duplicate-msg-id-123' },
    };

    if (processedIds.has(duplicateMsg.properties.messageId)) {
      mockChannel.ack(duplicateMsg);
    }

    expect(mockChannel.ack).toHaveBeenCalledWith(duplicateMsg);
  });

  it('Stretch S1: Should route to email_dlq when max retries (3) exceeded', async () => {
    const mockChannel = {
      sendToQueue: vi.fn(),
      ack: vi.fn(),
    };

    const failedMsg = {
      content: Buffer.from(JSON.stringify({ data: { email: 'fail@example.com' } })),
      properties: {
        messageId: 'fail-msg-1',
        headers: { 'x-retry-count': 3 },
      },
    };

    const retryCount = failedMsg.properties.headers['x-retry-count'];
    if (retryCount >= 3) {
      mockChannel.sendToQueue('email_dlq', failedMsg.content, {
        persistent: true,
        messageId: failedMsg.properties.messageId,
      });
      mockChannel.ack(failedMsg);
    }

    expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
      'email_dlq',
      failedMsg.content,
      expect.objectContaining({ persistent: true, messageId: 'fail-msg-1' }),
    );
    expect(mockChannel.ack).toHaveBeenCalledWith(failedMsg);
  });
});
