// Executive Admin Panel Logic for nestt. (CoreUI KPIs & Operations)
document.addEventListener("DOMContentLoaded", async () => {
  let ordersList = [];
  let productsList = [];
  let filterText = "";
  let filterBrand = "all";
  let filterDept = "all";
  let filterCategory = "all";
  let filterStock = "all";
  let filterSort = "name_asc";

  // 1. Tab switcher (Pedidos & Catálogo)
  const navTabs = document.querySelectorAll(".admin-nav-link");
  navTabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      navTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetSection = tab.getAttribute("data-target");
      document.querySelectorAll(".admin-section").forEach(sec => sec.classList.add("d-none"));
      const activeSec = document.getElementById(targetSection);
      if (activeSec) activeSec.classList.remove("d-none");
    });
  });

  // 2. Load Data from Cloud Firestore & Local Cache
  async function loadAdminData() {
    try {
      ordersList = await window.db.getOrders();
      productsList = await window.db.getProducts();

      populateCategoryFilter();
      renderDashboardMetrics();
      renderBrandInsights();
      renderOrdersTable();
      renderProductsTable();
    } catch (err) {
      console.error("Error al cargar datos del panel admin:", err);
    }
  }

  // Helper to format brand names
  function formatBrandName(marca) {
    if (!marca) return "Betterware";
    const clean = marca.toLowerCase().trim();
    const map = {
      "betterware": "Betterware",
      "esika": "Ésika",
      "cyzone": "Cyzone",
      "lbel": "L'Bel"
    };
    return map[clean] || (clean.charAt(0).toUpperCase() + clean.slice(1));
  }

  // 3. Render Executive Dashboard Metrics (KPIs)
  function renderDashboardMetrics() {
    const totalOrders = ordersList.length;
    const pendingOrders = ordersList.filter(o => o.estado === "pendiente_pago").length;
    const totalRevenue = ordersList.reduce((sum, o) => sum + (o.total || 0), 0);
    const activeProducts = productsList.filter(p => p.activo !== false);
    const totalProducts = activeProducts.length;

    // Calcular cantidad y valor total de inventario a precio de venta
    let totalPieces = 0;
    const totalCatalogSaleValue = activeProducts.reduce((sum, p) => {
      const salePrice = (p.precio_oferta && Number(p.precio_oferta) < Number(p.precio_regular))
        ? Number(p.precio_oferta)
        : Number(p.precio_regular || 0);
      const stock = (typeof p.stock === "number" && p.stock >= 0) ? p.stock : 1;
      totalPieces += stock;
      return sum + (salePrice * stock);
    }, 0);

    const avgPricePerPiece = totalPieces > 0 ? (totalCatalogSaleValue / totalPieces) : 0;

    const elTotalOrders = document.getElementById("metric-total-orders");
    const elPendingOrders = document.getElementById("metric-pending-orders");
    const elRevenue = document.getElementById("metric-revenue");
    const elTotalProducts = document.getElementById("metric-total-products");
    const elCatalogSaleValue = document.getElementById("metric-catalog-sale-value");
    const elCatalogPieces = document.getElementById("metric-catalog-pieces");
    const elProductsBreakdown = document.getElementById("metric-products-breakdown");
    const elOrdersBadge = document.getElementById("orders-count-badge");

    if (elTotalOrders) elTotalOrders.textContent = totalOrders;
    if (elPendingOrders) elPendingOrders.textContent = pendingOrders;
    if (elRevenue) elRevenue.textContent = `$${totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

    if (elTotalProducts) elTotalProducts.textContent = totalProducts;
    if (elProductsBreakdown) {
      const hogarCount = activeProducts.filter(p => (p.departamento || '').toLowerCase() === 'hogar' || (p.marca || '').toLowerCase() === 'betterware').length;
      const bellezaCount = totalProducts - hogarCount;
      elProductsBreakdown.innerHTML = `<span class="badge bg-primary-subtle text-primary border border-primary me-1">${hogarCount} Hogar</span> <span class="badge bg-danger-subtle text-danger border border-danger">${bellezaCount} Belleza</span>`;
    }

    if (elCatalogSaleValue) {
      elCatalogSaleValue.textContent = `$${totalCatalogSaleValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
    }
    if (elCatalogPieces) {
      elCatalogPieces.textContent = `${totalPieces} piezas (Promedio $${avgPricePerPiece.toFixed(2)} c/u)`;
    }

    if (elOrdersBadge) {
      elOrdersBadge.textContent = `${totalOrders} pedido${totalOrders === 1 ? '' : 's'}`;
    }

    const elCatalogBadge = document.getElementById("catalog-total-badge");
    if (elCatalogBadge) {
      elCatalogBadge.textContent = `${totalProducts} SKUs`;
    }
  }

  // 4. Render Brand Breakdown Insights (Betterware, Ésika, Cyzone, L'Bel)
  function renderBrandInsights() {
    const grid = document.getElementById("brand-insights-grid");
    if (!grid) return;

    const brandConfig = [
      { id: "betterware", label: "Betterware", color: "#0071ce", icon: "bi-house-heart-fill", dept: "Hogar" },
      { id: "esika", label: "Ésika", color: "#e31c2d", icon: "bi-gem", dept: "Belleza" },
      { id: "cyzone", label: "Cyzone", color: "#e6007e", icon: "bi-stars", dept: "Belleza" },
      { id: "lbel", label: "L'Bel", color: "#111111", icon: "bi-award-fill", dept: "Alta Belleza" }
    ];

    const activeProducts = productsList.filter(p => p.activo !== false);

    grid.innerHTML = brandConfig.map(b => {
      const prodsOfBrand = activeProducts.filter(p => (p.marca || 'betterware').toLowerCase() === b.id);
      let brandStock = 0;
      let brandSaleVal = 0;

      prodsOfBrand.forEach(p => {
        const sale = (p.precio_oferta && Number(p.precio_oferta) < Number(p.precio_regular))
          ? Number(p.precio_oferta)
          : Number(p.precio_regular || 0);
        const stock = (typeof p.stock === 'number' && p.stock >= 0) ? p.stock : 1;
        brandStock += stock;
        brandSaleVal += (sale * stock);
      });

      return `
        <div class="col-6 col-md-3">
          <div class="p-3 bg-white rounded-3 border h-100 shadow-sm brand-kpi-card" 
               style="border-top: 3px solid ${b.color} !important; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;"
               onclick="window.filterByBrandShortcut('${b.id}')"
               title="Clic para ver y filtrar productos de ${b.label}">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="fw-bold small" style="color: ${b.color};"><i class="bi ${b.icon} me-1"></i> ${b.label}</span>
              <span class="badge bg-light text-muted border" style="font-size:0.7rem;">${prodsOfBrand.length} SKUs</span>
            </div>
            <h5 class="fw-extrabold text-dark mb-1">$${brandSaleVal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h5>
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted" style="font-size: 0.78rem;">${brandStock} piezas</small>
              <small class="text-primary fw-bold" style="font-size: 0.72rem;">Filtrar <i class="bi bi-chevron-right"></i></small>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 4.1 Populate dynamic categories select filter
  function populateCategoryFilter() {
    const catSelect = document.getElementById("admin-filter-category");
    if (!catSelect) return;

    const categories = new Set();
    productsList.forEach(p => {
      if (p.categoria && p.categoria.trim() !== "") {
        categories.add(p.categoria.trim());
      }
    });

    const sortedCats = Array.from(categories).sort((a, b) => a.localeCompare(b, 'es'));
    const currentVal = catSelect.value || "all";

    catSelect.innerHTML = `<option value="all">Todas las categorías</option>` +
      sortedCats.map(c => `<option value="${c}">${c}</option>`).join("");

    if (sortedCats.includes(currentVal)) {
      catSelect.value = currentVal;
    } else {
      catSelect.value = "all";
      filterCategory = "all";
    }
  }

  // 5. Render Orders Table
  function renderOrdersTable() {
    const tableBody = document.getElementById("admin-orders-tbody");
    if (!tableBody) return;

    if (ordersList.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se han registrado pedidos aún.</td></tr>`;
      return;
    }

    tableBody.innerHTML = ordersList.map(order => {
      const fechaFormatted = new Date(order.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
      const statusClass = `status-${order.estado}`;
      const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
      const itemTitle = firstItem ? `${firstItem.nombre} (x${firstItem.cantidad})` : 'Sin ítem';

      return `
        <tr>
          <td><strong class="text-dark">${order.id}</strong></td>
          <td><small class="text-muted">${fechaFormatted}</small></td>
          <td>
            <strong>${order.cliente ? order.cliente.nombre : 'Cliente'}</strong><br>
            <small class="text-muted"><i class="bi bi-whatsapp"></i> ${order.cliente ? order.cliente.telefono : 'N/A'}</small>
          </td>
          <td>
            <small class="fw-bold text-dark">${itemTitle}</small><br>
            <small class="text-muted">${order.cliente ? order.cliente.direccion : ''}</small>
          </td>
          <td class="fw-bold text-success">$${order.total ? order.total.toFixed(2) : '0.00'}</td>
          <td><span class="status-badge ${statusClass}">${(order.estado || 'pendiente').replace('_', ' ').toUpperCase()}</span></td>
          <td>
            <select class="form-select form-select-sm status-change-select rounded-pill" data-order-id="${order.id}">
              <option value="pendiente_pago" ${order.estado === 'pendiente_pago' ? 'selected' : ''}>Pendiente Pago</option>
              <option value="confirmado" ${order.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
              <option value="en_camino" ${order.estado === 'en_camino' ? 'selected' : ''}>En Camino</option>
              <option value="entregado" ${order.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
              <option value="cancelado" ${order.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");

    tableBody.querySelectorAll(".status-change-select").forEach(select => {
      select.addEventListener("change", async (e) => {
        const orderId = e.target.getAttribute("data-order-id");
        const newStatus = e.target.value;
        await window.db.updateOrderStatus(orderId, newStatus);
        await loadAdminData();
      });
    });
  }

  // 6. Render Products Table with Search, Multi-Filter, Stock & Sorting
  function renderProductsTable() {
    const tableBody = document.getElementById("admin-products-tbody");
    if (!tableBody) return;

    let filtered = [...productsList];

    // Filter by Brand
    if (filterBrand !== "all") {
      filtered = filtered.filter(p => (p.marca || 'betterware').toLowerCase() === filterBrand.toLowerCase());
    }

    // Filter by Department
    if (filterDept !== "all") {
      filtered = filtered.filter(p => {
        const brand = (p.marca || 'betterware').toLowerCase();
        const dept = (p.departamento || (brand === 'betterware' ? 'hogar' : 'belleza')).toLowerCase();
        return dept === filterDept.toLowerCase();
      });
    }

    // Filter by Category
    if (filterCategory !== "all") {
      filtered = filtered.filter(p => (p.categoria || '').toLowerCase() === filterCategory.toLowerCase());
    }

    // Filter by Stock Status
    if (filterStock === "in_stock") {
      filtered = filtered.filter(p => (typeof p.stock === 'number' ? p.stock : 1) > 0);
    } else if (filterStock === "out_of_stock") {
      filtered = filtered.filter(p => (typeof p.stock === 'number' ? p.stock : 1) === 0);
    }

    // Filter by Search Query
    if (filterText.trim() !== "") {
      const q = filterText.toLowerCase();
      filtered = filtered.filter(p => 
        (p.nombre && p.nombre.toLowerCase().includes(q)) || 
        (p.codigo && p.codigo.toLowerCase().includes(q)) || 
        (p.categoria && p.categoria.toLowerCase().includes(q)) ||
        (p.marca && p.marca.toLowerCase().includes(q))
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      const saleA = (a.precio_oferta && Number(a.precio_oferta) < Number(a.precio_regular)) ? Number(a.precio_oferta) : Number(a.precio_regular || 0);
      const saleB = (b.precio_oferta && Number(b.precio_oferta) < Number(b.precio_regular)) ? Number(b.precio_oferta) : Number(b.precio_regular || 0);
      const stockA = (typeof a.stock === 'number' && a.stock >= 0) ? a.stock : 1;
      const stockB = (typeof b.stock === 'number' && b.stock >= 0) ? b.stock : 1;
      const nameA = (a.nombre || '').toLowerCase();
      const nameB = (b.nombre || '').toLowerCase();
      const codeA = (a.codigo || '').toLowerCase();
      const codeB = (b.codigo || '').toLowerCase();

      switch (filterSort) {
        case "name_desc":
          return nameB.localeCompare(nameA, 'es');
        case "price_asc":
          return saleA - saleB;
        case "price_desc":
          return saleB - saleA;
        case "stock_asc":
          return stockA - stockB;
        case "stock_desc":
          return stockB - stockA;
        case "code_asc":
          return codeA.localeCompare(codeB, 'es');
        case "name_asc":
        default:
          return nameA.localeCompare(nameB, 'es');
      }
    });

    // Update count indicator
    const countEl = document.getElementById("catalog-filter-count");
    if (countEl) {
      countEl.innerHTML = `Mostrando <strong class="text-dark">${filtered.length}</strong> de <strong class="text-dark">${productsList.length}</strong> productos`;
    }

    // Update active filters badge indicator
    updateActiveFilterBadges();

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5">
            <div class="text-muted mb-2"><i class="bi bi-funnel fs-1 text-secondary opacity-50"></i></div>
            <h6 class="fw-bold text-dark mb-1">No se encontraron productos coincidentes</h6>
            <p class="text-muted small mb-3">Intenta cambiar o limpiar los filtros seleccionados.</p>
            <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="window.resetCatalogFilters()">
              <i class="bi bi-arrow-counterclockwise me-1"></i> Restablecer Filtros
            </button>
          </td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(p => {
      const brand = (p.marca || 'betterware').toLowerCase();
      let brandBadge = '<span class="badge bg-secondary">Betterware</span>';
      if (brand === 'betterware') {
        brandBadge = '<span class="badge bg-primary">Betterware</span>';
      } else if (brand === 'esika') {
        brandBadge = '<span class="badge bg-danger">Ésika</span>';
      } else if (brand === 'cyzone') {
        brandBadge = '<span class="badge bg-info text-dark">Cyzone</span>';
      } else if (brand === 'lbel') {
        brandBadge = '<span class="badge bg-dark">L\'Bel</span>';
      }

      const dept = (p.departamento || (brand === 'betterware' ? 'hogar' : 'belleza')).toUpperCase();
      const deptBadge = dept === 'HOGAR' ? '<span class="badge bg-light text-primary border">Hogar</span>' : '<span class="badge bg-light text-danger border">Belleza</span>';
      const mainImg = (p.fotos && p.fotos.length > 0) ? p.fotos[0] : "https://via.placeholder.com/400?text=Sin+Imagen";

      const stock = (typeof p.stock === 'number' && p.stock >= 0) ? p.stock : 1;
      const stockBadge = stock > 0 
        ? `<span class="badge bg-success-subtle text-success border border-success fw-bold px-2 py-1" style="font-size: 0.82rem;">${stock} pz${stock > 1 ? 's' : ''}</span>`
        : `<span class="badge bg-danger-subtle text-danger border border-danger fw-bold px-2 py-1" style="font-size: 0.82rem;">Agotado (0)</span>`;

      return `
        <tr>
          <td><img src="${mainImg}" style="width: 40px; height: 40px; object-fit: contain;" class="rounded bg-light p-1"></td>
          <td><code>${p.codigo || 'N/A'}</code></td>
          <td><strong class="text-dark">${p.nombre}</strong></td>
          <td>${brandBadge}</td>
          <td>${deptBadge}</td>
          <td><small class="text-muted">${p.categoria || 'General'}</small></td>
          <td>
            <strong class="text-dark">$${(p.precio_oferta || p.precio_regular || 0).toFixed(2)}</strong>
            ${p.precio_oferta ? `<br><small class="text-decoration-line-through text-muted">$${p.precio_regular.toFixed(2)}</small>` : ''}
          </td>
          <td class="text-center">
            ${stockBadge}
          </td>
          <td>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="window.editProduct('${p.id}')" title="Editar Producto">
                <i class="bi bi-pencil-square"></i>
              </button>
              <button class="btn btn-outline-danger" onclick="window.deleteProduct('${p.id}')" title="Eliminar Producto">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // 6.1 Update Active Filter Badges
  function updateActiveFilterBadges() {
    const container = document.getElementById("catalog-active-filter-tags");
    if (!container) return;

    const tags = [];
    if (filterBrand !== "all") {
      const brandLabels = { "betterware": "Betterware", "esika": "Ésika", "cyzone": "Cyzone", "lbel": "L'Bel" };
      tags.push(`<span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill py-1 px-2" style="font-size: 0.74rem; cursor: pointer;" onclick="window.clearSingleFilter('brand')">Marca: ${brandLabels[filterBrand] || filterBrand} <i class="bi bi-x-circle ms-1"></i></span>`);
    }
    if (filterDept !== "all") {
      tags.push(`<span class="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle rounded-pill py-1 px-2" style="font-size: 0.74rem; cursor: pointer;" onclick="window.clearSingleFilter('dept')">Depto: ${filterDept.toUpperCase()} <i class="bi bi-x-circle ms-1"></i></span>`);
    }
    if (filterCategory !== "all") {
      tags.push(`<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill py-1 px-2" style="font-size: 0.74rem; cursor: pointer;" onclick="window.clearSingleFilter('category')">Cat: ${filterCategory} <i class="bi bi-x-circle ms-1"></i></span>`);
    }
    if (filterStock !== "all") {
      const stockLabel = filterStock === "in_stock" ? "En Stock (>0)" : "Agotados (0)";
      tags.push(`<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill py-1 px-2" style="font-size: 0.74rem; cursor: pointer;" onclick="window.clearSingleFilter('stock')">${stockLabel} <i class="bi bi-x-circle ms-1"></i></span>`);
    }
    if (filterText.trim() !== "") {
      tags.push(`<span class="badge bg-dark-subtle text-dark border rounded-pill py-1 px-2" style="font-size: 0.74rem; cursor: pointer;" onclick="window.clearSingleFilter('text')">"${filterText.trim()}" <i class="bi bi-x-circle ms-1"></i></span>`);
    }

    container.innerHTML = tags.join("");
  }

  // 6.2 Clear single filter handler
  window.clearSingleFilter = (type) => {
    if (type === 'brand') {
      filterBrand = 'all';
      const el = document.getElementById("admin-filter-brand");
      if (el) el.value = 'all';
    } else if (type === 'dept') {
      filterDept = 'all';
      const el = document.getElementById("admin-filter-dept");
      if (el) el.value = 'all';
    } else if (type === 'category') {
      filterCategory = 'all';
      const el = document.getElementById("admin-filter-category");
      if (el) el.value = 'all';
    } else if (type === 'stock') {
      filterStock = 'all';
      const el = document.getElementById("admin-filter-stock");
      if (el) el.value = 'all';
    } else if (type === 'text') {
      filterText = '';
      const el = document.getElementById("admin-search-product");
      if (el) el.value = '';
    }
    renderProductsTable();
  };

  // 6.3 Reset all catalog filters
  window.resetCatalogFilters = () => {
    filterText = "";
    filterBrand = "all";
    filterDept = "all";
    filterCategory = "all";
    filterStock = "all";
    filterSort = "name_asc";

    const sInput = document.getElementById("admin-search-product");
    if (sInput) sInput.value = "";
    const bSelect = document.getElementById("admin-filter-brand");
    if (bSelect) bSelect.value = "all";
    const dSelect = document.getElementById("admin-filter-dept");
    if (dSelect) dSelect.value = "all";
    const cSelect = document.getElementById("admin-filter-category");
    if (cSelect) cSelect.value = "all";
    const kSelect = document.getElementById("admin-filter-stock");
    if (kSelect) kSelect.value = "all";
    const oSelect = document.getElementById("admin-filter-sort");
    if (oSelect) oSelect.value = "name_asc";

    renderProductsTable();
  };

  // 6.4 Shortcut from Brand KPI Cards
  window.filterByBrandShortcut = (brandId) => {
    window.resetCatalogFilters();

    filterBrand = brandId;
    const bSelect = document.getElementById("admin-filter-brand");
    if (bSelect) bSelect.value = brandId;

    // Switch active nav tab to Catálogo de Productos
    const tabCatalog = document.querySelector('[data-target="section-products"]');
    if (tabCatalog) {
      document.querySelectorAll(".admin-nav-link").forEach(t => t.classList.remove("active"));
      tabCatalog.classList.add("active");
      document.querySelectorAll(".admin-section").forEach(sec => sec.classList.add("d-none"));
      const secProd = document.getElementById("section-products");
      if (secProd) secProd.classList.remove("d-none");
    }

    renderProductsTable();
  };

  // 7. Event listeners for filters
  const searchInput = document.getElementById("admin-search-product");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterText = e.target.value;
      renderProductsTable();
    });
  }

  const brandSelect = document.getElementById("admin-filter-brand");
  if (brandSelect) {
    brandSelect.addEventListener("change", (e) => {
      filterBrand = e.target.value;
      renderProductsTable();
    });
  }

  const deptSelect = document.getElementById("admin-filter-dept");
  if (deptSelect) {
    deptSelect.addEventListener("change", (e) => {
      filterDept = e.target.value;
      renderProductsTable();
    });
  }

  const catSelect = document.getElementById("admin-filter-category");
  if (catSelect) {
    catSelect.addEventListener("change", (e) => {
      filterCategory = e.target.value;
      renderProductsTable();
    });
  }

  const stockSelect = document.getElementById("admin-filter-stock");
  if (stockSelect) {
    stockSelect.addEventListener("change", (e) => {
      filterStock = e.target.value;
      renderProductsTable();
    });
  }

  const sortSelect = document.getElementById("admin-filter-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      filterSort = e.target.value;
      renderProductsTable();
    });
  }

  // 8. Open New Product Modal
  window.openNewProductModal = () => {
    document.getElementById("productModalHeading").textContent = "Agregar Nuevo Producto";
    document.getElementById("edit-prod-id").value = "";
    document.getElementById("productEditForm").reset();
    document.getElementById("prod-stock").value = "1";
    const brandSelect = document.getElementById("prod-marca");
    if (brandSelect) brandSelect.value = "betterware";

    const modalEl = document.getElementById("addProductModal");
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
      modalInstance.show();
    } else if (typeof coreui !== "undefined" && coreui.Modal) {
      const modalInstance = coreui.Modal.getOrCreateInstance(modalEl);
      modalInstance.show();
    } else {
      modalEl.classList.add("show");
      modalEl.style.display = "block";
    }
  };

  // Close Product Modal
  window.closeProductModal = () => {
    const modalEl = document.getElementById("addProductModal");
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    }
    if (typeof coreui !== "undefined" && coreui.Modal) {
      const modalInstance = coreui.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    }
    modalEl.classList.remove("show");
    modalEl.style.display = "none";
    const backdrop = document.querySelector(".modal-backdrop");
    if (backdrop) backdrop.remove();
  };

  // 9. Open Edit Product Modal
  window.editProduct = (id) => {
    const product = productsList.find(p => p.id === id);
    if (!product) return;

    document.getElementById("productModalHeading").textContent = `Editar Producto: ${product.codigo || ''}`;
    document.getElementById("edit-prod-id").value = product.id;
    document.getElementById("prod-code").value = product.codigo || "";
    document.getElementById("prod-name").value = product.nombre || "";
    
    const brandSelect = document.getElementById("prod-marca");
    if (brandSelect) brandSelect.value = (product.marca || "betterware").toLowerCase();

    document.getElementById("prod-dept").value = (product.departamento || (product.marca === 'betterware' ? 'hogar' : 'belleza')).toLowerCase();
    document.getElementById("prod-category").value = product.categoria || "";
    document.getElementById("prod-price-reg").value = product.precio_regular || "";
    document.getElementById("prod-price-off").value = product.precio_oferta || "";
    document.getElementById("prod-stock").value = (typeof product.stock === "number" && product.stock >= 0) ? product.stock : 1;
    document.getElementById("prod-img-url").value = product.fotos && product.fotos.length > 0 ? product.fotos[0] : "";
    document.getElementById("prod-desc").value = product.descripcion || "";

    const modalEl = document.getElementById("addProductModal");
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
      modalInstance.show();
    } else if (typeof coreui !== "undefined" && coreui.Modal) {
      const modalInstance = coreui.Modal.getOrCreateInstance(modalEl);
      modalInstance.show();
    } else {
      modalEl.classList.add("show");
      modalEl.style.display = "block";
    }
  };

  // 10. Delete product action
  window.deleteProduct = async (id) => {
    const product = productsList.find(p => p.id === id);
    const title = product ? product.nombre : "este producto";
    if (confirm(`¿Estás seguro de eliminar "${title}" del catálogo?`)) {
      await window.db.deleteProduct(id);
      await loadAdminData();
    }
  };

  // 11. Save / Add Product Form Submit
  const productEditForm = document.getElementById("productEditForm");
  if (productEditForm) {
    productEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const editId = document.getElementById("edit-prod-id").value;
        const codeVal = document.getElementById("prod-code").value.trim();
        const nameVal = document.getElementById("prod-name").value.trim();
        const marcaSelect = document.getElementById("prod-marca");
        const marcaVal = marcaSelect ? marcaSelect.value.toLowerCase() : "betterware";
        const deptVal = document.getElementById("prod-dept").value;
        const catVal = document.getElementById("prod-category").value.trim();
        const priceRegVal = parseFloat(document.getElementById("prod-price-reg").value);
        const priceOffVal = parseFloat(document.getElementById("prod-price-off").value);
        const stockVal = parseInt(document.getElementById("prod-stock").value);
        const imgVal = document.getElementById("prod-img-url").value.trim();
        const descVal = document.getElementById("prod-desc").value.trim();

        const product = {
          id: editId || ("prod_" + Date.now()),
          codigo: codeVal,
          nombre: nameVal,
          departamento: deptVal,
          marca: marcaVal,
          categoria: catVal || "General",
          precio_regular: isNaN(priceRegVal) ? 0 : priceRegVal,
          precio_oferta: isNaN(priceOffVal) ? null : priceOffVal,
          es_oferta: !isNaN(priceOffVal) && priceOffVal > 0 && priceOffVal < priceRegVal,
          descripcion: descVal,
          fotos: [imgVal || "https://via.placeholder.com/400?text=Sin+Imagen"],
          stock: isNaN(stockVal) ? 1 : Math.max(0, stockVal),
          activo: true,
          variantes: []
        };

        await window.db.saveProduct(product);
        window.closeProductModal();
        productEditForm.reset();
        await loadAdminData();
        alert(`¡Producto "${nameVal}" guardado exitosamente!`);
      } catch (err) {
        console.error("Error al guardar producto:", err);
        alert("Error al guardar producto: " + err.message);
      }
    });
  }

  // Initial Load
  await loadAdminData();
});
