const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PRODUCTS_JSON = path.join(PUBLIC_DIR, 'products.json');
const PRODUCTS_DATA_JS = path.join(PUBLIC_DIR, 'js', 'products-data.js');
const BETTERWARE_JSON = path.join(PUBLIC_DIR, 'betterware_catalog.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper to read current catalog
function readCatalog() {
  if (fs.existsSync(PRODUCTS_JSON)) {
    try {
      return JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf-8'));
    } catch (e) {
      console.error('Error parsing products.json:', e);
    }
  }
  if (fs.existsSync(BETTERWARE_JSON)) {
    try {
      return JSON.parse(fs.readFileSync(BETTERWARE_JSON, 'utf-8'));
    } catch (e) {
      console.error('Error parsing betterware_catalog.json:', e);
    }
  }
  return [];
}

// Helper to write catalog to disk in multiple formats
function writeCatalog(products) {
  // 1. Write products.json
  fs.writeFileSync(PRODUCTS_JSON, JSON.stringify(products, null, 2), 'utf-8');

  // 2. Write products-data.js
  const jsContent = `// Catalog Products Data for Tienda Nesty (Hogar & Belleza: L'Bel + Ésika + Cyzone + Betterware)
// Auto-generated with ${products.length} products

const INITIAL_PRODUCTS = ${JSON.stringify(products, null, 2)};

if (typeof window !== "undefined") {
  window.INITIAL_PRODUCTS = INITIAL_PRODUCTS;
}
`;
  fs.writeFileSync(PRODUCTS_DATA_JS, jsContent, 'utf-8');

  // 3. Keep betterware_catalog.json updated with Hogar products
  const hogarProducts = products.filter(p => {
    const dept = (p.departamento || '').toLowerCase();
    const brand = (p.marca || '').toLowerCase();
    return dept === 'hogar' || brand === 'betterware';
  });
  if (hogarProducts.length > 0) {
    fs.writeFileSync(BETTERWARE_JSON, JSON.stringify(hogarProducts, null, 2), 'utf-8');
  }

  console.log(`[Storage] Catálogo guardado en disco: ${products.length} productos totales (${hogarProducts.length} Hogar).`);
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50 MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Helper for JSON response with CORS
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // API ROUTE: GET /api/products
  if (req.method === 'GET' && pathname === '/api/products') {
    const catalog = readCatalog();
    sendJson(res, 200, { success: true, count: catalog.length, products: catalog });
    return;
  }

  // API ROUTE: POST /api/products (Save or Update single product)
  if (req.method === 'POST' && pathname === '/api/products') {
    try {
      const product = await parseBody(req);
      if (!product || !product.nombre) {
        sendJson(res, 400, { success: false, error: 'El producto debe tener al menos un nombre.' });
        return;
      }

      if (!product.id) {
        product.id = 'prod_' + Date.now();
      }

      const catalog = readCatalog();
      const existingIdx = catalog.findIndex(p => p.id === product.id || (product.codigo && p.codigo === product.codigo));

      if (existingIdx >= 0) {
        catalog[existingIdx] = { ...catalog[existingIdx], ...product };
      } else {
        catalog.unshift(product);
      }

      writeCatalog(catalog);
      sendJson(res, 200, { success: true, product, total: catalog.length });
    } catch (err) {
      console.error('Error saving product:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // API ROUTE: DELETE /api/products/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/products/')) {
    try {
      const productId = decodeURIComponent(pathname.replace('/api/products/', ''));
      let catalog = readCatalog();
      const initialLength = catalog.length;
      catalog = catalog.filter(p => p.id !== productId);

      writeCatalog(catalog);
      sendJson(res, 200, { 
        success: true, 
        deletedId: productId, 
        removed: initialLength !== catalog.length,
        total: catalog.length 
      });
    } catch (err) {
      console.error('Error deleting product:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // API ROUTE: POST /api/catalog/bulk or /api/save-catalog (Bulk import / update full catalog)
  if (req.method === 'POST' && (pathname === '/api/catalog/bulk' || pathname === '/api/save-catalog')) {
    try {
      const body = await parseBody(req);
      const incomingProducts = Array.isArray(body) ? body : body.products;

      if (!Array.isArray(incomingProducts)) {
        sendJson(res, 400, { success: false, error: 'Se esperaba un arreglo de productos.' });
        return;
      }

      const catalog = readCatalog();
      incomingProducts.forEach(np => {
        if (!np.id) np.id = 'prod_' + Math.random().toString(36).substr(2, 9);
        const idx = catalog.findIndex(p => p.id === np.id || (np.codigo && p.codigo === np.codigo));
        if (idx >= 0) {
          catalog[idx] = { ...catalog[idx], ...np };
        } else {
          catalog.unshift(np);
        }
      });

      writeCatalog(catalog);
      sendJson(res, 200, { success: true, total: catalog.length });
    } catch (err) {
      console.error('Error in bulk import:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // API ROUTE: GET /api/git/status
  if (req.method === 'GET' && pathname === '/api/git/status') {
    try {
      const statusOutput = execSync('git status --short', { cwd: __dirname, encoding: 'utf-8' });
      sendJson(res, 200, { success: true, clean: statusOutput.trim().length === 0, changes: statusOutput });
    } catch (err) {
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // API ROUTE: POST /api/git/sync (Commit & Push to Repository)
  if (req.method === 'POST' && pathname === '/api/git/sync') {
    try {
      const body = await parseBody(req).catch(() => ({}));
      const commitMsg = body.message || 'Actualización de productos y catálogo desde panel local';

      execSync('git add .', { cwd: __dirname, encoding: 'utf-8' });
      
      let commitResult = '';
      try {
        commitResult = execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: __dirname, encoding: 'utf-8' });
      } catch (commitErr) {
        commitResult = 'No había cambios nuevos pendientes por commitear.';
      }

      let pushResult = '';
      let pushed = false;
      try {
        pushResult = execSync('git push origin main', { 
          cwd: __dirname, 
          encoding: 'utf-8', 
          timeout: 8000,
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
        });
        pushed = true;
      } catch (pushErr) {
        pushResult = 'Cambios confirmados en el repositorio local (Git commit listo).';
      }

      sendJson(res, 200, { 
        success: true, 
        message: 'Repositorio sincronizado correctamente', 
        commit: commitResult,
        push: pushResult,
        pushed
      });
    } catch (err) {
      console.error('Error syncing git:', err);
      sendJson(res, 500, { success: false, error: err.message });
    }
    return;
  }

  // Static File Serving
  let reqPath = pathname;
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(PUBLIC_DIR, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Tienda Nesty servidor corriendo en http://localhost:${PORT}`);
});
