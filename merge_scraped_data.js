const fs = require('fs');
const path = require('path');

// 1. Read existing initial Betterware Hogar products
const betterwareProducts = [
  {
    id: "h_001",
    codigo: "HOG-24701",
    nombre: "Organi Closet Max",
    departamento: "hogar",
    marca: "betterware",
    categoria: "Recámara",
    precio_regular: 399.00,
    precio_oferta: 269.00,
    es_oferta: true,
    fotos: ["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=60"],
    descripcion: "Organizador colgante con 6 compartimentos reforzados. Maximiza el espacio de tu clóset. Soporta hasta 8 kg.",
    stock: 25,
    activo: true,
    variantes: []
  },
  {
    id: "h_002",
    codigo: "HOG-23114",
    nombre: "Dispensa Especias 360°",
    departamento: "hogar",
    marca: "betterware",
    categoria: "Cocina",
    precio_regular: 289.00,
    precio_oferta: 199.00,
    es_oferta: true,
    fotos: ["https://images.unsplash.com/photo-1590794056226-77ef3a6c4743?w=500&auto=format&fit=crop&q=60"],
    descripcion: "Especiero giratorio de doble nivel con 8 frascos herméticos incluidos. Ideal para organizar tu despensa.",
    stock: 18,
    activo: true,
    variantes: []
  },
  {
    id: "h_003",
    codigo: "HOG-22890",
    nombre: "Lámpara Sensor Flex",
    departamento: "hogar",
    marca: "betterware",
    categoria: "Iluminación",
    precio_regular: 249.00,
    precio_oferta: 179.00,
    es_oferta: true,
    fotos: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=60"],
    descripcion: "Luz LED recargable USB con sensor de movimiento inteligente. Encendido automático en la oscuridad.",
    stock: 40,
    activo: true,
    variantes: []
  },
  {
    id: "h_004",
    codigo: "HOG-21455",
    nombre: "Eco Filtro Agua Inox",
    departamento: "hogar",
    marca: "betterware",
    categoria: "Cocina",
    precio_regular: 499.00,
    precio_oferta: 349.00,
    es_oferta: true,
    fotos: ["https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&auto=format&fit=crop&q=60"],
    descripcion: "Filtro purificador para grifo de cocina con cartucho de carbón activado y cuerpo de acero inoxidable.",
    stock: 12,
    activo: true,
    variantes: []
  },
  {
    id: "h_005",
    codigo: "HOG-24102",
    nombre: "Escoba Mágica Spray Pro",
    departamento: "hogar",
    marca: "betterware",
    categoria: "Limpieza",
    precio_regular: 359.00,
    precio_oferta: 259.00,
    es_oferta: true,
    fotos: ["https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60"],
    descripcion: "Mopa con dispensador de limpiador y microfibra lavable 360°. Limpia pisos de madera, azulejo y porcelanato.",
    stock: 30,
    activo: true,
    variantes: []
  }
];

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
// Auto-generated with ${allProducts.length} scraped products

const INITIAL_PRODUCTS = ${JSON.stringify(allProducts, null, 2)};

if (typeof window !== "undefined") {
  window.INITIAL_PRODUCTS = INITIAL_PRODUCTS;
}
`;

const jsOutputPath = path.join(__dirname, 'public', 'js', 'products-data.js');
fs.writeFileSync(jsOutputPath, jsContent, 'utf-8');

console.log(`¡Éxito! Se integraron ${allProducts.length} productos en '${jsOutputPath}'.`);
