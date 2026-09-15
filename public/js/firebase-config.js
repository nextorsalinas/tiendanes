// Firebase Configuration & Initialization Module for Tienda Nesty

const firebaseConfig = {
  apiKey: "AIzaSy_MOCK_API_KEY_NESTY_STORE_2026",
  authDomain: "tienda-nesty.firebaseapp.com",
  projectId: "tienda-nesty",
  storageBucket: "tienda-nesty.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Global Store State Manager
class StoreDatabase {
  constructor() {
    this.useMock = true;
    this.initLocalData();
  }

  initLocalData() {
    const initialData = (typeof INITIAL_PRODUCTS !== "undefined") ? INITIAL_PRODUCTS : [];
    
    // Always sync products if new scraped items are present
    const existingData = localStorage.getItem("nesty_products");
    if (!existingData || JSON.parse(existingData).length < initialData.length) {
      localStorage.setItem("nesty_products", JSON.stringify(initialData));
    }
    
    if (!localStorage.getItem("nesty_orders")) {
      localStorage.setItem("nesty_orders", JSON.stringify([]));
    }
  }

  async getProducts() {
    try {
      const data = localStorage.getItem("nesty_products");
      const parsed = JSON.parse(data || "[]");
      const initialData = (typeof INITIAL_PRODUCTS !== "undefined") ? INITIAL_PRODUCTS : [];
      if (parsed.length < initialData.length) {
        localStorage.setItem("nesty_products", JSON.stringify(initialData));
        return initialData;
      }
      return parsed;
    } catch (e) {
      console.error("Error reading products:", e);
      return (typeof INITIAL_PRODUCTS !== "undefined") ? INITIAL_PRODUCTS : [];
    }
  }

  async saveProduct(product) {
    const products = await this.getProducts();
    if (!product.id) {
      product.id = "prod_" + Date.now();
    }
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = { ...products[index], ...product };
    } else {
      products.unshift(product);
    }
    localStorage.setItem("nesty_products", JSON.stringify(products));
    return product;
  }

  async deleteProduct(productId) {
    let products = await this.getProducts();
    products = products.filter(p => p.id !== productId);
    localStorage.setItem("nesty_products", JSON.stringify(products));
    return true;
  }

  async bulkImportProducts(newProducts) {
    let products = await this.getProducts();
    newProducts.forEach(np => {
      if (!np.id) np.id = "prod_" + Math.random().toString(36).substr(2, 9);
      const existingIdx = products.findIndex(p => p.codigo === np.codigo || p.id === np.id);
      if (existingIdx >= 0) {
        products[existingIdx] = { ...products[existingIdx], ...np };
      } else {
        products.unshift(np);
      }
    });
    localStorage.setItem("nesty_products", JSON.stringify(products));
    return products.length;
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
