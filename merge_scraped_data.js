const fs = require('fs');
const path = require('path');

// 1. Read Betterware Hogar catalog
const betterwareJsonPath = path.join(__dirname, 'public', 'betterware_catalog.json');
let betterwareProducts = [];

if (fs.existsSync(betterwareJsonPath)) {
  const raw = fs.readFileSync(betterwareJsonPath, 'utf-8');
  betterwareProducts = JSON.parse(raw);
} else {
  console.warn("No se encontró public/betterware_catalog.json");
}

// 2. Read scraped Belcorp catalog (L'Bel + Ésika + Cyzone)
const belcorpJsonPath = path.join(__dirname, 'public', 'belcorp_catalog.json');
let belcorpProducts = [];

if (fs.existsSync(belcorpJsonPath)) {
  const raw = fs.readFileSync(belcorpJsonPath, 'utf-8');
  belcorpProducts = JSON.parse(raw);
}

// 3. Combine Hogar + Belcorp Products
const allProducts = [...betterwareProducts, ...belcorpProducts];

// 4. Generate public/js/products-data.js
const jsContent = `// Catalog Products Data for Tienda Nesty (Hogar & Belleza: L'Bel + Ésika + Cyzone + Betterware)
// Auto-generated with ${allProducts.length} products (${betterwareProducts.length} Hogar, ${belcorpProducts.length} Belleza)

const INITIAL_PRODUCTS = ${JSON.stringify(allProducts, null, 2)};

if (typeof window !== "undefined") {
  window.INITIAL_PRODUCTS = INITIAL_PRODUCTS;
}
`;

const jsOutputPath = path.join(__dirname, 'public', 'js', 'products-data.js');
fs.writeFileSync(jsOutputPath, jsContent, 'utf-8');

// 5. Generate public/products.json for interoperability & API
const jsonOutputPath = path.join(__dirname, 'public', 'products.json');
fs.writeFileSync(jsonOutputPath, JSON.stringify(allProducts, null, 2), 'utf-8');

console.log(`¡Éxito! Se integraron ${allProducts.length} productos (${betterwareProducts.length} Hogar, ${belcorpProducts.length} Belleza)`);
console.log(`- '${jsOutputPath}'`);
console.log(`- '${jsonOutputPath}'`);
