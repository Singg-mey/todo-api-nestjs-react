# Lab 05: Events and Background Jobs

A full-stack Todo application with **NestJS**, **React**, and **RabbitMQ** demonstrating asynchronous event-driven architecture, scheduled background jobs, and durable message queuing with manual acknowledgements.

---

## 🏗️ Architecture & Core Features

```
┌────────────────────────┐         ┌─────────────────────────┐
│ React Client (Port 5173│         │   NestJS API (Port 3000)│
│                        ├────────►│                         │
│ • Todo Management      │  HTTP   │ • Auth & Todos CRUD     │
│ • Live Activity Feed   │◄────────┤ • EventEmitter2         │
└────────────────────────┘         │ • @Cron Scheduled Job   │
                                   └───────┬─────────┬───────┘
                                           │         │
                 Emit events after commit  │         │ Persistent publish
                                           ▼         ▼
                              ┌──────────────┐   ┌──────────────────────────┐
                              │  activity    │   │  RabbitMQ (Port 5672)    │
                              │  Database    │   │                          │
                              │  Table       │   │ • email_queue (Durable)  │
                              └──────────────┘   │ • email_retry (10s TTL)  │
                                                 │ • email_dlq (Dead Letter)│
                                                 │ • todo.topic (Exchange)  │
                                                 └─────────────┬────────────┘
                                                               │
                                         Consume (noAck: false)│ 5s delay & manual ack
                                                               ▼
                                                 ┌──────────────────────────┐
                                                 │   Email Worker App       │
                                                 │                          │
                                                 │ • Consumes email_queue   │
                                                 │ • 5s testing delay       │
                                                 │ • Manual channel.ack()   │
                                                 │ • Duplicate detection    │
                                                 │ • Retry + DLQ logic      │
                                                 └──────────────────────────┘
```

---

## 🧩 Four Core Pieces

### 01 · Activity Listener
- **Event Emission**: Emits `todo.created`, `todo.updated`, and `todo.deleted` strictly **after** database transactions commit.
- **Listener**: `ActivityListener` listens for these events via `@OnEvent()` and records audit logs into the `activity` table (`id`, `action`, `todoId`, `todoTitle`, `userId`, `createdAt`).
- **Endpoint**: `GET /activity` (and `GET /api/activity`) returns the latest activity events.
- **React Feed**: Rendered live on the frontend with visual status badges.

### 02 · Scheduled Cleanup
- **@Cron Background Job**: Runs every day at midnight (`@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`).
- **Purge Query**: Deletes todos where `status = 'DONE'` and `updatedAt <= NOW() - 30 days`.
- **Log Output**: Outputs the exact count: `[TodosService] Purged 1` (or `Purged <count>`).
- **Manual Verification**: Includes `POST /api/todos/seed-old` (creates a 31-day-old completed todo) and `POST /api/todos/purge` (runs cleanup on demand for grading).

### 03 · Queued Email
- **Async Publishing**: On user registration (`POST /api/auth/signup`), publishes a `user.registered` event to RabbitMQ's `email_queue`.
- **Durability**: The queue is declared with `{ durable: true }` and messages are sent with `{ persistent: true }` (`deliveryMode: 2`).
- **Non-blocking**: The registration HTTP request returns immediately without waiting for email delivery.

### 04 · Manual Acknowledgement
- **noAck: false**: Consumer is configured with `{ noAck: false }` so messages are never auto-acknowledged upon delivery.
- **5-second Testing Delay**: Adds a 5000ms delay in the worker handler before processing.
- **Manual Ack**: Calls `channel.ack(msg)` only after the simulated email dispatch finishes.
- **RabbitMQ UI Proof**: Shows **1 Unacked** in the RabbitMQ management dashboard during the 5s window, then drops back to **0**.

---

## 🌟 Stretch Goals (S1, S2, S3)

- **S1 · Retry + DLQ**: Declares `email_retry` (with 10-second message TTL and dead-letter routing back to `email_queue`) and `email_dlq`. Failed deliveries retry up to 3 times (10s apart) before moving to `email_dlq`. (Run worker with `SIMULATE_FAIL=true` to demonstrate).
- **S2 · Duplicates / Idempotency**: Records `messageId` before execution. If the same `messageId` is received more than once, it is logged as duplicate, skipped, and acknowledged without re-executing.
- **S3 · Topic Subscriptions**: Publishes events to the topic exchange `todo.topic`. The notification service binds to `todo.completed` (completing a todo triggers a notification log; creating a todo does not).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v20+ recommended, tested on Node v24)
- PostgreSQL database running (configured in `.env`)
- Docker Desktop (for RabbitMQ)

### 2. Start RabbitMQ via Docker Compose
From the project root:
```bash
docker compose up -d
```
- AMQP port: `localhost:5672`
- RabbitMQ Management Dashboard: **[http://localhost:15672](http://localhost:15672)** (User: `guest`, Pass: `guest`)

### 3. Start the NestJS Backend API
```bash
cd server/todo-api
npm install
npm run start:dev
```
API runs on `http://localhost:3000`.

### 4. Start the Background Worker
In a separate terminal:
```bash
cd server/todo-api
npm run start:worker
```

### 5. Start the React Frontend
In a separate terminal:
```bash
cd client/my-react-todo/my-project
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 🧪 Verification Guide: Prove it with Three Tests

### Test A · Queued Processing
> Proves that messages accumulate in the queue when the worker is offline and are consumed once the worker starts.

1. **Stop the worker**: Press `Ctrl+C` in the worker terminal.
2. **Register 5 users**: Send 5 signup requests via Postman, frontend, or curl:
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"email\":\"test_a1@test.com\",\"password\":\"Pass123!\"}"
   curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"email\":\"test_a2@test.com\",\"password\":\"Pass123!\"}"
   curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"email\":\"test_a3@test.com\",\"password\":\"Pass123!\"}"
   curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"email\":\"test_a4@test.com\",\"password\":\"Pass123!\"}"
   curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"email\":\"test_a5@test.com\",\"password\":\"Pass123!\"}"
   ```
3. **Verify in RabbitMQ UI**: Open `http://localhost:15672/#/queues` -> `email_queue`. Notice **Ready = 5**. *(Take Screenshot A1)*
4. **Start the worker**:
   ```bash
   npm run start:worker
   ```
5. **Expected result**: All 5 emails are processed and logged sequentially. `Ready` returns to **0**. *(Take Screenshot A2)*

---

### Test B · Broker Restart (Persistence)
> Proves queue durability and message persistence (`deliveryMode: 2`) across broker restarts.

1. **Stop the worker**: Press `Ctrl+C` in the worker terminal.
2. **Register 5 users**: (Repeat registration of 5 distinct users).
3. **Restart the RabbitMQ broker**:
   ```bash
   docker compose restart rabbitmq
   ```
4. **Verify in RabbitMQ UI**: After RabbitMQ restarts, open `http://localhost:15672/#/queues`. Notice **Ready = 5** still exists! The messages survived the broker restart. *(Take Screenshot B1)*
5. **Start the worker**:
   ```bash
   npm run start:worker
   ```
6. **Expected result**: All 5 persisted messages are processed and acknowledged. *(Take Screenshot B2)*

---

### Test C · Crash Before Ack
> Proves that unacknowledged messages return to the queue and are re-delivered upon worker crash.

1. **Ensure worker is running**:
   ```bash
   npm run start:worker
   ```
2. **Register 1 user**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" -d "{\"email\":\"crash_test@test.com\",\"password\":\"Pass123!\"}"
   ```
3. **Kill the worker during the 5s delay**:
   - As soon as the worker logs:
     `⏳ [Worker] Processing email... Waiting 5s delay (Check RabbitMQ UI for 1 Unacked)...`
   - Immediately press `Ctrl+C` in the worker terminal to kill it before the 5 seconds elapse.
4. **Verify in RabbitMQ UI**: In the dashboard, the message returns from `Unacked` back to **Ready = 1**. *(Take Screenshot C1)*
5. **Restart the worker**:
   ```bash
   npm run start:worker
   ```
6. **Expected result**: The worker receives the message again with `Redelivered: true`, logs the email, and successfully acknowledges it. *(Take Screenshot C2)*

---

## 🧪 Testing Core 01 & Core 02

### Testing Core 01 (Activity Listener):
1. Create a todo in the UI or via API:
   ```bash
   curl -X POST http://localhost:3000/api/todos -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"Event Demo Todo\"}"
   ```
2. Request the activity feed:
   ```bash
   curl http://localhost:3000/activity
   ```
3. **Result**: Shows new row with `action: "todo.created"`.

### Testing Core 02 (Scheduled Cleanup):
1. Seed a 31-day-old done todo:
   ```bash
   curl -X POST http://localhost:3000/api/todos/seed-old -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"title\":\"31-day-old completed task\"}"
   ```
2. Run the purge:
   ```bash
   curl -X POST http://localhost:3000/api/todos/purge -H "Authorization: Bearer <TOKEN>"
   ```
3. **Result**: Returns `{ success: true, purged: 1, message: "Purged 1" }` and the console logs `[TodosService] Purged 1`.

---

## 📁 Repository Structure

```
todo-api/
├── docker-compose.yml                     # RabbitMQ with Management UI
├── README.md                              # This documentation
├── client/my-react-todo/my-project/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActivityFeed.jsx          # Live activity feed component (Core 01)
│   │   │   ├── AdminTodos.jsx
│   │   │   ├── AuthModal.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── TaskCard.jsx
│   │   └── App.jsx                       # Main React application
└── server/todo-api/
    ├── src/
    │   ├── activity/                     # Core 01: Activity entity, listener, controller
    │   │   ├── entities/activity.entity.ts
    │   │   ├── listeners/activity.listener.ts
    │   │   ├── activity.controller.ts
    │   │   ├── activity.service.ts
    │   │   └── activity.module.ts
    │   ├── rabbitmq/                     # Core 03: RabbitMQ producer service
    │   │   ├── rabbitmq.service.ts
    │   │   └── rabbitmq.module.ts
    │   ├── worker/                       # Core 04 & Stretch S1/S2/S3: Worker application
    │   │   ├── worker.ts
    │   │   └── worker.spec.ts
    │   ├── todos/                        # Core 02: @Cron scheduled cleanup & topic events
    │   │   ├── events/todo.events.ts
    │   │   ├── todos.service.ts
    │   │   └── todos.controller.ts
    │   ├── auth/                         # Core 03: Emits user.registered on signup
    │   │   └── auth.service.ts
    │   └── app.module.ts                 # EventEmitterModule & ScheduleModule registered
    └── test/
        └── events-jobs.e2e-spec.ts       # Automated E2E verification test suite
```
