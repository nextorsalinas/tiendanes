// Main Application Logic for Tienda Nesty (Tarjetas 100% Limpias sin ninguna etiqueta)
const WHATSAPP_SELLER_PHONE = "525525000024";

document.addEventListener("DOMContentLoaded", async () => {
  let allProducts = [];
  let currentCategory = null; // null => Visual Categories Showcase (Cyzone style home)
  let currentBrand = "lbel"; // Default active brand is L'Bel
  let currentView = "categories"; // 'categories' or 'products'
  let selectedProductForOrder = null;

  // 4 Official Brands Configuration (Centered, smaller, no "Todas")
  const BRANDS_CONFIG = [
    { id: "lbel", label: "L'Bel", logo: "images/brands/lbel.png" },
    { id: "esika", label: "Ésika", logo: "images/brands/esika.png" },
    { id: "cyzone", label: "Cyzone", logo: "images/brands/cyzone.png" },
    { id: "betterware", label: "Betterware", logo: "images/brands/betterware.webp" }
  ];

  const BRAND_LABELS = {
    cyzone: "Cyzone",
    esika: "Ésika",
    lbel: "L'Bel",
    betterware: "Betterware"
  };

  // Load products
  async function loadCatalog() {
    allProducts = await window.db.getProducts();
    // Guarantee fallback for brand on all items
    allProducts.forEach(p => {
      if (!p.marca || p.marca.trim() === '') {
        p.marca = 'betterware';
      } else {
        p.marca = p.marca.toLowerCase().trim();
      }
    });

    renderBrands();
    renderCategoriesShowcase();
    renderCategories();
    initCart();
    initHeaderSearch();
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

  // Brand Name Formatter
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

  // Smooth scroll offset helper to prevent sticky navbar from obscuring content
  function scrollToProductsView() {
    const target = document.getElementById("brand-nav-container") || document.getElementById("products-grid");
    if (target) {
      const yOffset = -75; // sticky purple header height + breathing room
      const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
  }

  // Auto-center active brand button in horizontal scroll
  function syncActiveBrandScroll() {
    setTimeout(() => {
      const brandContainer = document.getElementById("brand-nav-container");
      if (brandContainer) {
        const activeBtn = brandContainer.querySelector(`.brand-nav-btn[data-brand="${currentBrand}"]`);
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }
    }, 50);
  }

  // Render Brand Navigation Buttons (4 Logos Oficiales)
  function renderBrands() {
    const brandContainer = document.getElementById("brand-nav-container");
    if (!brandContainer) return;

    brandContainer.innerHTML = BRANDS_CONFIG.map(b => {
      const isSelected = currentBrand === b.id;
      return `
        <button type="button" class="brand-nav-btn ${isSelected ? 'active' : ''}" data-brand="${b.id}" title="${b.label}" aria-label="Ver marca ${b.label}" aria-pressed="${isSelected}">
          <img src="${b.logo}" alt="Logotipo ${b.label}" class="brand-logo-img">
        </button>
      `;
    }).join("");

    brandContainer.querySelectorAll(".brand-nav-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const selected = e.currentTarget.getAttribute("data-brand");
        if (currentBrand !== selected) {
          currentBrand = selected;
          renderBrands();
          renderCategories();
          if (currentView === "categories") {
            renderCategoriesShowcase();
          } else {
            // When in products view, switch to showcase of selected brand
            currentCategory = null;
            currentView = "categories";
            const showcaseEl = document.getElementById("view-categories-showcase");
            const catalogEl = document.getElementById("view-products-catalog");
            if (showcaseEl) showcaseEl.classList.remove("d-none");
            if (catalogEl) catalogEl.classList.add("d-none");
            renderCategoriesShowcase();
          }
          syncActiveBrandScroll();
        }
      });
    });
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
      { id: "all", label: "Todas las Categorías" },
      { id: "gift_200", label: "Regalos < $200" },
      { id: "gift_350", label: "Regalos < $350" },
      ...sortedNames.map(name => ({ id: name, label: name, rawKeys: Array.from(categoryMap.get(name)) }))
    ];
  }

  // Distinct visual categories for each of the 4 official brands (Inspirado en L'Bel / Belcorp Oficial)
  const BRAND_CATEGORIES_CONFIG = {
    lbel: [
      {
        id: "cuidado_piel",
        name: "Cuidado de la Piel",
        image: "https://lbel.vteximg.com.br/arquivos/categorie-cuidado-de-la-piel.jpg",
        matchKeys: ["skincare", "tecnología", "tratamiento facial", "cuidado de la piel", "tratamiento"]
      },
      {
        id: "fragancias",
        name: "Fragancias",
        image: "https://lbel.vteximg.com.br/arquivos/categorie-perfumes.jpg",
        matchKeys: ["perfumes", "fragancias"]
      },
      {
        id: "maquillaje",
        name: "Maquillaje",
        image: "https://lbel.vteximg.com.br/arquivos/categorie-maquillaje.jpg",
        matchKeys: ["maquillaje"]
      },
      {
        id: "cuidado_personal",
        name: "Cuidado personal",
        image: "https://lbel.vteximg.com.br/arquivos/categorie-cuidado-personal.jpg",
        matchKeys: ["cuidado personal", "cuidado corporal", "tratamiento", "capilar"]
      },
      {
        id: "sets",
        name: "Sets",
        image: "https://esika.vteximg.com.br/arquivos/top-regalos.jpg",
        matchKeys: ["sets"],
        customFilter: (p) => (p.categoria && p.categoria.toLowerCase() === 'sets') || /set|kit|duo|dúo|rutina|pack|estuche/i.test(p.nombre)
      }
    ],
    esika: [
      {
        id: "fragancias",
        name: "Fragancias",
        image: "https://esika.vteximg.com.br/arquivos/categorie-perfumes.jpg",
        matchKeys: ["perfumes", "fragancias"]
      },
      {
        id: "maquillaje",
        name: "Maquillaje",
        image: "https://esika.vteximg.com.br/arquivos/categorie-maquillaje.jpg",
        matchKeys: ["maquillaje"]
      },
      {
        id: "cuidado_piel",
        name: "Cuidado de la Piel",
        image: "https://esika.vteximg.com.br/arquivos/categorie-cuidado-de-la-piel.jpg",
        matchKeys: ["cuidado personal", "skincare", "cuidado de la piel"]
      },
      {
        id: "joyeria",
        name: "Joyería",
        image: "https://esika.vteximg.com.br/arquivos/categorie-joyeria.jpg",
        matchKeys: ["joyería"]
      }
    ],
    cyzone: [
      {
        id: "maquillaje",
        name: "Maquillaje",
        image: "https://cyzone.vteximg.com.br/arquivos/categorie-maquillaje.jpg",
        matchKeys: ["maquillaje"]
      },
      {
        id: "moda_y_accesorios",
        name: "Moda & Accesorios",
        image: "https://belcorpmexico.vteximg.com.br/arquivos/ids/1252996/21-0114646_cy_clean_gold_est_are_x3_fotofondoblanco.jpg.jpg?v=639226023269000000",
        matchKeys: ["moda y accesorios", "mochilas"]
      },
      {
        id: "perfumes",
        name: "Perfumes & Fragancias",
        image: "https://cyzone.vteximg.com.br/arquivos/categorie-perfumes.jpg",
        matchKeys: ["perfumes", "fragancias"]
      }
    ],
    betterware: [
      {
        id: "cocina",
        name: "Cocina & Mesa",
        image: "https://cdn.shopify.com/s/files/1/0853/3114/9100/files/24014-1-Gurmy-Nutri-Bowl-Betterware-1_a3aad0f7-0048-4475-984f-b3dd4cf25557.jpg?v=1789450268",
        matchKeys: ["cocina"]
      },
      {
        id: "hogar",
        name: "Organización & Hogar",
        image: "https://cdn.shopify.com/s/files/1/0853/3114/9100/files/26856-1-Infla-Jack-Betterware.jpg?v=1789450268",
        matchKeys: ["hogar"]
      },
      {
        id: "portatiles",
        name: "Portátiles & Viaje",
        image: "https://cdn.shopify.com/s/files/1/0853/3114/9100/files/26605-1-Porta-Basicos-Betterware.jpg?v=1787011088",
        matchKeys: ["contigo", "mochilas"]
      },
      {
        id: "bienestar",
        name: "Bienestar",
        image: "https://cdn.shopify.com/s/files/1/0853/3114/9100/files/23213-1-Bocina-Colors-Betterware_85eb5f44-b8f6-41ac-999f-9103c7ec160b.jpg?v=1787975767",
        matchKeys: ["bienestar"]
      },
      {
        id: "bano_recamara",
        name: "Baño & Recámara",
        image: "https://cdn.shopify.com/s/files/1/0853/3114/9100/files/26430-1-Jabonera-Jack-Betterware.jpg?v=1789450268",
        matchKeys: ["baño", "recamara"]
      },
      {
        id: "limpieza",
        name: "Limpieza",
        image: "https://cdn.shopify.com/s/files/1/0853/3114/9100/files/26699_E2_80_8B_20-1-Lava-Bra-Flex-Betterware.jpg?v=1789450268",
        matchKeys: ["limpieza"]
      }
    ]
  };

  // Render Visual Categories Showcase per Selected Brand
  function renderCategoriesShowcase() {
    const grid = document.getElementById("categories-visual-grid");
    const titleEl = document.getElementById("brand-categories-title");
    const subtitleEl = document.getElementById("brand-categories-subtitle");

    const brandKey = currentBrand || "lbel";
    const brandName = BRAND_LABELS[brandKey] || "L'Bel";

    if (titleEl) {
      titleEl.textContent = "Compra por categoría";
    }
    if (subtitleEl) {
      subtitleEl.textContent = `Colecciones exclusivas de ${brandName}`;
    }

    if (!grid) return;

    const brandCats = BRAND_CATEGORIES_CONFIG[brandKey] || [];
    const brandProds = allProducts.filter(p => p.activo !== false && (p.marca || "betterware").toLowerCase() === brandKey);

    grid.innerHTML = brandCats.map(cat => {
      let matching = [];
      if (cat.customFilter) {
        matching = brandProds.filter(cat.customFilter);
      } else {
        matching = brandProds.filter(p => {
          const pCat = (p.categoria || '').toLowerCase().trim();
          return cat.matchKeys && cat.matchKeys.includes(pCat);
        });
      }

      const count = matching.length;
      if (count === 0 && !cat.customFilter) return "";

      const sampleImg = cat.image || (matching[0] && matching[0].fotos && matching[0].fotos[0]) || "https://via.placeholder.com/400?text=Categoria";

      return `
        <div class="col">
          <div class="category-visual-card" onclick="window.selectCategoryDirect('${cat.id}')" title="Comprar ${cat.name}">
            <div class="category-visual-img-wrap">
              <img src="${sampleImg}" alt="${cat.name}" loading="lazy">
            </div>
            <div class="category-visual-body">
              <h6 class="category-visual-title">${cat.name}</h6>
              <span class="category-product-count">${count} producto${count === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Render quick horizontal category selector in products catalog view
  function renderQuickCategoryPills() {
    const container = document.getElementById("quick-category-pills");
    if (!container) return;

    const brandKey = currentBrand || "lbel";
    const brandName = BRAND_LABELS[brandKey] || "L'Bel";
    const brandCats = BRAND_CATEGORIES_CONFIG[brandKey] || [];

    const pills = [
      { id: "all", label: `✨ Todo ${brandName}` },
      ...brandCats.map(c => ({ id: c.id, label: c.name }))
    ];

    container.innerHTML = pills.map(p => {
      const isSelected = (currentCategory === p.id) || (currentCategory === "all" && p.id === "all");
      return `
        <button type="button" class="quick-cat-pill ${isSelected ? 'active' : ''}" onclick="window.selectCategoryDirect('${p.id}')">
          ${p.label}
        </button>
      `;
    }).join("");
  }

  // Render Offcanvas Drawer List (Categorías en Menú Hamburguesa)
  function renderCategories() {
    const brandKey = currentBrand || "lbel";
    const brandName = BRAND_LABELS[brandKey] || "L'Bel";
    const brandCats = BRAND_CATEGORIES_CONFIG[brandKey] || [];
    const brandProds = allProducts.filter(p => p.activo !== false && (p.marca || "betterware").toLowerCase() === brandKey);

    const offcanvasList = document.getElementById("offcanvas-categories-list");
    if (!offcanvasList) return;

    const countBadge = document.getElementById("offcanvas-count-badge");
    if (countBadge) {
      countBadge.textContent = `${brandProds.length} prods`;
    }

    const items = [
      { id: "all", label: `✨ Todo ${brandName}`, count: brandProds.length },
      { id: "gift_200", label: "🎁 Regalos < $200", count: brandProds.filter(p => ((p.precio_oferta && p.precio_oferta < p.precio_regular ? p.precio_oferta : p.precio_regular) <= 200)).length },
      { id: "gift_350", label: "🎀 Regalos < $350", count: brandProds.filter(p => ((p.precio_oferta && p.precio_oferta < p.precio_regular ? p.precio_oferta : p.precio_regular) <= 350)).length },
      ...brandCats.map(cat => {
        let cnt = 0;
        if (cat.customFilter) {
          cnt = brandProds.filter(cat.customFilter).length;
        } else {
          cnt = brandProds.filter(p => cat.matchKeys && cat.matchKeys.includes((p.categoria || '').toLowerCase().trim())).length;
        }
        return {
          id: cat.id,
          label: cat.name,
          count: cnt
        };
      })
    ];

    offcanvasList.innerHTML = items.map(cat => {
      const isSelected = currentCategory === cat.id;
      return `
        <button type="button" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-3 px-4 ${isSelected ? 'active-offcanvas-cat' : ''}" data-category="${cat.id}">
          <span class="d-flex align-items-center gap-2">
            ${cat.id.startsWith('gift_') ? '<span class="badge bg-warning text-dark me-1" style="font-size:0.65rem;">PROMO</span>' : ''}
            ${cat.label}
          </span>
          <span class="badge rounded-pill ${isSelected ? 'bg-primary text-white' : 'bg-light text-muted border'}">${cat.count}</span>
        </button>
      `;
    }).join("");

    offcanvasList.querySelectorAll("[data-category]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const cat = e.currentTarget.getAttribute("data-category");
        closeOffcanvas();
        window.selectCategoryDirect(cat);
      });
    });
  }

  // Render Product Grid con Proporciones Estilo Minimalista
  function renderProducts() {
    const grid = document.getElementById("products-grid");
    const countEl = document.getElementById("products-count-text");
    if (!grid) return;

    const brandKey = currentBrand || "lbel";
    const brandCats = BRAND_CATEGORIES_CONFIG[brandKey] || [];

    // 1. Filtro por Marca seleccionada
    let filtered = allProducts.filter(p => p.activo !== false && (p.marca || "betterware").toLowerCase() === brandKey);

    // 2. Filtro por Categoría
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
    } else if (currentCategory && currentCategory !== "all") {
      const catConfig = brandCats.find(c => c.id.toLowerCase() === currentCategory.toLowerCase());
      if (catConfig && catConfig.customFilter) {
        filtered = filtered.filter(catConfig.customFilter);
      } else if (catConfig && catConfig.matchKeys) {
        filtered = filtered.filter(p => {
          const pCat = (p.categoria || '').toLowerCase().trim();
          return catConfig.matchKeys.includes(pCat);
        });
      } else {
        filtered = filtered.filter(p => (p.categoria || '').toLowerCase().trim() === currentCategory.toLowerCase().trim());
      }
    }

    // Actualizar contador
    if (countEl) {
      countEl.textContent = `${filtered.length} producto${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="p-4 bg-white rounded-4 border text-center mx-auto" style="max-width: 420px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
            <i class="bi bi-box-seam text-muted fs-1 mb-2 d-block"></i>
            <h6 class="fw-bold text-dark mb-1">Sin productos disponibles</h6>
            <p class="text-muted small mb-3">No hay productos disponibles en esta categoría.</p>
            <button class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onclick="window.viewAllProducts()">Ver todo el catálogo</button>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const hasDiscount = p.precio_oferta && p.precio_oferta < p.precio_regular;
      const currentPrice = hasDiscount ? p.precio_oferta : p.precio_regular;
      const discountPercent = hasDiscount ? Math.round(((p.precio_regular - p.precio_oferta) / p.precio_regular) * 100) : 0;
      const mainImg = (p.fotos && p.fotos.length > 0) ? p.fotos[0] : "https://via.placeholder.com/400?text=Sin+Imagen";
      const productUrl = `producto.html?id=${encodeURIComponent(p.id)}`;

      return `
        <div class="col-6 col-md-4 col-lg-3">
          <div class="product-card-minimal">
            <a href="${productUrl}" class="product-card-img-container text-decoration-none" title="Ver ${p.nombre}">
              <img src="${mainImg}" alt="${p.nombre}" loading="lazy">
              ${hasDiscount ? `<span class="badge-shein-discount">-${discountPercent}%</span>` : ''}
            </a>
            <div class="product-card-content">
              <span class="product-brand-tag">${formatBrandName(p.marca)}</span>
              <a href="${productUrl}" class="product-name-minimal text-decoration-none" title="Ver ${p.nombre}">
                ${p.nombre}
              </a>
              <div class="price-row">
                <span class="price-main">$${currentPrice.toFixed(2)}</span>
                ${hasDiscount ? `<span class="price-old-strike">$${p.precio_regular.toFixed(2)}</span>` : ''}
              </div>
              <div class="d-flex gap-1 mt-2">
                <button type="button" class="btn-cart-add-card flex-grow-0" onclick="window.addToCart('${p.id}', 1, event)" title="Agregar al carrito" aria-label="Agregar ${p.nombre} al carrito">
                  <i class="bi bi-bag-plus fs-6"></i>
                </button>
                <a href="${productUrl}" class="btn-whatsapp-card flex-grow-1 text-decoration-none" aria-label="Ver y pedir ${p.nombre}">
                  <i class="bi bi-whatsapp"></i> <span>Pedir</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Window Global Navigation Methods
  window.selectCategoryDirect = (catId) => {
    currentCategory = catId;
    currentView = "products";

    const showcaseEl = document.getElementById("view-categories-showcase");
    const catalogEl = document.getElementById("view-products-catalog");
    if (showcaseEl) showcaseEl.classList.add("d-none");
    if (catalogEl) catalogEl.classList.remove("d-none");

    const titleEl = document.getElementById("current-category-title");
    const brandKey = currentBrand || "lbel";
    const brandName = BRAND_LABELS[brandKey] || "L'Bel";
    const brandCats = BRAND_CATEGORIES_CONFIG[brandKey] || [];

    if (titleEl) {
      if (catId === "gift_200") {
        titleEl.textContent = `Regalos < $200 (${brandName})`;
      } else if (catId === "gift_350") {
        titleEl.textContent = `Regalos < $350 (${brandName})`;
      } else if (catId === "all") {
        titleEl.textContent = `Catálogo ${brandName}`;
      } else {
        const catConfig = brandCats.find(c => c.id.toLowerCase() === catId.toLowerCase());
        titleEl.textContent = catConfig ? catConfig.name : formatCategoryName(catId);
      }
    }

    renderQuickCategoryPills();
    renderProducts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.backToCategories = () => {
    currentCategory = null;
    currentView = "categories";

    const showcaseEl = document.getElementById("view-categories-showcase");
    const catalogEl = document.getElementById("view-products-catalog");
    if (showcaseEl) showcaseEl.classList.remove("d-none");
    if (catalogEl) catalogEl.classList.add("d-none");

    renderCategoriesShowcase();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.viewAllProducts = () => {
    window.selectCategoryDirect("all");
  };


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

    let msg = `🛍️ *¡NUEVO PEDIDO EN nestt.!*\n`;
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

  // ==========================================
  // SHOPPING CART (Carrito de Compras Funcional)
  // ==========================================
  const CART_STORAGE_KEY = "nesty_cart";

  function getCart() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartBadges(cart);
  }

  function updateCartBadges(cart = getCart()) {
    const totalCount = cart.reduce((acc, item) => acc + (item.cantidad || 1), 0);
    const badgeEl = document.getElementById("header-cart-badge");
    const drawerCountEl = document.getElementById("cart-drawer-count");

    if (badgeEl) {
      badgeEl.textContent = totalCount;
      if (totalCount > 0) {
        badgeEl.classList.remove("d-none");
      } else {
        badgeEl.classList.add("d-none");
      }
    }

    if (drawerCountEl) {
      drawerCountEl.textContent = `${totalCount} ${totalCount === 1 ? 'artículo' : 'artículos'}`;
    }
  }

  window.addToCart = (productId, qty = 1, event = null) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const product = allProducts.find(p => (p.id || '').toString() === productId.toString());
    if (!product) return;

    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id.toString() === productId.toString());

    const hasDiscount = product.precio_oferta && product.precio_oferta < product.precio_regular;
    const price = hasDiscount ? product.precio_oferta : product.precio_regular;
    const photo = (product.fotos && product.fotos.length > 0) ? product.fotos[0] : '';

    if (existingIndex >= 0) {
      cart[existingIndex].cantidad = (cart[existingIndex].cantidad || 1) + qty;
    } else {
      cart.push({
        id: product.id,
        codigo: product.codigo || '',
        nombre: product.nombre,
        marca: product.marca || 'betterware',
        precio: price,
        precio_regular: product.precio_regular,
        foto: photo,
        cantidad: qty
      });
    }

    saveCart(cart);
    window.renderCart();

    // Feedback visual
    showCartToast(product.nombre);
  };

  window.updateCartQty = (productId, delta) => {
    const cart = getCart();
    const index = cart.findIndex(item => item.id.toString() === productId.toString());
    if (index >= 0) {
      cart[index].cantidad = (cart[index].cantidad || 1) + delta;
      if (cart[index].cantidad <= 0) {
        cart.splice(index, 1);
      }
      saveCart(cart);
      window.renderCart();
    }
  };

  window.removeFromCart = (productId) => {
    let cart = getCart();
    cart = cart.filter(item => item.id.toString() !== productId.toString());
    saveCart(cart);
    window.renderCart();
  };

  window.renderCart = () => {
    const listEl = document.getElementById("cart-items-list");
    const totalEl = document.getElementById("cart-total-amount");
    const footerEl = document.getElementById("cart-footer");
    if (!listEl) return;

    const cart = getCart();
    updateCartBadges(cart);

    if (cart.length === 0) {
      listEl.innerHTML = `
        <div class="text-center py-5 px-3">
          <div class="bg-white rounded-circle d-inline-flex align-items-center justify-content-center p-3 shadow-sm mb-3" style="width: 70px; height: 70px;">
            <i class="bi bi-bag-x fs-2 text-muted"></i>
          </div>
          <h6 class="fw-bold text-dark mb-1">Tu carrito está vacío</h6>
          <p class="text-muted small mb-4">Agrega tus productos favoritos de L'Bel, Ésika, Cyzone o Betterware.</p>
          <button type="button" class="btn btn-outline-primary rounded-pill px-4 btn-sm fw-bold" data-bs-dismiss="offcanvas" data-coreui-dismiss="offcanvas">
            Explorar Catálogo
          </button>
        </div>
      `;
      if (totalEl) totalEl.textContent = "$0.00 MXN";
      if (footerEl) footerEl.classList.add("opacity-50");
      return;
    }

    if (footerEl) footerEl.classList.remove("opacity-50");

    let grandTotal = 0;
    listEl.innerHTML = cart.map(item => {
      const itemTotal = (item.precio || 0) * (item.cantidad || 1);
      grandTotal += itemTotal;
      const thumb = item.foto || "https://via.placeholder.com/100?text=Producto";

      return `
        <div class="cart-item-row">
          <img src="${thumb}" alt="${item.nombre}" class="cart-item-thumb">
          <div class="cart-item-info">
            <span class="cart-item-brand">${formatBrandName(item.marca)}</span>
            <h6 class="cart-item-title" title="${item.nombre}">${item.nombre}</h6>
            <div class="d-flex align-items-center justify-content-between mt-1">
              <span class="cart-item-price">$${(item.precio || 0).toFixed(2)}</span>
              <div class="d-flex align-items-center gap-2">
                <div class="cart-qty-ctrl">
                  <button type="button" class="btn-cart-qty" onclick="window.updateCartQty('${item.id}', -1)" aria-label="Restar 1">-</button>
                  <span class="cart-qty-num">${item.cantidad || 1}</span>
                  <button type="button" class="btn-cart-qty" onclick="window.updateCartQty('${item.id}', 1)" aria-label="Sumar 1">+</button>
                </div>
                <button type="button" class="btn-cart-remove" onclick="window.removeFromCart('${item.id}')" title="Eliminar del carrito" aria-label="Eliminar ${item.nombre}">
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    if (totalEl) {
      totalEl.textContent = `$${grandTotal.toFixed(2)} MXN`;
    }
  };

  window.openCartDrawer = () => {
    window.renderCart();
    const drawerEl = document.getElementById("cartOffcanvas");
    if (drawerEl) {
      if (typeof bootstrap !== "undefined" && bootstrap.Offcanvas) {
        const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(drawerEl);
        bsOffcanvas.show();
      } else if (typeof coreui !== "undefined" && coreui.Offcanvas) {
        const cuiOffcanvas = coreui.Offcanvas.getOrCreateInstance(drawerEl);
        cuiOffcanvas.show();
      }
    }
  };

  function showCartToast(productName) {
    const toastEl = document.getElementById("cartToast");
    const toastText = document.getElementById("cartToastText");
    if (toastText) {
      toastText.innerHTML = `
        <i class="bi bi-check-circle-fill text-success fs-5"></i>
        <span class="text-truncate" style="max-width: 220px;">¡${productName} agregado!</span>
      `;
    }
    if (toastEl) {
      if (typeof bootstrap !== "undefined" && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, { delay: 2800 });
        toast.show();
      } else if (typeof coreui !== "undefined" && coreui.Toast) {
        const toast = new coreui.Toast(toastEl, { delay: 2800 });
        toast.show();
      } else {
        toastEl.classList.add("show");
        setTimeout(() => toastEl.classList.remove("show"), 2800);
      }
    }
  }

  window.checkoutCartWhatsApp = () => {
    const cart = getCart();
    if (!cart || cart.length === 0) {
      alert("Tu carrito está vacío. Agrega productos antes de realizar el pedido.");
      return;
    }

    let grandTotal = 0;
    let itemsText = "";

    cart.forEach(item => {
      const lineTotal = (item.precio || 0) * (item.cantidad || 1);
      grandTotal += lineTotal;
      const brand = formatBrandName(item.marca);
      itemsText += `• [${brand}] ${item.nombre} x${item.cantidad} ($${item.precio.toFixed(2)} c/u) = $${lineTotal.toFixed(2)}\n`;
    });

    const msg = `¡Hola! Me gustaría hacer un pedido en nestt:

🛒 *PRODUCTOS SOLICITADOS:*
${itemsText}
💰 *TOTAL ESTIMADO:* $${grandTotal.toFixed(2)} MXN

¿Me podrías confirmar disponibilidad de estos artículos y métodos de entrega? ¡Muchas gracias!`;

    const waUrl = `https://wa.me/${WHATSAPP_SELLER_PHONE}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  function initCart() {
    window.renderCart();
  }

  // ==========================================
  // HEADER SEARCH (Lupa y Barra de Búsqueda)
  // ==========================================
  let isSearchActive = false;

  function initHeaderSearch() {
    const btnSearch = document.getElementById("btn-header-search");
    const searchBar = document.getElementById("header-search-bar");
    const inputSearch = document.getElementById("input-search-header");
    const btnClear = document.getElementById("btn-clear-search");
    const btnClose = document.getElementById("btn-close-search");

    if (!btnSearch || !searchBar || !inputSearch) return;

    // Toggle search bar
    btnSearch.addEventListener("click", () => {
      const isHidden = searchBar.classList.contains("d-none");
      if (isHidden) {
        searchBar.classList.remove("d-none");
        inputSearch.focus();
      } else {
        closeSearch();
      }
    });

    // Close button
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        closeSearch();
      });
    }

    // Clear button
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        inputSearch.value = "";
        btnClear.style.display = "none";
        closeSearch();
      });
    }

    // Real-time search with input
    let searchTimeout = null;
    inputSearch.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (btnClear) {
        btnClear.style.display = val ? "inline-block" : "none";
      }

      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        executeSearch(val);
      }, 150);
    });

    // Esc key closes search
    inputSearch.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeSearch();
      }
    });
  }

  function executeSearch(query) {
    if (!query) {
      if (isSearchActive) {
        window.backToCategories();
        isSearchActive = false;
      }
      return;
    }

    isSearchActive = true;
    currentView = "products";

    const showcaseEl = document.getElementById("view-categories-showcase");
    const catalogEl = document.getElementById("view-products-catalog");
    if (showcaseEl) showcaseEl.classList.add("d-none");
    if (catalogEl) catalogEl.classList.remove("d-none");

    const titleEl = document.getElementById("current-category-title");
    if (titleEl) {
      titleEl.innerHTML = `<i class="bi bi-search me-1 text-primary"></i> Resultados: "<span class="text-primary">${query}</span>"`;
    }

    // Hide quick category pills during general search
    const pillsContainer = document.getElementById("quick-category-pills");
    if (pillsContainer) pillsContainer.innerHTML = "";

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results = allProducts.filter(p => {
      if (p.activo === false) return false;
      const searchable = [
        p.nombre || '',
        p.descripcion || '',
        p.categoria || '',
        p.marca || '',
        p.codigo || ''
      ].join(' ').toLowerCase();

      return terms.every(term => searchable.includes(term));
    });

    renderSearchResultsGrid(results, query);
  }

  function renderSearchResultsGrid(results, query) {
    const grid = document.getElementById("products-grid");
    const countBadge = document.getElementById("products-count-text");

    if (countBadge) {
      countBadge.textContent = `${results.length} producto${results.length === 1 ? '' : 's'}`;
    }

    if (!grid) return;

    if (results.length === 0) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-search text-muted opacity-50 display-3 d-block mb-3"></i>
          <h5 class="fw-bold text-dark">No se encontraron productos</h5>
          <p class="text-muted small mb-3">No hay artículos que coincidan con "<strong>${query}</strong>". Prueba con otra palabra clave como <em>perfume, labial, stitch, mochila</em>.</p>
          <button type="button" class="btn btn-outline-primary rounded-pill px-4 btn-sm fw-bold" onclick="window.backToCategories()">
            Volver a Categorías
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = results.map(p => {
      const hasDiscount = p.precio_oferta && p.precio_oferta < p.precio_regular;
      const currentPrice = hasDiscount ? p.precio_oferta : p.precio_regular;
      const discountPercent = hasDiscount ? Math.round(((p.precio_regular - p.precio_oferta) / p.precio_regular) * 100) : 0;
      const mainImg = (p.fotos && p.fotos.length > 0) ? p.fotos[0] : "https://via.placeholder.com/400?text=Sin+Imagen";
      const productUrl = `producto.html?id=${encodeURIComponent(p.id)}`;

      return `
        <div class="col-6 col-md-4 col-lg-3">
          <div class="product-card-minimal">
            <a href="${productUrl}" class="product-card-img-container text-decoration-none" title="Ver ${p.nombre}">
              <img src="${mainImg}" alt="${p.nombre}" loading="lazy">
              ${hasDiscount ? `<span class="badge-shein-discount">-${discountPercent}%</span>` : ''}
            </a>
            <div class="product-card-content">
              <span class="product-brand-tag">${formatBrandName(p.marca)}</span>
              <a href="${productUrl}" class="product-name-minimal text-decoration-none" title="Ver ${p.nombre}">
                ${p.nombre}
              </a>
              <div class="price-row">
                <span class="price-main">$${currentPrice.toFixed(2)}</span>
                ${hasDiscount ? `<span class="price-old-strike">$${p.precio_regular.toFixed(2)}</span>` : ''}
              </div>
              <div class="d-flex gap-1 mt-2">
                <button type="button" class="btn-cart-add-card flex-grow-0" onclick="window.addToCart('${p.id}', 1, event)" title="Agregar al carrito" aria-label="Agregar ${p.nombre} al carrito">
                  <i class="bi bi-bag-plus fs-6"></i>
                </button>
                <a href="${productUrl}" class="btn-whatsapp-card flex-grow-1 text-decoration-none" aria-label="Ver y pedir ${p.nombre}">
                  <i class="bi bi-whatsapp"></i> <span>Pedir</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function closeSearch() {
    const searchBar = document.getElementById("header-search-bar");
    const inputSearch = document.getElementById("input-search-header");
    const btnClear = document.getElementById("btn-clear-search");

    if (searchBar) searchBar.classList.add("d-none");
    if (inputSearch) inputSearch.value = "";
    if (btnClear) btnClear.style.display = "none";

    if (isSearchActive) {
      isSearchActive = false;
      window.backToCategories();
    }
  }

  // Init
  await loadCatalog();
});
