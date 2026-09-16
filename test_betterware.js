const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function testBetterware() {
  try {
    console.log("Testing Shopify products.json on Betterware Mexico...");
    const res = await fetchUrl("https://betterware.com.mx/products.json?limit=10");
    console.log("Status:", res.status);
    if (res.status === 200) {
      const json = JSON.parse(res.body);
      console.log("Productos encontrados:", json.products ? json.products.length : 0);
      if (json.products && json.products.length > 0) {
        console.log("Ejemplo producto:", json.products[0].title, json.products[0].variants[0].price);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testBetterware();
