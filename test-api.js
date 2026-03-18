// Test API endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/api/v1/public/hero-sections/',
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        console.log('✅ Valid JSON Response');
        console.log('Count:', json.count);
        if (json.results && json.results[0]) {
          console.log('First hero:', json.results[0].title);
        }
      } catch (e) {
        console.error('❌ Invalid JSON:', e.message);
        console.log('First 500 chars:', data.substring(0, 500));
      }
    } else {
      console.log('Response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();
