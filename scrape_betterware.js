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

async function scrapeBetterwareCatalog(maxPages = 5) {
  console.log(`--- Scraper Node.js Betterware México (${maxPages} páginas) ---`);
  
  const productsList = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://betterware.com.mx/products.json?limit=50&page=${page}`;
    console.log(`Descargando productos Betterware página ${page}...`);

    try {
      const data = await fetchJson(url);

      if (!data || !data.products || data.products.length === 0) {
        console.log("No se encontraron más productos de Betterware.");
        break;
      }

      for (const p of data.products) {
        const productId = p.id;
        const name = p.title || "";
        const code = (p.variants && p.variants[0] && p.variants[0].sku) ? p.variants[0].sku : `BW-${productId}`;
        const desc = cleanHtml(p.body_html || "");

        let catName = "Hogar";
        if (p.product_type) {
          catName = p.product_type;
        } else if (p.tags && p.tags.length > 0) {
          catName = p.tags[0];
        }

        let precioRegular = 0;
        let precioOferta = 0;
        const fotos = [];
        const variantes = [];

        if (p.variants && p.variants.length > 0) {
          p.variants.forEach(v => {
            if (p.variants.length > 1) {
              variantes.push({
                id: `v_${v.id}`,
                nombre: v.title,
                sku: v.sku || code
              });
            }

            const pVal = parseFloat(v.price || "0");
            const cVal = parseFloat(v.compare_at_price || "0");

            if (precioRegular === 0) {
              if (cVal > pVal) {
                precioRegular = cVal;
                precioOferta = pVal;
              } else {
                precioRegular = pVal;
                precioOferta = null;
              }
            }
          });
        }

        if (p.images && p.images.length > 0) {
          p.images.forEach(img => {
            if (img.src && !fotos.includes(img.src)) {
              fotos.push(img.src);
            }
          });
        }

        const hasOffer = precioOferta && precioOferta > 0 && precioOferta < precioRegular;

        productsList.push({
          id: `bw_${productId}`,
          codigo: code,
          nombre: name,
          departamento: "hogar",
          marca: "betterware",
          categoria: catName,
          precio_regular: parseFloat(precioRegular.toFixed(2)),
          precio_oferta: hasOffer ? parseFloat(precioOferta.toFixed(2)) : null,
          es_oferta: hasOffer,
          fotos: fotos.slice(0, 4),
          descripcion: desc ? desc.substring(0, 250) : "Producto oficial de Betterware México.",
          stock: 25,
          activo: true,
          variantes: variantes
        });
      }

    } catch (err) {
      console.error(`Error procesando página ${page}:`, err.message);
      break;
    }
  }

  const outputPath = path.join(__dirname, 'public', 'betterware_catalog.json');
  fs.writeFileSync(outputPath, JSON.stringify(productsList, null, 2), 'utf-8');
  console.log(`\n¡Éxito Total! Se extrajeron ${productsList.length} productos reales de Betterware en '${outputPath}'`);
  return productsList;
}

scrapeBetterwareCatalog(5);
