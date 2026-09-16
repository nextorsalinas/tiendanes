// Admin Panel Logic for Tienda Nesty (Gestión Completa & JSON Directo)
document.addEventListener("DOMContentLoaded", async () => {
  let ordersList = [];
  let productsList = [];
  let filterText = "";

  // Tab switcher
  const navTabs = document.querySelectorAll(".admin-nav-link");
  navTabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      navTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetSection = tab.getAttribute("data-target");
      document.querySelectorAll(".admin-section").forEach(sec => sec.classList.add("d-none"));
      document.getElementById(targetSection).classList.remove("d-none");

      if (targetSection === "section-bulk-import") {
        populateJsonEditorTextarea();
      }
    });
  });

  // Load Admin Data
  async function loadAdminData() {
    ordersList = await window.db.getOrders();
    productsList = await window.db.getProducts();

    renderDashboardMetrics();
    renderOrdersTable();
    renderProductsTable();
    populateJsonEditorTextarea();
  }

  // Populate JSON Editor Textarea
  function populateJsonEditorTextarea() {
    const jsonInput = document.getElementById("bulk-json-input");
    if (jsonInput) {
      jsonInput.value = JSON.stringify(productsList, null, 2);
    }
  }

  // Render Dashboard Metrics
  function renderDashboardMetrics() {
    const totalOrders = ordersList.length;
    const pendingOrders = ordersList.filter(o => o.estado === "pendiente_pago").length;
    const totalRevenue = ordersList.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalProducts = productsList.length;

    const elTotalOrders = document.getElementById("metric-total-orders");
    const elPendingOrders = document.getElementById("metric-pending-orders");
    const elRevenue = document.getElementById("metric-revenue");
    const elTotalProducts = document.getElementById("metric-total-products");

    if (elTotalOrders) elTotalOrders.textContent = totalOrders;
    if (elPendingOrders) elPendingOrders.textContent = pendingOrders;
    if (elRevenue) elRevenue.textContent = `$${totalRevenue.toFixed(2)} MXN`;
    if (elTotalProducts) elTotalProducts.textContent = totalProducts;
  }

  // Render Orders Table
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
            <strong>${order.cliente.nombre}</strong><br>
            <small class="text-muted"><i class="bi bi-whatsapp"></i> ${order.cliente.telefono}</small>
          </td>
          <td>
            <small class="fw-bold text-dark">${itemTitle}</small><br>
            <small class="text-muted">${order.cliente.direccion}</small>
          </td>
          <td class="fw-bold text-success">$${order.total ? order.total.toFixed(2) : '0.00'}</td>
          <td><span class="status-badge ${statusClass}">${order.estado.replace('_', ' ').toUpperCase()}</span></td>
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

  // Render Products Table with Search
  function renderProductsTable() {
    const tableBody = document.getElementById("admin-products-tbody");
    if (!tableBody) return;

    let filtered = productsList;
    if (filterText.trim() !== "") {
      const q = filterText.toLowerCase();
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(q) || 
        p.codigo.toLowerCase().includes(q) || 
        (p.categoria && p.categoria.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron productos en el catálogo.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(p => {
      const dept = (p.departamento || (p.marca === 'betterware' ? 'hogar' : 'belleza')).toUpperCase();
      const deptBadge = dept === 'HOGAR' ? '<span class="badge bg-primary">HOGAR</span>' : '<span class="badge bg-danger">BELLEZA</span>';
      const mainImg = (p.fotos && p.fotos.length > 0) ? p.fotos[0] : "https://via.placeholder.com/400?text=Sin+Imagen";

      return `
        <tr>
          <td><img src="${mainImg}" style="width: 40px; height: 40px; object-fit: contain;" class="rounded bg-light p-1"></td>
          <td><code>${p.codigo}</code></td>
          <td><strong class="text-dark">${p.nombre}</strong></td>
          <td>${deptBadge}</td>
          <td><small class="text-muted">${p.categoria}</small></td>
          <td>
            <strong class="text-dark">$${(p.precio_oferta || p.precio_regular).toFixed(2)}</strong>
            ${p.precio_oferta ? `<br><small class="text-decoration-line-through text-muted">$${p.precio_regular.toFixed(2)}</small>` : ''}
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

  // Search input in admin table
  const searchInput = document.getElementById("admin-search-product");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterText = e.target.value;
      renderProductsTable();
    });
  }

  // Open New Product Modal
  window.openNewProductModal = () => {
    document.getElementById("productModalHeading").textContent = "Agregar Nuevo Producto";
    document.getElementById("edit-prod-id").value = "";
    document.getElementById("productEditForm").reset();
  };

  // Open Edit Product Modal
  window.editProduct = (id) => {
    const product = productsList.find(p => p.id === id);
    if (!product) return;

    document.getElementById("productModalHeading").textContent = `Editar Producto: ${product.codigo}`;
    document.getElementById("edit-prod-id").value = product.id;
    document.getElementById("prod-code").value = product.codigo;
    document.getElementById("prod-name").value = product.nombre;
    document.getElementById("prod-dept").value = (product.departamento || (product.marca === 'betterware' ? 'hogar' : 'belleza'));
    document.getElementById("prod-category").value = product.categoria;
    document.getElementById("prod-price-reg").value = product.precio_regular;
    document.getElementById("prod-price-off").value = product.precio_oferta || "";
    document.getElementById("prod-stock").value = product.stock || 20;
    document.getElementById("prod-img-url").value = product.fotos && product.fotos.length > 0 ? product.fotos[0] : "";
    document.getElementById("prod-desc").value = product.descripcion || "";

    const modal = new bootstrap.Modal(document.getElementById("addProductModal"));
    modal.show();
  };

  // Delete product action
  window.deleteProduct = async (id) => {
    const product = productsList.find(p => p.id === id);
    const title = product ? product.nombre : "este producto";
    if (confirm(`¿Estás seguro de eliminar "${title}" del catálogo?`)) {
      await window.db.deleteProduct(id);
      await loadAdminData();
    }
  };

  // Save / Edit Product Form Submit
  const productEditForm = document.getElementById("productEditForm");
  if (productEditForm) {
    productEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const editId = document.getElementById("edit-prod-id").value;

      const product = {
        id: editId || null,
        codigo: document.getElementById("prod-code").value,
        nombre: document.getElementById("prod-name").value,
        departamento: document.getElementById("prod-dept").value,
        marca: document.getElementById("prod-dept").value === "hogar" ? "betterware" : "esika",
        categoria: document.getElementById("prod-category").value,
        precio_regular: parseFloat(document.getElementById("prod-price-reg").value),
        precio_oferta: parseFloat(document.getElementById("prod-price-off").value) || null,
        descripcion: document.getElementById("prod-desc").value,
        fotos: [document.getElementById("prod-img-url").value || "https://via.placeholder.com/400"],
        stock: parseInt(document.getElementById("prod-stock").value) || 20,
        activo: true
      };

      await window.db.saveProduct(product);
      productEditForm.reset();
      const modalEl = document.getElementById("addProductModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      await loadAdminData();
    });
  }

  // Bulk Import / Direct JSON Submit
  const bulkImportForm = document.getElementById("bulkImportForm");
  if (bulkImportForm) {
    bulkImportForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const jsonText = document.getElementById("bulk-json-input").value;
      try {
        const parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed)) {
          alert("El contenido JSON debe ser un arreglo de productos: [ { ... }, { ... } ]");
          return;
        }

        // Overwrite active products list with the edited array
        localStorage.setItem("nesty_products", JSON.stringify(parsed));
        alert(`¡Catálogo actualizado con éxito! Se guardaron ${parsed.length} productos.`);
        await loadAdminData();
      } catch (err) {
        alert("Error al procesar el archivo JSON. Verifica que la sintaxis sea válida: " + err.message);
      }
    });
  }

  // Export / Download Catalog JSON
  function exportCatalogJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(productsList, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nesty_catalog_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  document.querySelectorAll("#btn-export-json, #btn-export-json-editor").forEach(btn => {
    btn.addEventListener("click", exportCatalogJSON);
  });

  const btnLoadCurrent = document.getElementById("btn-load-current-json");
  if (btnLoadCurrent) {
    btnLoadCurrent.addEventListener("click", populateJsonEditorTextarea);
  }

  // Reset / Clear Catalog
  const btnResetCatalog = document.getElementById("btn-reset-catalog");
  if (btnResetCatalog) {
    btnResetCatalog.addEventListener("click", async () => {
      if (confirm("⚠️ ¿Estás seguro de vaciar el catálogo activo?")) {
        localStorage.setItem("nesty_products", JSON.stringify([]));
        await loadAdminData();
      }
    });
  }

  // Initial load
  await loadAdminData();
});
