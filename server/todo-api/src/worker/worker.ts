import amqplib, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = process.env.EMAIL_QUEUE || 'email_queue';
const RETRY_QUEUE = 'email_retry';
const DLQ_NAME = 'email_dlq';
const TOPIC_EXCHANGE = 'todo.topic';
const TOPIC_QUEUE = 'todo_completed_notifications';

// In-memory set to record processed message IDs (Stretch S2: Idempotency)
const processedMessageIds = new Set<string>();

// Flag to simulate mailer failures for testing Stretch S1 (set SIMULATE_FAIL=true in environment)
const SIMULATE_FAIL = process.env.SIMULATE_FAIL === 'true';

async function startWorker() {
  console.log('====================================================');
  console.log('🚀 Starting Background Email & Notification Worker...');
  console.log(`🔌 Connecting to RabbitMQ at: ${RABBITMQ_URL}`);
  console.log(`📬 Listening to queue: ${QUEUE_NAME} (durable: true)`);
  console.log('⏱️  Delay per message: 5000ms (5 seconds)');
  console.log('⚙️  Manual acknowledgement: ENABLED (noAck: false)');
  if (SIMULATE_FAIL) {
    console.log('⚠️  SIMULATE_FAIL=true is active: messages will fail and trigger Retry/DLQ (S1)');
  }
  console.log('====================================================\n');

  let connection: ChannelModel;
  try {
    connection = await amqplib.connect(RABBITMQ_URL);
  } catch (err: any) {
    console.error(`❌ Failed to connect to RabbitMQ: ${err.message}`);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(startWorker, 5000);
    return;
  }

  connection.on('error', (err) => {
    console.error(`❌ RabbitMQ connection error: ${err.message}`);
  });

  connection.on('close', () => {
    console.warn('⚠️ RabbitMQ connection closed. Attempting reconnect in 5s...');
    setTimeout(startWorker, 5000);
  });

  const channel: Channel = await connection.createChannel();

  // Prefetch 1: Fair dispatch so worker only receives 1 message at a time
  await channel.prefetch(1);

  // 1. Core 03: Assert main email_queue as durable
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  // Stretch S1: Declare DLQ & Retry Queue (10s TTL with Dead-Letter routing back to email_queue)
  await channel.assertQueue(DLQ_NAME, { durable: true });
  await channel.assertQueue(RETRY_QUEUE, {
    durable: true,
    arguments: {
      'x-message-ttl': 10000, // 10 seconds TTL
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': QUEUE_NAME,
    },
  });

  // Stretch S3: Topic Exchange & Notification Subscription
  await channel.assertExchange(TOPIC_EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(TOPIC_QUEUE, { durable: true });
  await channel.bindQueue(TOPIC_QUEUE, TOPIC_EXCHANGE, 'todo.completed');

  // Consumer for Topic Subscription (Stretch S3)
  channel.consume(
    TOPIC_QUEUE,
    (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log(`\n🔔 [Notification Service] Received event on routing key "${msg.fields.routingKey}":`, payload);
      } finally {
        channel.ack(msg);
      }
    },
    { noAck: false },
  );

  console.log(`✅ Worker is active and waiting for messages in "${QUEUE_NAME}"...`);
  console.log(`💡 Press Ctrl+C at any time to kill worker (e.g., to test Crash before Ack)`);

  // Core 04: Consume with noAck: false
  channel.consume(
    QUEUE_NAME,
    async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      const rawContent = msg.content.toString();
      const redelivered = msg.fields.redelivered;
      const messageId = msg.properties.messageId || 'unknown-id';
      const headers = msg.properties.headers || {};
      const retryCount = (headers['x-retry-count'] as number) || 1;

      console.log('\n----------------------------------------------------');
      console.log(`📥 [Worker] Received message from "${QUEUE_NAME}":`);
      console.log(`   Message ID:  ${messageId}`);
      console.log(`   Redelivered: ${redelivered}`);
      console.log(`   Retry Count: ${retryCount}/3`);
      console.log(`   Payload:     ${rawContent}`);

      // Stretch S2: Idempotency (Duplicate detection)
      if (messageId !== 'unknown-id' && processedMessageIds.has(messageId)) {
        console.log(`⏩ [Worker] Message ID ${messageId} already processed (Duplicate). Skipping execution and acking.`);
        channel.ack(msg);
        return;
      }

      // Core 04: Add 5 s delay in the handler for testing
      console.log('⏳ [Worker] Processing email... Waiting 5s delay (Check RabbitMQ UI for 1 Unacked)...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Stretch S1: Simulate failure for Retry + DLQ
      if (SIMULATE_FAIL) {
        console.error(`💥 [Worker] Simulated failure for message: ${messageId}`);

        if (retryCount < 3) {
          console.log(`🔁 [Worker] Attempt ${retryCount}/3 failed. Re-routing to "${RETRY_QUEUE}" (will retry in 10s)...`);
          channel.sendToQueue(RETRY_QUEUE, msg.content, {
            persistent: true,
            messageId,
            headers: {
              ...headers,
              'x-retry-count': retryCount + 1,
            },
          });
          channel.ack(msg);
          console.log('   Original message acked, retry message scheduled.');
          return;
        } else {
          console.error(`☠️ [Worker] Exceeded max retries (3/3). Moving message to Dead-Letter Queue "${DLQ_NAME}".`);
          channel.sendToQueue(DLQ_NAME, msg.content, {
            persistent: true,
            messageId,
            headers: {
              ...headers,
              'x-failed-reason': 'Max retries exceeded',
              'x-failed-at': new Date().toISOString(),
            },
          });
          channel.ack(msg);
          console.log(`   Message safely stored in "${DLQ_NAME}".`);
          return;
        }
      }

      // Success path: Log email and mark message as processed
      try {
        const parsed = JSON.parse(rawContent);
        const userEmail = parsed?.data?.email || parsed?.email || 'user';
        const userName = parsed?.data?.name || parsed?.name || userEmail;

        console.log(`📧 [Worker] SUCCESS: Sent welcome email to "${userName}" <${userEmail}>!`);
      } catch {
        console.log(`📧 [Worker] SUCCESS: Sent email for message ${messageId}!`);
      }

      // Record message ID for idempotency (Stretch S2)
      if (messageId !== 'unknown-id') {
        processedMessageIds.add(messageId);
      }

      // Core 04: Manual Acknowledgement
      channel.ack(msg);
      console.log(`✔️ [Worker] Message acknowledged (ACK). Unacked back to 0.`);
      console.log('----------------------------------------------------');
    },
    { noAck: false }, // Manual acknowledgement required!
  );
}

startWorker().catch((err) => {
  console.error('Fatal worker error:', err);
});
