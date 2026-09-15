// Shopping Cart & WhatsApp Integration for Tienda Nesty (Hogar & Belleza)
const WHATSAPP_SELLER_PHONE = "525525000024";

class ShoppingCart {
  constructor() {
    this.cartKey = "nesty_cart";
    this.items = this.loadCart();
  }

  loadCart() {
    try {
      const data = localStorage.getItem(this.cartKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error loading cart:", e);
      return [];
    }
  }

  saveCart() {
    localStorage.setItem(this.cartKey, JSON.stringify(this.items));
    this.updateCartBadges();
  }

  addItem(product, variant = null) {
    const itemId = variant ? `${product.id}_${variant.id}` : product.id;
    const existingIndex = this.items.findIndex(item => item.cartItemId === itemId);

    const unitPrice = product.precio_oferta && product.precio_oferta < product.precio_regular 
      ? product.precio_oferta 
      : product.precio_regular;

    const deptName = (product.departamento || (product.marca === 'betterware' ? 'hogar' : 'belleza')).toUpperCase();

    if (existingIndex >= 0) {
      this.items[existingIndex].cantidad += 1;
    } else {
      this.items.push({
        cartItemId: itemId,
        productId: product.id,
        codigo: product.codigo,
        nombre: product.nombre,
        departamento: deptName,
        varianteNombre: variant ? variant.nombre : null,
        precioUnitario: unitPrice,
        foto: product.fotos && product.fotos.length > 0 ? product.fotos[0] : "",
        cantidad: 1
      });
    }

    this.saveCart();
    this.showToast(`¡${product.nombre} agregado al carrito!`);
  }

  updateQuantity(cartItemId, newQty) {
    if (newQty <= 0) {
      this.removeItem(cartItemId);
      return;
    }
    const item = this.items.find(i => i.cartItemId === cartItemId);
    if (item) {
      item.cantidad = newQty;
      this.saveCart();
    }
  }

  removeItem(cartItemId) {
    this.items = this.items.filter(i => i.cartItemId !== cartItemId);
    this.saveCart();
  }

  clearCart() {
    this.items = [];
    this.saveCart();
  }

  getTotalItems() {
    return this.items.reduce((sum, item) => sum + item.cantidad, 0);
  }

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.precioUnitario * item.cantidad), 0);
  }

  updateCartBadges() {
    const totalCount = this.getTotalItems();
    const badges = document.querySelectorAll(".cart-badge-count");
    badges.forEach(badge => {
      badge.textContent = totalCount;
      if (totalCount > 0) {
        badge.classList.remove("d-none");
      } else {
        badge.classList.add("d-none");
      }
    });
  }

  generateWhatsAppMessage(orderId, customerData, paymentMethod) {
    let msg = `🛍️ *¡NUEVO PEDIDO EN TIENDA NESTY!*\n`;
    msg += `📋 *Folio de Pedido:* #${orderId}\n`;
    msg += `------------------------------------\n`;
    msg += `👤 *Cliente:* ${customerData.nombre}\n`;
    msg += `📞 *Teléfono:* ${customerData.telefono}\n`;
    msg += `📍 *Dirección de Entrega:* ${customerData.direccion}\n`;
    if (customerData.referencias) {
      msg += `📝 *Referencias:* ${customerData.referencias}\n`;
    }
    msg += `💳 *Método de Pago:* ${paymentMethod.toUpperCase()}\n`;
    msg += `------------------------------------\n`;
    msg += `📦 *DETALLE DEL PEDIDO:*\n\n`;

    this.items.forEach((item, index) => {
      const sub = (item.precioUnitario * item.cantidad).toFixed(2);
      const variantStr = item.varianteNombre ? ` (${item.varianteNombre})` : '';
      const deptTag = item.departamento === 'HOGAR' ? '🏠 [Hogar]' : '✨ [Belleza]';
      msg += `${index + 1}. ${deptTag} *${item.nombre}*${variantStr}\n`;
      msg += `   • Cód: ${item.codigo} | Cant: ${item.cantidad} x $${item.precioUnitario.toFixed(2)} = *$${sub} MXN*\n\n`;
    });

    msg += `------------------------------------\n`;
    msg += `💰 *TOTAL A PAGAR: $${this.getSubtotal().toFixed(2)} MXN*\n`;
    msg += `------------------------------------\n`;
    msg += `Quedo atento(a) para confirmar la recepción y los datos de pago/entrega. ¡Muchas gracias!`;

    const encodedMsg = encodeURIComponent(msg);
    return `https://wa.me/${WHATSAPP_SELLER_PHONE}?text=${encodedMsg}`;
  }

  showToast(message) {
    let toastContainer = document.getElementById("nesty-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "nesty-toast-container";
      toastContainer.style.cssText = "position: fixed; bottom: 85px; right: 20px; z-index: 2000;";
      document.body.appendChild(toastContainer);
    }

    const toastEl = document.createElement("div");
    toastEl.className = "alert alert-dark text-white shadow border-0 rounded-3 py-2 px-3 mb-2 animate__animated animate__fadeInUp";
    toastEl.style.cssText = "background: #0f172a; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.85rem;";
    toastEl.innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> ${message}`;
    toastContainer.appendChild(toastEl);

    setTimeout(() => {
      toastEl.remove();
    }, 2500);
  }
}

window.cart = new ShoppingCart();
document.addEventListener("DOMContentLoaded", () => window.cart.updateCartBadges());
