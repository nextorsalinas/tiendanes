const fs = require('fs');
const path = require('path');

// Read Betterware catalog JSON
const bwJsonPath = path.join(__dirname, 'public', 'betterware_catalog.json');
let betterwareProducts = [];
if (fs.existsSync(bwJsonPath)) {
  betterwareProducts = JSON.parse(fs.readFileSync(bwJsonPath, 'utf-8'));
}

// Read Belcorp catalog JSON
const belcorpJsonPath = path.join(__dirname, 'public', 'belcorp_catalog.json');
let belcorpProducts = [];
if (fs.existsSync(belcorpJsonPath)) {
  belcorpProducts = JSON.parse(fs.readFileSync(belcorpJsonPath, 'utf-8'));
}

// Combine all products
const allProducts = [...betterwareProducts, ...belcorpProducts];

// Generate public/js/products-data.js
const jsContent = `// Catalog Products Data for Tienda Nesty (Betterware Hogar + Belcorp Belleza)
// Auto-generated with ${allProducts.length} real products

const INITIAL_PRODUCTS = ${JSON.stringify(allProducts, null, 2)};

if (typeof window !== "undefined") {
  window.INITIAL_PRODUCTS = INITIAL_PRODUCTS;
}
`;

const jsOutputPath = path.join(__dirname, 'public', 'js', 'products-data.js');
fs.writeFileSync(jsOutputPath, jsContent, 'utf-8');

console.log(`¡Éxito Total! Se integraron ${allProducts.length} productos reales (Betterware + Belcorp) en '${jsOutputPath}'.`);
