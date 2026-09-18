// Firebase Configuration & Initialization Module for nestt. (nestt-trendy)

const firebaseConfig = {
  apiKey: "AIzaSyB2zYb2VYveBQnxPWadmxZ5eNPV-y5c2iA",
  authDomain: "nestt-trendy.firebaseapp.com",
  projectId: "nestt-trendy",
  storageBucket: "nestt-trendy.firebasestorage.app",
  messagingSenderId: "983643238035",
  appId: "1:983643238035:web:34868b0e49bfcceee7a766",
  measurementId: "G-L6JXLH3CSV"
};

// Initialize Firebase & Cloud Firestore
let firestoreDb = null;
if (typeof firebase !== "undefined") {
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firestoreDb = firebase.firestore();
    console.log("[Firebase] Firestore inicializado exitosamente en el proyecto 'nestt-trendy'.");
  } catch (err) {
    console.warn("[Firebase] No se pudo inicializar Firebase SDK:", err);
  }
}

// Global Store State Manager with Firestore & Local Disk Fallback
class StoreDatabase {
  constructor() {
    this.useFirestore = !!firestoreDb;
    this.initLocalData();
  }

  initLocalData() {
    if (!localStorage.getItem("nesty_orders")) {
      localStorage.setItem("nesty_orders", JSON.stringify([]));
    }
  }

  // Retrieve products: Firestore -> Local Server API -> LocalStorage -> INITIAL_PRODUCTS
  async getProducts() {
    // 1. Try Cloud Firestore
    if (firestoreDb) {
      try {
        const snapshot = await firestoreDb.collection("productos").get();
        if (!snapshot.empty) {
          const prods = [];
          snapshot.forEach(doc => prods.push(doc.data()));
          // Sort by name or code
          prods.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
          localStorage.setItem("nesty_products", JSON.stringify(prods));
          return prods;
        } else {
          // If Firestore collection is empty, seed it from local catalog
          console.log("[Firestore] Colección 'productos' vacía. Sembrando catálogo inicial...");
          const seedList = await this.getLocalOrApiProducts();
          if (seedList && seedList.length > 0) {
            this.seedFirestoreBatch(seedList).catch(e => console.warn("[Firestore] Error en sembrado masivo:", e));
            return seedList;
          }
        }
      } catch (err) {
        console.warn("[Firestore] Error al leer productos de Firestore, usando respaldo local:", err);
      }
    }

    // 2. Fallback to Local Server API or LocalStorage
    return await this.getLocalOrApiProducts();
  }

  async getLocalOrApiProducts() {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
          localStorage.setItem("nesty_products", JSON.stringify(data.products));
          return data.products;
        }
      }
    } catch (e) {}

    try {
      const cached = localStorage.getItem("nesty_products");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    const initial = (typeof INITIAL_PRODUCTS !== "undefined") ? INITIAL_PRODUCTS : [];
    localStorage.setItem("nesty_products", JSON.stringify(initial));
    return initial;
  }

  // Seed documents into Firestore in batches
  async seedFirestoreBatch(products) {
    if (!firestoreDb || !products || !products.length) return;
    try {
      const batchSize = 400;
      const batch = firestoreDb.batch();
      const colRef = firestoreDb.collection("productos");

      for (let i = 0; i < Math.min(products.length, batchSize); i++) {
        const p = products[i];
        const docRef = colRef.doc(p.id || ("prod_" + (i + 1)));
        batch.set(docRef, p, { merge: true });
      }
      await batch.commit();
      console.log(`[Firestore] Se sembraron exitosamente ${Math.min(products.length, batchSize)} productos en Firestore.`);
    } catch (err) {
      console.error("[Firestore] Error al sembrar productos:", err);
    }
  }

  // Save/Update a single product in Firestore + Local Server
  async saveProduct(product) {
    if (!product.id) {
      product.id = "prod_" + Date.now();
    }

    // Save to Firestore
    if (firestoreDb) {
      try {
        await firestoreDb.collection("productos").doc(product.id).set(product, { merge: true });
        console.log(`[Firestore] Producto ${product.id} guardado en Firestore.`);
      } catch (err) {
        console.error("[Firestore] Error al guardar en Firestore:", err);
      }
    }

    // Update localStorage cache
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

    // Also persist to server disk if running locally
    await this.saveProductToServer(product);
    return { product, savedToRepo: true };
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
      return null;
    }
  }

  // Delete product from Firestore + Local Server
  async deleteProduct(productId) {
    if (firestoreDb) {
      try {
        await firestoreDb.collection("productos").doc(productId).delete();
        console.log(`[Firestore] Producto ${productId} eliminado de Firestore.`);
      } catch (err) {
        console.error("[Firestore] Error al eliminar de Firestore:", err);
      }
    }

    let products = [];
    try {
      products = JSON.parse(localStorage.getItem("nesty_products") || "[]");
    } catch (e) {}
    products = products.filter(p => p.id !== productId);
    localStorage.setItem("nesty_products", JSON.stringify(products));

    try {
      await fetch('/api/products/' + encodeURIComponent(productId), { method: 'DELETE' });
    } catch (e) {}
    return true;
  }

  // Bulk import
  async bulkImportProducts(newProducts) {
    if (firestoreDb) {
      await this.seedFirestoreBatch(newProducts);
    }

    try {
      await fetch('/api/catalog/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProducts)
      });
    } catch (e) {}

    localStorage.setItem("nesty_products", JSON.stringify(newProducts));
    return newProducts.length;
  }

  // Create Order in Firestore & LocalStorage
  async createOrder(orderData) {
    const newOrder = {
      id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
      fecha: new Date().toISOString(),
      estado: "pendiente_pago",
      ...orderData
    };

    if (firestoreDb) {
      try {
        await firestoreDb.collection("pedidos").doc(newOrder.id).set(newOrder);
        console.log(`[Firestore] Pedido ${newOrder.id} registrado en Firestore.`);
      } catch (err) {
        console.error("[Firestore] Error guardando pedido en Firestore:", err);
      }
    }

    const orders = JSON.parse(localStorage.getItem("nesty_orders") || "[]");
    orders.unshift(newOrder);
    localStorage.setItem("nesty_orders", JSON.stringify(orders));
    return newOrder;
  }

  // Retrieve Orders
  async getOrders() {
    if (firestoreDb) {
      try {
        const snap = await firestoreDb.collection("pedidos").orderBy("fecha", "desc").get();
        if (!snap.empty) {
          const orders = [];
          snap.forEach(doc => orders.push(doc.data()));
          localStorage.setItem("nesty_orders", JSON.stringify(orders));
          return orders;
        }
      } catch (err) {
        console.warn("[Firestore] Error cargando pedidos de Firestore, usando caché:", err);
      }
    }

    return JSON.parse(localStorage.getItem("nesty_orders") || "[]");
  }

  // Update order status
  async updateOrderStatus(orderId, newStatus) {
    if (firestoreDb) {
      try {
        await firestoreDb.collection("pedidos").doc(orderId).update({ estado: newStatus });
      } catch (err) {
        console.error("[Firestore] Error actualizando estado de pedido:", err);
      }
    }

    const orders = await this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.estado = newStatus;
      localStorage.setItem("nesty_orders", JSON.stringify(orders));
    }
    return order;
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
}

window.db = new StoreDatabase();
