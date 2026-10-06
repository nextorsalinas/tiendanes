// Logic for Product Detail Page (producto.html) | nestt.
const WHATSAPP_SELLER_PHONE = "525525000024";

document.addEventListener("DOMContentLoaded", async () => {
  const loadingView = document.getElementById("product-loading-view");
  const notFoundView = document.getElementById("product-not-found-view");
  const contentView = document.getElementById("product-content-view");

  let currentProduct = null;
  let currentQuantity = 1;

  // 1. Extract Product ID from URL (?id=... or ?codigo=...)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  const productCode = urlParams.get("codigo");

  if (!productId && !productCode) {
    showNotFound();
    return;
  }

  // 2. Load Products from Database
  try {
    const products = await window.db.getProducts();
    if (!products || !products.length) {
      showNotFound();
      return;
    }

    currentProduct = products.find(p => {
      if (productId && String(p.id) === String(productId)) return true;
      if (productCode && String(p.codigo) === String(productCode)) return true;
      return false;
    });

    if (!currentProduct) {
      showNotFound();
      return;
    }

    renderProductDetail(currentProduct);
  } catch (err) {
    console.error("Error al cargar producto:", err);
    showNotFound();
  }

  function showNotFound() {
    if (loadingView) loadingView.classList.add("d-none");
    if (notFoundView) notFoundView.classList.remove("d-none");
    if (contentView) contentView.classList.add("d-none");
    const mobileBar = document.getElementById("mobile-sticky-bar");
    if (mobileBar) mobileBar.classList.add("d-none");
  }

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

  function formatBrandBadgeClass(marca) {
    const clean = (marca || "betterware").toLowerCase().trim();
    if (clean.includes("esika")) return "badge-brand-esika";
    if (clean.includes("cyzone")) return "badge-brand-cyzone";
    if (clean.includes("lbel")) return "badge-brand-lbel";
    return "badge-brand-betterware";
  }

  // 3. Render Product Detail
  function renderProductDetail(p) {
    // Page Title & Meta
    document.title = `${p.nombre} | nestt. Regalos & Detalles`;
    const pageTitleEl = document.getElementById("page-title");
    if (pageTitleEl) pageTitleEl.textContent = `${p.nombre} | nestt.`;

    // Brand & Code
    const brandBadge = document.getElementById("detail-brand-badge");
    if (brandBadge) {
      const brandClean = (p.marca || "betterware").toLowerCase();
      brandBadge.textContent = formatBrandName(brandClean);
      brandBadge.className = `product-detail-brand-badge ${formatBrandBadgeClass(brandClean)}`;
    }

    const codeBadge = document.getElementById("detail-code-badge");
    if (codeBadge) {
      codeBadge.textContent = p.codigo ? `CÓD. ${p.codigo}` : "";
    }

    // Title
    const titleEl = document.getElementById("detail-title");
    if (titleEl) titleEl.textContent = p.nombre;

    // Gallery Photos
    const mainImgEl = document.getElementById("detail-main-img");
    const thumbsContainer = document.getElementById("detail-thumbnails-container");
    const photos = (p.fotos && p.fotos.length > 0) ? p.fotos : ["https://via.placeholder.com/600?text=Sin+Imagen"];

    if (mainImgEl) {
      mainImgEl.src = photos[0];
      mainImgEl.alt = p.nombre;
    }

    if (thumbsContainer && photos.length > 1) {
      thumbsContainer.classList.remove("d-none");
      thumbsContainer.innerHTML = photos.map((photoUrl, idx) => `
        <div class="product-thumb-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
          <img src="${photoUrl}" alt="${p.nombre} ${idx + 1}">
        </div>
      `).join("");

      thumbsContainer.querySelectorAll(".product-thumb-item").forEach(item => {
        item.addEventListener("click", () => {
          thumbsContainer.querySelectorAll(".product-thumb-item").forEach(t => t.classList.remove("active"));
          item.classList.add("active");
          const idx = parseInt(item.getAttribute("data-index"), 10);
          if (mainImgEl && photos[idx]) {
            mainImgEl.src = photos[idx];
          }
        });
      });
    }

    // Prices & Discount Calculation
    const hasDiscount = p.precio_oferta && p.precio_oferta < p.precio_regular;
    const currentPrice = hasDiscount ? p.precio_oferta : p.precio_regular;

    const salePriceEl = document.getElementById("detail-price-sale");
    if (salePriceEl) {
      salePriceEl.textContent = `$${currentPrice.toFixed(2)}`;
    }

    const normalPriceEl = document.getElementById("detail-price-normal");
    const savingsBadgeEl = document.getElementById("detail-savings-badge");

    if (hasDiscount) {
      const discountAmount = p.precio_regular - p.precio_oferta;
      const discountPercent = Math.round((discountAmount / p.precio_regular) * 100);

      if (normalPriceEl) {
        normalPriceEl.textContent = `$${p.precio_regular.toFixed(2)}`;
        normalPriceEl.classList.remove("d-none");
      }

      if (savingsBadgeEl) {
        savingsBadgeEl.textContent = `Ahorras $${discountAmount.toFixed(2)} (${discountPercent}% OFF)`;
        savingsBadgeEl.classList.remove("d-none");
      }
    } else {
      if (normalPriceEl) normalPriceEl.classList.add("d-none");
      if (savingsBadgeEl) savingsBadgeEl.classList.add("d-none");
    }

    // Description Preview & Full Modal
    const rawDesc = p.descripcion || "Producto exclusivo en nestt. Calidad garantizada, listo para entrega inmediata.";
    const descPreviewEl = document.getElementById("detail-desc-preview");
    if (descPreviewEl) {
      const snippet = rawDesc.length > 150 ? rawDesc.substring(0, 150) + "..." : rawDesc;
      descPreviewEl.textContent = snippet;
    }

    // Populate Modal Content
    const modalDescContent = document.getElementById("modal-desc-content");
    if (modalDescContent) {
      modalDescContent.textContent = rawDesc;
    }

    // Modal Specs Table
    const modalSpecCode = document.getElementById("modal-spec-code");
    if (modalSpecCode) modalSpecCode.textContent = p.codigo || "N/A";

    const modalSpecBrand = document.getElementById("modal-spec-brand");
    if (modalSpecBrand) modalSpecBrand.textContent = formatBrandName(p.marca);

    const modalSpecCategory = document.getElementById("modal-spec-category");
    if (modalSpecCategory) modalSpecCategory.textContent = p.categoria || "General";

    const modalCategoryBadge = document.getElementById("modal-desc-category");
    if (modalCategoryBadge) modalCategoryBadge.textContent = (p.categoria || "PRODUCTO").toUpperCase();

    // Setup Modal Trigger Handlers (Works with both Bootstrap 5 and CoreUI)
    const descModalEl = document.getElementById("descriptionModal");
    function openDescriptionModal() {
      if (!descModalEl) return;
      if (typeof coreui !== "undefined" && coreui.Modal) {
        const inst = coreui.Modal.getOrCreateInstance(descModalEl);
        inst.show();
      } else if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        const inst = bootstrap.Modal.getOrCreateInstance(descModalEl);
        inst.show();
      } else {
        descModalEl.classList.add("show");
        descModalEl.style.display = "block";
      }
    }

    const openDescLink = document.getElementById("btn-open-desc-link");
    if (openDescLink) {
      openDescLink.addEventListener("click", (e) => {
        e.preventDefault();
        openDescriptionModal();
      });
    }

    const verDetallesBtn = document.getElementById("btn-desc-ver-detalles");
    if (verDetallesBtn) {
      verDetallesBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openDescriptionModal();
      });
    }

    // Reveal Loaded Content
    if (loadingView) loadingView.classList.add("d-none");
    if (contentView) contentView.classList.remove("d-none");
    const mobileBar = document.getElementById("mobile-sticky-bar");
    if (mobileBar) mobileBar.classList.remove("d-none");

    // Setup Quantity & Order Event Listeners
    setupQuantityControls();
    setupOrderActions(p, currentPrice);
    setupShareButton(p);
  }

  // 4. Quantity Controls (+ / -) Syncing Desktop and Mobile
  function setupQuantityControls() {
    function updateQtyDisplays() {
      const desktopDisplay = document.getElementById("qty-value-desktop");
      const mobileDisplay = document.getElementById("qty-value-mobile");
      if (desktopDisplay) desktopDisplay.textContent = currentQuantity;
      if (mobileDisplay) mobileDisplay.textContent = currentQuantity;
    }

    function changeQty(delta) {
      const next = currentQuantity + delta;
      if (next >= 1 && next <= 99) {
        currentQuantity = next;
        updateQtyDisplays();
      }
    }

    document.getElementById("btn-qty-minus-desktop")?.addEventListener("click", () => changeQty(-1));
    document.getElementById("btn-qty-plus-desktop")?.addEventListener("click", () => changeQty(1));
    document.getElementById("btn-qty-minus-mobile")?.addEventListener("click", () => changeQty(-1));
    document.getElementById("btn-qty-plus-mobile")?.addEventListener("click", () => changeQty(1));
  }

  // 5. WhatsApp Order Generation
  function setupOrderActions(p, unitPrice) {
    function triggerWhatsAppOrder() {
      const total = unitPrice * currentQuantity;

      let msg = `¡Hola *nestt.*! 👋 Quiero pedir este producto de su tienda:\n\n`;
      msg += `📌 *Producto:* ${p.nombre}\n`;
      if (p.codigo) msg += `🔢 *Código:* ${p.codigo}\n`;
      msg += `🏷️ *Marca:* ${formatBrandName(p.marca)}\n`;
      msg += `💰 *Precio Unitario:* $${unitPrice.toFixed(2)} MXN\n`;
      msg += `📦 *Cantidad:* ${currentQuantity}\n`;
      msg += `💵 *Total Estimado:* $${total.toFixed(2)} MXN\n\n`;
      msg += `🔗 *Enlace:* ${window.location.href}\n\n`;
      msg += `¿Tienen disponibilidad para entrega? ¡Muchas gracias!`;

      const waUrl = `https://wa.me/${WHATSAPP_SELLER_PHONE}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, "_blank");
    }

    document.getElementById("btn-order-wa-desktop")?.addEventListener("click", triggerWhatsAppOrder);
    document.getElementById("btn-order-wa-mobile")?.addEventListener("click", triggerWhatsAppOrder);
    document.getElementById("modal-btn-order-wa")?.addEventListener("click", triggerWhatsAppOrder);
  }

  // 6. Share Functionality (Web Share API with Clipboard Fallback)
  function setupShareButton(p) {
    async function shareProduct() {
      const shareData = {
        title: `${p.nombre} | nestt.`,
        text: `Mira ${p.nombre} en nestt.:`,
        url: window.location.href
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (e) {
          if (e.name !== "AbortError") {
            copyToClipboard();
          }
        }
      } else {
        copyToClipboard();
      }
    }

    function copyToClipboard() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showToast();
        }).catch(() => {
          fallbackCopy();
        });
      } else {
        fallbackCopy();
      }
    }

    function fallbackCopy() {
      const dummy = document.createElement("input");
      document.body.appendChild(dummy);
      dummy.value = window.location.href;
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);
      showToast();
    }

    function showToast() {
      const toastEl = document.getElementById("shareToast");
      if (toastEl) {
        if (typeof coreui !== "undefined" && coreui.Toast) {
          const toast = coreui.Toast.getOrCreateInstance(toastEl);
          toast.show();
        } else if (typeof bootstrap !== "undefined" && bootstrap.Toast) {
          const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
          toast.show();
        } else {
          toastEl.classList.add("show");
          setTimeout(() => toastEl.classList.remove("show"), 3000);
        }
      }
    }

    document.getElementById("btn-share-product")?.addEventListener("click", shareProduct);
    document.getElementById("btn-share-desktop")?.addEventListener("click", shareProduct);
  }
});
