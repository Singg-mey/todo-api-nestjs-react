import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

let pgContainer: StartedPostgreSqlContainer | null = null;
let rabbitContainer: StartedTestContainer | null = null;

export async function startContainers() {
  // Start ephemeral PostgreSQL container
  pgContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_pass')
    .start();

  process.env.DB_HOST = pgContainer.getHost();
  process.env.DB_PORT = pgContainer.getPort().toString();
  process.env.DB_USERNAME = pgContainer.getUsername();
  process.env.DB_PASSWORD = pgContainer.getPassword();
  process.env.DB_NAME = pgContainer.getDatabase();

  // Start ephemeral RabbitMQ container
  try {
    rabbitContainer = await new GenericContainer('rabbitmq:3-management-alpine')
      .withExposedPorts(5672, 15672)
      .start();

    const rabbitPort = rabbitContainer.getMappedPort(5672);
    const rabbitHost = rabbitContainer.getHost();
    process.env.RABBITMQ_URL = `amqp://guest:guest@${rabbitHost}:${rabbitPort}`;
  } catch (err) {
    console.warn('RabbitMQ Testcontainer could not be started; falling back to local/mock.', err);
  }

  return {
    pg: pgContainer,
    rabbit: rabbitContainer,
  };
}

export async function stopContainers() {
  if (pgContainer) {
    await pgContainer.stop();
    pgContainer = null;
  }
  if (rabbitContainer) {
    await rabbitContainer.stop();
    rabbitContainer = null;
  }
}
