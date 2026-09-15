// Admin Panel Logic for Tienda Nesty
document.addEventListener("DOMContentLoaded", async () => {
  let ordersList = [];
  let productsList = [];

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
    });
  });

  // Load Admin Dashboard Data
  async function loadAdminData() {
    ordersList = await window.db.getOrders();
    productsList = await window.db.getProducts();

    renderDashboardMetrics();
    renderOrdersTable();
    renderProductsTable();
  }

  // Render Dashboard KPI Cards
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
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No se han registrado pedidos.</td></tr>`;
      return;
    }

    tableBody.innerHTML = ordersList.map(order => {
      const fechaFormatted = new Date(order.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
      const statusClass = `status-${order.estado}`;

      return `
        <tr>
          <td><strong class="text-dark">${order.id}</strong></td>
          <td><small>${fechaFormatted}</small></td>
          <td>
            <strong>${order.cliente.nombre}</strong><br>
            <small class="text-muted"><i class="bi bi-whatsapp"></i> ${order.cliente.telefono}</small>
          </td>
          <td><span class="badge bg-light text-dark border">${order.items ? order.items.length : 0} ítems</span></td>
          <td class="fw-bold text-dark">$${order.total ? order.total.toFixed(2) : '0.00'}</td>
          <td><span class="status-badge ${statusClass}">${order.estado.replace('_', ' ').toUpperCase()}</span></td>
          <td>
            <select class="form-select form-select-sm status-change-select" data-order-id="${order.id}">
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

    // Attach Status Select Listeners
    tableBody.querySelectorAll(".status-change-select").forEach(select => {
      select.addEventListener("change", async (e) => {
        const orderId = e.target.getAttribute("data-order-id");
        const newStatus = e.target.value;
        await window.db.updateOrderStatus(orderId, newStatus);
        await loadAdminData();
      });
    });
  }

  // Render Products Table
  function renderProductsTable() {
    const tableBody = document.getElementById("admin-products-tbody");
    if (!tableBody) return;

    if (productsList.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No hay productos en el catálogo.</td></tr>`;
      return;
    }

    tableBody.innerHTML = productsList.map(p => {
      const isBW = p.marca === "betterware";
      const brandBadge = isBW ? '<span class="badge bg-primary">Betterware</span>' : '<span class="badge bg-danger">Ésika</span>';
      const mainImg = (p.fotos && p.fotos.length > 0) ? p.fotos[0] : "";

      return `
        <tr>
          <td><img src="${mainImg}" style="width: 45px; height: 45px; object-fit: contain;" class="rounded bg-light p-1"></td>
          <td><code>${p.codigo}</code></td>
          <td><strong>${p.nombre}</strong></td>
          <td>${brandBadge}</td>
          <td>${p.categoria}</td>
          <td>
            <strong class="text-dark">$${p.precio_oferta || p.precio_regular}</strong>
            ${p.precio_oferta ? `<br><small class="text-decoration-line-through text-muted">$${p.precio_regular}</small>` : ''}
          </td>
          <td>
            <button class="btn btn-sm btn-outline-danger" onclick="window.deleteProduct('${p.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Delete product action
  window.deleteProduct = async (id) => {
    if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
      await window.db.deleteProduct(id);
      await loadAdminData();
    }
  };

  // Add Product Form Submit
  const newProductForm = document.getElementById("newProductForm");
  if (newProductForm) {
    newProductForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const product = {
        codigo: document.getElementById("prod-code").value,
        nombre: document.getElementById("prod-name").value,
        marca: document.getElementById("prod-brand").value,
        categoria: document.getElementById("prod-category").value,
        precio_regular: parseFloat(document.getElementById("prod-price-reg").value),
        precio_oferta: parseFloat(document.getElementById("prod-price-off").value) || null,
        descripcion: document.getElementById("prod-desc").value,
        fotos: [document.getElementById("prod-img-url").value || "https://via.placeholder.com/400"],
        stock: parseInt(document.getElementById("prod-stock").value) || 10,
        activo: true
      };

      await window.db.saveProduct(product);
      newProductForm.reset();
      const modalEl = document.getElementById("addProductModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      await loadAdminData();
    });
  }

  // Bulk Import JSON Handler
  const bulkImportForm = document.getElementById("bulkImportForm");
  if (bulkImportForm) {
    bulkImportForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const jsonText = document.getElementById("bulk-json-input").value;
      try {
        const parsed = JSON.parse(jsonText);
        if (!Array.isArray(parsed)) {
          alert("El contenido JSON debe ser un arreglo de productos [ { ... }, { ... } ]");
          return;
        }
        const count = await window.db.bulkImportProducts(parsed);
        alert(`¡Carga masiva exitosa! Se importaron ${count} productos correctamente.`);
        document.getElementById("bulk-json-input").value = "";
        await loadAdminData();
      } catch (err) {
        alert("Error al procesar el archivo JSON: " + err.message);
      }
    });
  }

  // Initialize
  await loadAdminData();
});
