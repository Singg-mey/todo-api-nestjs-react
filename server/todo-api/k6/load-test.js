import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 5 },  // ramp up to 5 virtual users
    { duration: '10s', target: 10 }, // hold at 10 virtual users
    { duration: '5s', target: 0 },  // ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],    // less than 1% errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const vuId = `${__VU}_${__ITER}_${Date.now()}`;
  const email = `k6_user_${vuId}@example.com`;
  const password = 'Password123!';
  const headers = { 'Content-Type': 'application/json' };

  // 1. Signup
  const signupPayload = JSON.stringify({
    email,
    password,
    name: `k6 VU ${__VU}`,
  });
  const signupRes = http.post(`${BASE_URL}/api/auth/signup`, signupPayload, { headers });
  check(signupRes, {
    'signup succeeded (201)': (r) => r.status === 201,
  });

  // 2. Login
  const loginPayload = JSON.stringify({ email, password });
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers });
  check(loginRes, {
    'login succeeded (200)': (r) => r.status === 200,
  });

  const body = JSON.parse(loginRes.body || '{}');
  const token = body.accessToken;

  if (token) {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Create Todo
    const createRes = http.post(
      `${BASE_URL}/api/todos`,
      JSON.stringify({ title: `Load Test Task ${vuId}`, status: 'TODO' }),
      { headers: authHeaders }
    );
    check(createRes, {
      'create todo succeeded (201)': (r) => r.status === 201,
    });

    const createdTodo = JSON.parse(createRes.body || '{}');
    const todoId = createdTodo.id;

    // 4. Read Todos list
    const listRes = http.get(`${BASE_URL}/api/todos`, { headers: authHeaders });
    check(listRes, {
      'list todos succeeded (200)': (r) => r.status === 200,
    });

    // 5. Read specific Todo
    if (todoId) {
      const getRes = http.get(`${BASE_URL}/api/todos/${todoId}`, { headers: authHeaders });
      check(getRes, {
        'get single todo succeeded (200)': (r) => r.status === 200,
      });
    }
  }

  sleep(1);
}

