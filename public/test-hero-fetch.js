// Test direct fetch like HomePage now does
const API_URL = 'http://localhost:8000/api/v1/public/hero-sections/';

async function testFetch() {
  console.log(`Fetching from ${API_URL}`);
  try {
    const response = await fetch(API_URL);
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Data:', data);
      
      const hero = Array.isArray(data.results) ? data.results[0] : (Array.isArray(data) ? data[0] : null);
      if (hero) {
        console.log('✅ Hero loaded successfully:');
        console.log(`   Title: ${hero.title}`);
        console.log(`   Image: ${hero.image}`);
        console.log(`   Is Active: ${hero.is_active}`);
      } else {
        console.log('❌ No hero in response');
      }
    } else {
      console.log(`❌ Error response: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

testFetch();
