// Native fetch is available in Node 18+

const API_URL = 'http://localhost:5000/api';
let tokenUser1 = '';
let tokenUser2 = '';
let leadId = '';

async function runTests() {
  console.log('--- Testing Validation Errors ---\n');

  // Test 1: POST /api/auth/register with an invalid email (no @ sign)
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'invalidemail.com',
        password: 'password123'
      })
    });
    console.log(`Test 1 (Invalid Email): Status ${res.status}`);
    console.log('Response:', await res.json(), '\n');
  } catch (error) {
    console.error('Test 1 failed to execute:', error.message);
    if (error.code === 'ECONNREFUSED') {
       console.log('Server is not running. Please start the server on port 5000.');
       process.exit(1);
    }
  }

  // Setup: Register/Login two users
  const user1Email = `user1_${Date.now()}@test.com`;
  const user2Email = `user2_${Date.now()}@test.com`;

  // Register User 1
  const res1 = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User One', email: user1Email, password: 'password123' })
  });
  const data1 = await res1.json();
  tokenUser1 = data1.token;

  // Register User 2
  const res2 = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User Two', email: user2Email, password: 'password123' })
  });
  const data2 = await res2.json();
  tokenUser2 = data2.token;

  // Setup: Create a lead for User 1
  const createLeadRes = await fetch(`${API_URL}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenUser1}` },
    body: JSON.stringify({ name: 'Valid Lead', email: 'valid@lead.com', status: 'new' })
  });
  const leadData = await createLeadRes.json();
  leadId = leadData._id;

  // Test 2: POST /api/leads with an empty name field -> should return 400
  try {
    const res = await fetch(`${API_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenUser1}` },
      body: JSON.stringify({ name: '', email: 'emptyname@test.com' })
    });
    console.log(`Test 2 (Empty Name): Status ${res.status}`);
    console.log('Response:', await res.json(), '\n');
  } catch (error) {
    console.error('Test 2 failed:', error.message);
  }

  // Test 3: GET /api/leads/:id with a random invalid ID -> should return 404
  try {
    const res = await fetch(`${API_URL}/leads/000000000000000000000000`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenUser1}` }
    });
    console.log(`Test 3 (Invalid ID): Status ${res.status}`);
    console.log('Response:', await res.json(), '\n');
  } catch (error) {
    console.error('Test 3 failed:', error.message);
  }

  // Test 4: GET /api/leads without an Authorization header -> should return 401
  try {
    const res = await fetch(`${API_URL}/leads`, {
      method: 'GET'
    });
    console.log(`Test 4 (No Auth Header): Status ${res.status}`);
    console.log('Response:', await res.json(), '\n');
  } catch (error) {
    console.error('Test 4 failed:', error.message);
  }

  // Test 5: Try to access another user's lead by ID -> should return 404 (owner isolation)
  try {
    const res = await fetch(`${API_URL}/leads/${leadId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenUser2}` }
    });
    console.log(`Test 5 (Access Another User's Lead): Status ${res.status}`);
    console.log('Response:', await res.json(), '\n');
  } catch (error) {
    console.error('Test 5 failed:', error.message);
  }
}

runTests();
