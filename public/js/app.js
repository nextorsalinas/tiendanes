// Main Application Logic for Tienda Nesty (Tarjetas 100% Limpias sin ninguna etiqueta)
const WHATSAPP_SELLER_PHONE = "525525000024";

document.addEventListener("DOMContentLoaded", async () => {
  let allProducts = [];
  let currentDept = "all";
  let currentCategory = "all";
  let selectedProductForOrder = null;

  // Load products
  async function loadCatalog() {
    allProducts = await window.db.getProducts();
    renderCategories();
    renderProducts();
  }

  // Helper to get product department ('hogar' or 'belleza')
  function getDept(p) {
    if (p.departamento) return p.departamento.toLowerCase();
    if (p.marca === "betterware") return "hogar";
    if (p.marca === "esika") return "belleza";
    return "hogar";
  }

  // Render Category Chips
  function renderCategories() {
    const chipContainer = document.getElementById("category-chips-container");
    if (!chipContainer) return;

    let filteredForCategories = allProducts;
    if (currentDept !== "all") {
      filteredForCategories = allProducts.filter(p => getDept(p) === currentDept);
    }

    const categories = ["Todas", ...new Set(filteredForCategories.map(p => p.categoria))];

    chipContainer.innerHTML = categories.map(cat => {
      const isSelected = (currentCategory === "all" && cat === "Todas") || (currentCategory === cat);
      const val = cat === "Todas" ? "all" : cat;
      return `<button class="chip-category ${isSelected ? 'active' : ''}" data-category="${val}">${cat}</button>`;
    }).join("");

    chipContainer.querySelectorAll(".chip-category").forEach(btn => {
      btn.addEventListener("click", (e) => {
        currentCategory = e.target.getAttribute("data-category");
        renderCategories();
        renderProducts();
      });
    });
  }

  // Render Product Grid (Sin etiquetas de marca, departamento ni descuento)
  function renderProducts() {
    const grid = document.getElementById("products-grid");
    const countEl = document.getElementById("products-count-text");
    if (!grid) return;

    let filtered = allProducts.filter(p => p.activo !== false);

    if (currentDept !== "all") {
      filtered = filtered.filter(p => getDept(p) === currentDept);
    }

    if (currentCategory !== "all") {
      filtered = filtered.filter(p => p.categoria === currentCategory);
    }

    if (countEl) {
      countEl.textContent = `${filtered.length} Productos Disponibles`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="p-4 bg-white rounded-4 border text-center max-w-md mx-auto">
            <i class="bi bi-box-seam text-muted fs-1 mb-2"></i>
            <h6 class="fw-bold text-dark">No hay productos en esta sección</h6>
            <button class="btn btn-sm btn-outline-dark rounded-pill mt-2" id="btn-reset-filters">Ver todos los productos</button>
          </div>
        </div>
      `;
      const resetBtn = document.getElementById("btn-reset-filters");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          currentDept = "all";
          currentCategory = "all";
          updateDeptTabState();
          renderCategories();
          renderProducts();
        });
      }
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const hasDiscount = p.precio_oferta && p.precio_oferta < p.precio_regular;
      const currentPrice = hasDiscount ? p.precio_oferta : p.precio_regular;
      const discountPercent = hasDiscount ? Math.round(((p.precio_regular - p.precio_oferta) / p.precio_regular) * 100) : 0;
      const mainImg = (p.fotos && p.fotos.length > 0) ? p.fotos[0] : "https://via.placeholder.com/400?text=Sin+Imagen";

      return `
        <div class="col-6 col-md-4 col-lg-3">
          <div class="product-card-minimal">
            <div class="product-card-img-container" onclick="window.openOrderModal('${p.id}')">
              ${hasDiscount ? `<span class="badge-shein-discount">-${discountPercent}%</span>` : ''}
              <img src="${mainImg}" alt="${p.nombre}" loading="lazy">
            </div>
            <div class="product-card-content">
              <h6 class="product-name-minimal" onclick="window.openOrderModal('${p.id}')">${p.nombre}</h6>
              
              <div class="price-row">
                <span class="price-main">$${currentPrice.toFixed(2)}</span>
                ${hasDiscount ? `<span class="price-old-strike">$${p.precio_regular.toFixed(2)}</span>` : ''}
              </div>

              <button class="btn-whatsapp-card" onclick="window.openOrderModal('${p.id}')">
                <i class="bi bi-whatsapp"></i> Pedir por WhatsApp
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Department Navigation Listener
  const deptTabs = document.querySelectorAll("[data-dept-filter]");
  deptTabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      currentDept = tab.getAttribute("data-dept-filter");
      currentCategory = "all";
      updateDeptTabState();
      renderCategories();
      renderProducts();
    });
  });

  function updateDeptTabState() {
    deptTabs.forEach(tab => {
      const filter = tab.getAttribute("data-dept-filter");
      tab.classList.remove("active");
      if (filter === currentDept) {
        tab.classList.add("active");
      }
    });
  }

  // Open Direct Order Modal for Selected Product
  window.openOrderModal = (productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    selectedProductForOrder = product;

    const modalBody = document.getElementById("orderModalBody");
    const categoryLabel = document.getElementById("orderModalCategory");

    if (!modalBody) return;
    const deptName = getDept(product).toUpperCase();
    if (categoryLabel) categoryLabel.textContent = `CÓDIGO: ${product.codigo}`;

    const hasDiscount = product.precio_oferta && product.precio_oferta < product.precio_regular;
    const currentPrice = hasDiscount ? product.precio_oferta : product.precio_regular;
    const mainImg = (product.fotos && product.fotos.length > 0) ? product.fotos[0] : "";

    modalBody.innerHTML = `
      <div class="d-flex align-items-center gap-3 bg-light p-3 rounded-3 mb-3 border">
        <img src="${mainImg}" style="width: 75px; height: 75px; object-fit: contain;" class="rounded bg-white p-1">
        <div>
          <h6 class="fw-bold text-dark m-0">${product.nombre}</h6>
          <small class="text-muted">Cód: ${product.codigo}</small>
          <div class="mt-1">
            <span class="fs-5 fw-extrabold text-success">$${currentPrice.toFixed(2)} MXN</span>
            ${hasDiscount ? `<span class="text-muted text-decoration-line-through ms-2 small">$${product.precio_regular.toFixed(2)}</span>` : ''}
          </div>
        </div>
      </div>

      ${product.descripcion ? `<p class="text-secondary small mb-3 bg-white p-2 rounded border" style="font-size:0.82rem;">${product.descripcion}</p>` : ''}

      ${product.variantes && product.variantes.length > 0 ? `
        <div class="mb-3">
          <label class="form-label fw-bold text-dark small">Selecciona Tono / Variante *</label>
          <select class="form-select form-select-sm rounded-2" id="order-variant-select">
            ${product.variantes.map(v => `<option value="${v.nombre}">${v.nombre}</option>`).join("")}
          </select>
        </div>
      ` : ''}

      <div class="mb-3">
        <label class="form-label fw-semibold text-dark small">Tu Nombre Completo *</label>
        <input type="text" id="cust-name" class="form-control form-control-sm rounded-2" placeholder="Ej. Ana Martínez" required>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold text-dark small">Teléfono WhatsApp *</label>
        <input type="tel" id="cust-phone" class="form-control form-control-sm rounded-2" placeholder="Ej. 55 1234 5678" required>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold text-dark small">Dirección de Entrega *</label>
        <input type="text" id="cust-address" class="form-control form-control-sm rounded-2" placeholder="Calle, número y colonia" required>
      </div>

      <div class="mb-3">
        <label class="form-label fw-semibold text-dark small">Referencias adicionales (Opcional)</label>
        <input type="text" id="cust-notes" class="form-control form-control-sm rounded-2" placeholder="Ej. Casa color azul">
      </div>

      <div class="mb-2">
        <label class="form-label fw-semibold text-dark small mb-1">Forma de Pago:</label>
        <div class="d-flex gap-2">
          <div class="form-check border p-2 px-3 rounded-2 flex-grow-1 bg-white">
            <input class="form-check-input" type="radio" name="paymentMethod" id="pay-transfer" value="transferencia" checked>
            <label class="form-check-label fw-bold small text-dark" for="pay-transfer">Transferencia</label>
          </div>
          <div class="form-check border p-2 px-3 rounded-2 flex-grow-1 bg-white">
            <input class="form-check-input" type="radio" name="paymentMethod" id="pay-cash" value="efectivo">
            <label class="form-check-label fw-bold small text-dark" for="pay-cash">Efectivo</label>
          </div>
        </div>
      </div>
    `;

    const orderModal = new bootstrap.Modal(document.getElementById("orderProductModal"));
    orderModal.show();
  };

  // Submit Direct Order Form
  const directOrderForm = document.getElementById("directOrderForm");
  if (directOrderForm) {
    directOrderForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!selectedProductForOrder) return;

      const variantSelect = document.getElementById("order-variant-select");
      const selectedVariant = variantSelect ? variantSelect.value : null;

      const customerData = {
        nombre: document.getElementById("cust-name").value,
        telefono: document.getElementById("cust-phone").value,
        direccion: document.getElementById("cust-address").value,
        referencias: document.getElementById("cust-notes").value
      };

      const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
      const unitPrice = selectedProductForOrder.precio_oferta && selectedProductForOrder.precio_oferta < selectedProductForOrder.precio_regular 
        ? selectedProductForOrder.precio_oferta 
        : selectedProductForOrder.precio_regular;

      const orderPayload = {
        cliente: customerData,
        items: [{
          productId: selectedProductForOrder.id,
          codigo: selectedProductForOrder.codigo,
          nombre: selectedProductForOrder.nombre,
          departamento: getDept(selectedProductForOrder).toUpperCase(),
          varianteNombre: selectedVariant,
          precioUnitario: unitPrice,
          cantidad: 1
        }],
        total: unitPrice,
        metodoPago: paymentMethod
      };

      const order = await window.db.createOrder(orderPayload);
      const waUrl = generateSingleProductWhatsAppUrl(order.id, selectedProductForOrder, selectedVariant, customerData, paymentMethod, unitPrice);

      const orderModalEl = document.getElementById("orderProductModal");
      const modalInstance = bootstrap.Modal.getInstance(orderModalEl);
      if (modalInstance) modalInstance.hide();

      document.getElementById("orderSuccessFolio").textContent = "#" + order.id;
      document.getElementById("btn-open-wa").href = waUrl;

      const successModal = new bootstrap.Modal(document.getElementById("orderSuccessModal"));
      successModal.show();
    });
  }

  // Generate WhatsApp Message for Single Product Order
  function generateSingleProductWhatsAppUrl(orderId, product, variant, customer, payment, price) {
    const variantStr = variant ? `\n🎨 *Variante:* ${variant}` : '';

    let msg = `🛍️ *¡NUEVO PEDIDO DIRECTO EN TIENDA NESTY!*\n`;
    msg += `📋 *Folio:* #${orderId}\n`;
    msg += `------------------------------------\n`;
    msg += `📌 *PRODUCTO:* *${product.nombre}*${variantStr}\n`;
    msg += `🔢 *Código:* ${product.codigo}\n`;
    msg += `💰 *Precio:* *$${price.toFixed(2)} MXN*\n`;
    msg += `------------------------------------\n`;
    msg += `👤 *Cliente:* ${customer.nombre}\n`;
    msg += `📞 *Teléfono:* ${customer.telefono}\n`;
    msg += `📍 *Dirección de Entrega:* ${customer.direccion}\n`;
    if (customer.referencias) {
      msg += `📝 *Referencias:* ${customer.referencias}\n`;
    }
    msg += `💳 *Método de Pago:* ${payment.toUpperCase()}\n`;
    msg += `------------------------------------\n`;
    msg += `Quedo atento(a) para confirmar la recepción y enviar los datos de pago/entrega. ¡Muchas gracias!`;

    return `https://wa.me/${WHATSAPP_SELLER_PHONE}?text=${encodeURIComponent(msg)}`;
  }

  // Init
  await loadCatalog();
});
