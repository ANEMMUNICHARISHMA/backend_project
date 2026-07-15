const API_URL = 'http://localhost:5000/api';
let token = '';

async function testAdvanced() {
  console.log('--- Testing Advanced Features ---\n');

  try {
    // 1. Register/Login
    const res1 = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Advanced Test User', email: `adv_${Date.now()}@test.com`, password: 'password123' })
    });
    const data1 = await res1.json();
    token = data1.token;

    // Create some leads
    const leadData = [
      { name: 'Lead 1', company: 'Comp A', email: 'a@a.com', status: 'New', source: 'Website' },
      { name: 'Lead 2', company: 'Comp B', email: 'b@b.com', status: 'Won', source: 'LinkedIn' },
      { name: 'Ali Smith', company: 'Ali Co', email: 'ali@c.com', status: 'Contacted', source: 'Referral' },
    ];
    for (const l of leadData) {
      await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(l)
      });
    }

    // 2. Test getLeadStats
    const statsRes = await fetch(`${API_URL}/leads/stats/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('--- Lead Stats Summary ---');
    console.log(await statsRes.json());
    console.log();

    // 3. Test getMonthlyStats
    const monthlyRes = await fetch(`${API_URL}/leads/stats/monthly`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('--- Monthly Stats ---');
    const monthlyData = await monthlyRes.json();
    console.log(`Returned ${monthlyData.data.length} months`);
    console.log(monthlyData);
    console.log();

    // 4. Test Search
    const searchRes = await fetch(`${API_URL}/leads/search?q=ali&limit=2`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('--- Search Results for "ali" ---');
    console.log(await searchRes.json());
    console.log();

    // 5. Test Enhanced getLeads
    const getLeadsRes = await fetch(`${API_URL}/leads?status=All&search=Lead&source=Website&page=1&limit=5&sortBy=createdAt&sortOrder=desc`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('--- Enhanced getLeads Results ---');
    console.log(await getLeadsRes.json());

  } catch (err) {
    console.error('Test failed', err);
  }
}

testAdvanced();
