const https = require('https');
const fs = require('fs');
const path = require('path');

function cleanHtml(text) {
  if (!text) return "";
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

async function scrapeBelcorpBrand(brandName, baseUrl, maxProducts = 50) {
  console.log(`\n=== Descargando Catálogo ${brandName.toUpperCase()} Belcorp México ===`);
  
  const productsList = [];
  const pageSize = 49;
  let currentFrom = 0;

  while (productsList.length < maxProducts) {
    const currentTo = currentFrom + pageSize;
    const url = `${baseUrl}/api/catalog_system/pub/products/search?_from=${currentFrom}&_to=${currentTo}`;
    console.log(`[${brandName.toUpperCase()}] Lote [${currentFrom} - ${currentTo}]...`);

    try {
      const data = await fetchJson(url);

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[${brandName.toUpperCase()}] No se encontraron más productos.`);
        break;
      }

      for (const p of data) {
        const productId = p.productId;
        const name = p.productName || "";
        const code = p.productReference || `${brandName.substring(0, 3).toUpperCase()}-${productId}`;
        const desc = cleanHtml(p.description || "");

        // Categories
        let catName = "Belleza";
        if (p.categories && p.categories.length > 0) {
          const parts = p.categories[0].replace(/^\/|\/$/g, '').split('/');
          catName = parts[parts.length - 1] ? parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1) : "Belleza";
        }

        let precioRegular = 0;
        let precioOferta = 0;
        const fotos = [];
        const variantes = [];

        if (p.items && p.items.length > 0) {
          p.items.forEach(item => {
            if (p.items.length > 1) {
              variantes.push({
                id: `v_${item.itemId}`,
                nombre: item.name,
                sku: code
              });
            }

            if (item.images) {
              item.images.forEach(img => {
                if (img.imageUrl && !fotos.includes(img.imageUrl)) {
                  fotos.push(img.imageUrl);
                }
              });
            }

            if (item.sellers && item.sellers[0] && item.sellers[0].commertialOffer) {
              const offer = item.sellers[0].commertialOffer;
              if (precioRegular === 0) {
                precioRegular = offer.ListPrice || 0;
                precioOferta = offer.Price || 0;
              }
            }
          });
        }

        if (precioRegular === 0) precioRegular = precioOferta;
        const hasOffer = precioOferta > 0 && precioOferta < precioRegular;

        productsList.push({
          id: `${brandName.substring(0, 2)}_${productId}`,
          codigo: code,
          nombre: name,
          departamento: "belleza",
          marca: brandName,
          categoria: catName,
          precio_regular: parseFloat(precioRegular.toFixed(2)),
          precio_oferta: hasOffer ? parseFloat(precioOferta.toFixed(2)) : null,
          es_oferta: hasOffer,
          fotos: fotos.slice(0, 4),
          descripcion: desc ? desc.substring(0, 250) : `Producto original de ${brandName.toUpperCase()} Belcorp.`,
          stock: 20,
          activo: true,
          variantes: variantes
        });
      }

      currentFrom += pageSize + 1;
    } catch (err) {
      console.error(`[${brandName.toUpperCase()}] Error procesando lote [${currentFrom}]:`, err.message);
      break;
    }
  }

  return productsList;
}

async function run() {
  const esikaProducts = await scrapeBelcorpBrand('esika', 'https://esika.tiendabelcorp.com.mx', 50);
  const cyzoneProducts = await scrapeBelcorpBrand('cyzone', 'https://cyzone.tiendabelcorp.com.mx', 50);
  const lbelProducts = await scrapeBelcorpBrand('lbel', 'https://lbel.tiendabelcorp.com.mx', 50);

  const combined = [...esikaProducts, ...cyzoneProducts, ...lbelProducts];

  // Save JSON
  const outputPath = path.join(__dirname, 'public', 'belcorp_catalog.json');
  fs.writeFileSync(outputPath, JSON.stringify(combined, null, 2), 'utf-8');
  console.log(`\n¡Éxito Total! Se guardaron ${combined.length} productos (L'Bel + Ésika + Cyzone) en '${outputPath}'`);
}

run();
