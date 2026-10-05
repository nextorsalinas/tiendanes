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

    // Guarantee all brands exist in catalog even if browser has partial cache
    if (typeof INITIAL_PRODUCTS !== "undefined" && Array.isArray(INITIAL_PRODUCTS)) {
      const existingCodes = new Set(allProducts.map(p => (p.codigo || p.id || '').toString()));
      INITIAL_PRODUCTS.forEach(p => {
        const key = (p.codigo || p.id || '').toString();
        if (!existingCodes.has(key)) {
          const item = { ...p };
          item.marca = (item.marca || 'betterware').toLowerCase().trim();
          allProducts.push(item);
          existingCodes.add(key);
        }
      });
    }

    renderBrands();
    renderCategoriesShowcase();
    renderCategories();
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
        matchKeys: ["skincare", "tecnología", "tratamiento facial", "cuidado de la piel"]
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
        matchKeys: ["cuidado personal", "cuidado corporal"]
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
              <a href="${productUrl}" class="btn-whatsapp-card text-decoration-none" aria-label="Ver y pedir ${p.nombre}">
                <i class="bi bi-whatsapp"></i> <span>Pedir por WhatsApp</span>
              </a>
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
