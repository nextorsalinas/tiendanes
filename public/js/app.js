// Main Application Logic for Tienda Nesty (Tarjetas 100% Limpias sin ninguna etiqueta)
const WHATSAPP_SELLER_PHONE = "525525000024";

document.addEventListener("DOMContentLoaded", async () => {
  let allProducts = [];
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

  // Offcanvas Drawer Controller (Menú Hamburguesa)
  const offcanvasEl = document.getElementById("categoriesOffcanvas");
  const hamburgerBtn = document.getElementById("btn-hamburger-menu");

  function getOffcanvasInstance() {
    if (!offcanvasEl) return null;
    if (typeof coreui !== "undefined" && coreui.Offcanvas) {
      return coreui.Offcanvas.getOrCreateInstance(offcanvasEl);
    }
    if (typeof bootstrap !== "undefined" && bootstrap.Offcanvas) {
      return bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
    }
    return null;
  }

  function openOffcanvas() {
    const inst = getOffcanvasInstance();
    if (inst) {
      inst.show();
    } else if (offcanvasEl) {
      offcanvasEl.classList.add("show");
      offcanvasEl.style.visibility = "visible";
      let backdrop = document.querySelector(".offcanvas-backdrop");
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "offcanvas-backdrop fade show";
        document.body.appendChild(backdrop);
        backdrop.addEventListener("click", closeOffcanvas);
      }
    }
  }

  function closeOffcanvas() {
    const inst = getOffcanvasInstance();
    if (inst) {
      inst.hide();
    } else if (offcanvasEl) {
      offcanvasEl.classList.remove("show");
      offcanvasEl.style.visibility = "";
      document.querySelector(".offcanvas-backdrop")?.remove();
    }
  }

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openOffcanvas();
    });
  }

  const offcanvasCloseBtn = offcanvasEl ? offcanvasEl.querySelector(".btn-close") : null;
  if (offcanvasCloseBtn) {
    offcanvasCloseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeOffcanvas();
    });
  }

  // Category Formatter & Normalizer
  function formatCategoryName(cat) {
    if (!cat) return "";
    const clean = cat.trim();
    const map = {
      "cocina": "Cocina",
      "limpieza": "Limpieza",
      "baño": "Baño",
      "hogar": "Hogar",
      "recamara": "Recámara",
      "bienestar": "Bienestar",
      "contigo": "Portátiles & Viaje",
      "mochilas": "Mochilas & Bolsos",
      "perfumes": "Perfumes",
      "joyería": "Joyería",
      "maquillaje": "Maquillaje",
      "cuidado personal": "Cuidado Personal",
      "skincare": "Skincare",
      "moda y accesorios": "Moda & Accesorios",
      "tecnología": "Tecnología"
    };
    return map[clean.toLowerCase()] || (clean.charAt(0).toUpperCase() + clean.slice(1));
  }

  // Smooth scroll offset helper to prevent sticky navbar from obscuring content
  function scrollToProductsView() {
    const chipsContainer = document.getElementById("category-chips-container");
    if (chipsContainer) {
      const yOffset = -75; // sticky purple header height + breathing room
      const y = chipsContainer.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
  }

  // Auto-center active chip in the horizontal scrolling slider
  function syncActiveChipScroll() {
    setTimeout(() => {
      const chipContainer = document.getElementById("category-chips-container");
      if (chipContainer) {
        const activeChip = chipContainer.querySelector(`.chip-category[data-category="${currentCategory}"]`);
        if (activeChip) {
          activeChip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }
    }, 50);
  }

  // Get normalized categories list excluding technical tags
  function getCatalogCategories() {
    const ignoredTags = new Set(["aplica_hiperoferta", "ahorro_30", "aplica_superprecio"]);
    const categoryMap = new Map();

    allProducts.forEach(p => {
      if (p.activo !== false && p.categoria) {
        const lower = p.categoria.toLowerCase().trim();
        if (!ignoredTags.has(lower)) {
          const display = formatCategoryName(p.categoria);
          if (!categoryMap.has(display)) {
            categoryMap.set(display, new Set());
          }
          categoryMap.get(display).add(p.categoria);
        }
      }
    });

    const sortedNames = Array.from(categoryMap.keys()).sort();
    return [
      { id: "all", label: "Todas" },
      { id: "gift_200", label: "Regalos < $200" },
      { id: "gift_350", label: "Regalos < $350" },
      ...sortedNames.map(name => ({ id: name, label: name, rawKeys: Array.from(categoryMap.get(name)) }))
    ];
  }

  // Render Category Chips & Offcanvas Drawer List
  function renderCategories() {
    const categories = getCatalogCategories();

    // 1. Render Horizontal Chips
    const chipContainer = document.getElementById("category-chips-container");
    if (chipContainer) {
      chipContainer.innerHTML = categories.map(cat => {
        const isSelected = currentCategory === cat.id;
        return `<button class="chip-category ${isSelected ? 'active' : ''}" data-category="${cat.id}">${cat.label}</button>`;
      }).join("");

      chipContainer.querySelectorAll(".chip-category").forEach(btn => {
        btn.addEventListener("click", (e) => {
          currentCategory = e.currentTarget.getAttribute("data-category");
          renderCategories();
          renderProducts();
          syncActiveChipScroll();
        });
      });
    }

    // 2. Render Offcanvas Hamburger Menu List
    const offcanvasList = document.getElementById("offcanvas-categories-list");
    if (offcanvasList) {
      const countBadge = document.getElementById("offcanvas-count-badge");
      if (countBadge) {
        const totalActive = allProducts.filter(p => p.activo !== false).length;
        countBadge.textContent = `${totalActive} prods`;
      }

      offcanvasList.innerHTML = categories.map(cat => {
        const isSelected = currentCategory === cat.id;
        let count = 0;
        if (cat.id === "all") {
          count = allProducts.filter(p => p.activo !== false).length;
        } else if (cat.id === "gift_200") {
          count = allProducts.filter(p => p.activo !== false && ((p.precio_oferta && p.precio_oferta < p.precio_regular ? p.precio_oferta : p.precio_regular) <= 200)).length;
        } else if (cat.id === "gift_350") {
          count = allProducts.filter(p => p.activo !== false && ((p.precio_oferta && p.precio_oferta < p.precio_regular ? p.precio_oferta : p.precio_regular) <= 350)).length;
        } else if (cat.rawKeys) {
          count = allProducts.filter(p => p.activo !== false && cat.rawKeys.includes(p.categoria)).length;
        } else {
          count = allProducts.filter(p => p.activo !== false && formatCategoryName(p.categoria) === cat.id).length;
        }

        return `
          <button type="button" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-3 px-4 ${isSelected ? 'active-offcanvas-cat' : ''}" data-category="${cat.id}">
            <span class="d-flex align-items-center gap-2">
              ${cat.id.startsWith('gift_') ? '<span class="badge bg-warning text-dark me-1" style="font-size:0.65rem;">PROMO</span>' : ''}
              ${cat.label}
            </span>
            <span class="badge rounded-pill ${isSelected ? 'bg-primary text-white' : 'bg-light text-muted border'}">${count}</span>
          </button>
        `;
      }).join("");

      offcanvasList.querySelectorAll("[data-category]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          currentCategory = e.currentTarget.getAttribute("data-category");
          closeOffcanvas();
          renderCategories();
          renderProducts();
          syncActiveChipScroll();
          scrollToProductsView();
        });
      });
    }
  }

  // Render Product Grid (Sin etiquetas de marca, departamento ni descuento)
  function renderProducts() {
    const grid = document.getElementById("products-grid");
    const countEl = document.getElementById("products-count-text");
    if (!grid) return;

    let filtered = allProducts.filter(p => p.activo !== false);

    if (currentCategory === "gift_200") {
      filtered = filtered.filter(p => {
        const price = (p.precio_oferta && p.precio_oferta < p.precio_regular) ? p.precio_oferta : p.precio_regular;
        return price <= 200;
      });
    } else if (currentCategory === "gift_350") {
      filtered = filtered.filter(p => {
        const price = (p.precio_oferta && p.precio_oferta < p.precio_regular) ? p.precio_oferta : p.precio_regular;
        return price <= 350;
      });
    } else if (currentCategory !== "all") {
      const categories = getCatalogCategories();
      const catObj = categories.find(c => c.id === currentCategory);
      if (catObj && catObj.rawKeys) {
        filtered = filtered.filter(p => catObj.rawKeys.includes(p.categoria));
      } else {
        filtered = filtered.filter(p => formatCategoryName(p.categoria) === currentCategory || p.categoria === currentCategory);
      }
    }

    if (countEl) {
      if (currentCategory === "all") {
        countEl.innerHTML = `<span><strong>${filtered.length}</strong> Productos Disponibles</span>`;
      } else {
        const catLabel = currentCategory === "gift_200" 
          ? "Regalos < $200" 
          : currentCategory === "gift_350" 
            ? "Regalos < $350" 
            : currentCategory;

        countEl.innerHTML = `
          <div class="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
            <span>Mostrando <strong>${filtered.length}</strong> en <span class="badge bg-light text-primary border">${catLabel}</span></span>
            <button class="btn btn-sm btn-link text-decoration-none p-0 text-muted" id="btn-clear-cat-filter" style="font-size:0.78rem;">
              <i class="bi bi-x-circle me-1"></i>Ver todos
            </button>
          </div>
        `;
        const clearBtn = document.getElementById("btn-clear-cat-filter");
        if (clearBtn) {
          clearBtn.addEventListener("click", () => {
            currentCategory = "all";
            renderCategories();
            renderProducts();
            syncActiveChipScroll();
            scrollToProductsView();
          });
        }
      }
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
          currentCategory = "all";
          renderCategories();
          renderProducts();
          syncActiveChipScroll();
          scrollToProductsView();
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

              <button class="btn-whatsapp-card" onclick="window.openOrderModal('${p.id}')" aria-label="Pedir ${p.nombre} por WhatsApp">
                <i class="bi bi-whatsapp"></i> <span>Pedir<span class="d-none d-sm-inline"> por WhatsApp</span></span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
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

      <!-- Gift Option Section -->
      <div class="gift-option-card mt-3">
        <div class="form-check form-switch d-flex align-items-center justify-content-between p-0 m-0">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <label class="form-check-label fw-bold text-dark small m-0" for="order-is-gift">¿Es para regalo?</label>
              <span class="gift-badge-free">ENVOLTURA GRATIS</span>
            </div>
            <p class="text-muted m-0" style="font-size:0.75rem;">Te lo preparamos listo para entregar con tarjeta de dedicatoria de cortesía.</p>
          </div>
          <input class="form-check-input ms-2" type="checkbox" role="switch" id="order-is-gift" style="cursor:pointer; width:2.2rem; height:1.2rem;">
        </div>
        
        <div id="gift-dedication-wrapper" class="mt-2 pt-2 border-top border-secondary-subtle d-none">
          <label class="form-label fw-semibold text-dark small mb-1">Mensaje o dedicatoria para la tarjeta (opcional):</label>
          <textarea class="form-control form-control-sm rounded-2" id="order-gift-card-msg" rows="2" placeholder="Ej. ¡Feliz Cumpleaños! Con mucho cariño..."></textarea>
        </div>
      </div>
    `;

    const orderModal = new bootstrap.Modal(document.getElementById("orderProductModal"));
    orderModal.show();

    // Toggle dedication field on gift checkbox
    const giftCheckbox = document.getElementById("order-is-gift");
    const giftWrapper = document.getElementById("gift-dedication-wrapper");
    if (giftCheckbox && giftWrapper) {
      giftCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          giftWrapper.classList.remove("d-none");
        } else {
          giftWrapper.classList.add("d-none");
        }
      });
    }
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

      const isGift = document.getElementById("order-is-gift")?.checked || false;
      const giftDedication = document.getElementById("order-gift-card-msg")?.value.trim() || "";

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
        metodoPago: paymentMethod,
        esRegalo: isGift,
        dedicatoria: giftDedication
      };

      const order = await window.db.createOrder(orderPayload);
      const waUrl = generateSingleProductWhatsAppUrl(order.id, selectedProductForOrder, selectedVariant, customerData, paymentMethod, unitPrice, isGift, giftDedication);

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
  function generateSingleProductWhatsAppUrl(orderId, product, variant, customer, payment, price, isGift, giftDedication) {
    const variantStr = variant ? `\n🎨 *Variante:* ${variant}` : '';

    let msg = `🛍️ *¡NUEVO PEDIDO EN nestt.!*\n`;
    msg += `📋 *Folio:* #${orderId}\n`;
    msg += `------------------------------------\n`;
    msg += `📌 *PRODUCTO:* *${product.nombre}*${variantStr}\n`;
    msg += `🔢 *Código:* ${product.codigo}\n`;
    msg += `💰 *Precio:* *$${price.toFixed(2)} MXN*\n`;
    msg += `------------------------------------\n`;
    if (isGift) {
      msg += `🎁 *¿ES PARA REGALO?:* ¡SÍ! (Envoltura de cortesía gratis)\n`;
      if (giftDedication) {
        msg += `💌 *Dedicatoria:* "${giftDedication}"\n`;
      } else {
        msg += `💌 *Dedicatoria:* (Tarjeta en blanco para escribir a mano)\n`;
      }
      msg += `------------------------------------\n`;
    }
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
