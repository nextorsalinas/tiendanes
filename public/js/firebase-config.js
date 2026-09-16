// Firebase Configuration & Initialization Module for Tienda Nesty

const firebaseConfig = {
  apiKey: "AIzaSy_MOCK_API_KEY_NESTY_STORE_2026",
  authDomain: "tienda-nesty.firebaseapp.com",
  projectId: "tienda-nesty",
  storageBucket: "tienda-nesty.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Global Store State Manager with Disk & Git Repository Sync
class StoreDatabase {
  constructor() {
    this.useMock = true;
    this.apiAvailable = true;
    this.initLocalData();
  }

  initLocalData() {
    if (!localStorage.getItem("nesty_orders")) {
      localStorage.setItem("nesty_orders", JSON.stringify([]));
    }
  }

  async getProducts() {
    try {
      // 1. Try to fetch from server API (live repository files)
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.products)) {
          // Check if localStorage has extra items created offline
          let local = [];
          try {
            local = JSON.parse(localStorage.getItem("nesty_products") || "[]");
          } catch (e) {}

          // If local has extra products not in server, sync them up
          const serverIds = new Set(data.products.map(p => p.id));
          const extraLocal = local.filter(p => !serverIds.has(p.id));
          if (extraLocal.length > 0) {
            console.log(`Sincronizando ${extraLocal.length} productos locales al servidor...`);
            for (const ep of extraLocal) {
              await this.saveProductToServer(ep);
            }
            const refreshed = await fetch('/api/products', { cache: 'no-store' });
            if (refreshed.ok) {
              const rData = await refreshed.json();
              localStorage.setItem("nesty_products", JSON.stringify(rData.products));
              return rData.products;
            }
          }

          localStorage.setItem("nesty_products", JSON.stringify(data.products));
          return data.products;
        }
      }
    } catch (e) {
      console.warn("Servidor API no disponible, usando almacenamiento local:", e);
    }

    // 2. Fallback to localStorage or INITIAL_PRODUCTS
    try {
      const data = localStorage.getItem("nesty_products");
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {}

    const initialData = (typeof INITIAL_PRODUCTS !== "undefined") ? INITIAL_PRODUCTS : [];
    localStorage.setItem("nesty_products", JSON.stringify(initialData));
    return initialData;
  }

  async saveProductToServer(product) {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      return await res.json();
    } catch (e) {
      console.error("Error al persistir en servidor:", e);
      return null;
    }
  }

  async saveProduct(product) {
    if (!product.id) {
      product.id = "prod_" + Date.now();
    }

    // Update in local cache
    let products = [];
    try {
      products = JSON.parse(localStorage.getItem("nesty_products") || "[]");
    } catch (e) {}
    
    const index = products.findIndex(p => p.id === product.id || (product.codigo && p.codigo === product.codigo));
    if (index >= 0) {
      products[index] = { ...products[index], ...product };
    } else {
      products.unshift(product);
    }
    localStorage.setItem("nesty_products", JSON.stringify(products));

    // Persist directly to repository on disk
    const apiResult = await this.saveProductToServer(product);
    return { product, savedToRepo: !!(apiResult && apiResult.success) };
  }

  async deleteProduct(productId) {
    let products = [];
    try {
      products = JSON.parse(localStorage.getItem("nesty_products") || "[]");
    } catch (e) {}
    products = products.filter(p => p.id !== productId);
    localStorage.setItem("nesty_products", JSON.stringify(products));

    // Delete on server repository
    try {
      await fetch('/api/products/' + encodeURIComponent(productId), { method: 'DELETE' });
    } catch (e) {
      console.error("Error al eliminar en servidor:", e);
    }
    return true;
  }

  async bulkImportProducts(newProducts) {
    // Persist to server
    try {
      const res = await fetch('/api/catalog/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProducts)
      });
      const data = await res.json();
      if (data && data.success) {
        localStorage.setItem("nesty_products", JSON.stringify(newProducts));
        return data.total;
      }
    } catch (e) {
      console.error("Error al importar en servidor:", e);
    }

    // Fallback local
    localStorage.setItem("nesty_products", JSON.stringify(newProducts));
    return newProducts.length;
  }

  async syncWithGit(message) {
    try {
      const res = await fetch('/api/git/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getGitStatus() {
    try {
      const res = await fetch('/api/git/status');
      return await res.json();
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async createOrder(orderData) {
    const orders = JSON.parse(localStorage.getItem("nesty_orders") || "[]");
    const newOrder = {
      id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
      fecha: new Date().toISOString(),
      estado: "pendiente_pago",
      ...orderData
    };
    orders.unshift(newOrder);
    localStorage.setItem("nesty_orders", JSON.stringify(orders));
    return newOrder;
  }

  async getOrders() {
    return JSON.parse(localStorage.getItem("nesty_orders") || "[]");
  }

  async updateOrderStatus(orderId, newStatus) {
    const orders = await this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.estado = newStatus;
      localStorage.setItem("nesty_orders", JSON.stringify(orders));
    }
    return order;
  }
}

window.db = new StoreDatabase();
