import urllib.request
import json
import ssl
import re
import os

def clean_html(text):
    if not text:
        return ""
    clean = re.sub(r'<[^>]+>', ' ', text)
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()

def scrape_esika_catalog(max_products=100):
    print(f"--- Iniciando Scraper de Ésika Belcorp México (hasta {max_products} productos) ---")
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }

    products_list = []
    page_size = 49
    current_from = 0

    while len(products_list) < max_products:
        current_to = current_from + page_size
        url = f"https://esika.tiendabelcorp.com.mx/api/catalog_system/pub/products/search?_from={current_from}&_to={current_to}"
        print(f"Descargando rango [{current_from} - {current_to}] desde VTEX API...")

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                raw_data = resp.read().decode('utf-8')
                data = json.loads(raw_data)

                if not data or len(data) == 0:
                    print("No se encontraron más productos.")
                    break

                for p in data:
                    product_id = p.get('productId')
                    name = p.get('productName', '')
                    code = p.get('productReference') or f"ESK-{product_id}"
                    desc = clean_html(p.get('description', ''))

                    # Parse categories
                    cats = p.get('categories', [])
                    cat_name = "Belleza"
                    if cats and len(cats) > 0:
                        raw_cat = cats[0].strip('/')
                        parts = raw_cat.split('/')
                        cat_name = parts[-1].capitalize() if parts else "Belleza"

                    # Parse prices & images from items
                    items = p.get('items', [])
                    precio_regular = 0.0
                    precio_oferta = 0.0
                    fotos = []
                    variantes = []

                    if items:
                        for idx, item in enumerate(items):
                            v_name = item.get('name', '')
                            v_id = item.get('itemId')
                            v_sku = item.get('referenceId', [{}])[0].get('Value', code) if item.get('referenceId') else code
                            if len(items) > 1:
                                variantes.append({
                                    "id": f"v_{v_id}",
                                    "nombre": v_name,
                                    "sku": v_sku
                                })

                            imgs = item.get('images', [])
                            for img in imgs:
                                img_url = img.get('imageUrl')
                                if img_url and img_url not in fotos:
                                    fotos.append(img_url)

                            sellers = item.get('sellers', [])
                            if sellers and precio_regular == 0.0:
                                offer = sellers[0].get('commertialOffer', {})
                                precio_regular = float(offer.get('ListPrice', 0.0))
                                precio_oferta = float(offer.get('Price', 0.0))

                    if precio_regular == 0.0:
                        precio_regular = precio_oferta

                    has_offer = precio_oferta > 0 and precio_oferta < precio_regular

                    product_obj = {
                        "id": f"es_{product_id}",
                        "codigo": code,
                        "nombre": name,
                        "departamento": "belleza",
                        "marca": "esika",
                        "categoria": cat_name,
                        "precio_regular": round(precio_regular, 2),
                        "precio_oferta": round(precio_oferta, 2) if has_offer else None,
                        "es_oferta": has_offer,
                        "fotos": fotos[:4],
                        "descripcion": desc[:250] if desc else "Producto original de Ésika Belcorp.",
                        "stock": 20,
                        "activo": True,
                        "variantes": variantes
                    }

                    products_list.append(product_obj)

                current_from += page_size + 1

        except Exception as e:
            print(f"Error procesando lote [{current_from}]: {e}")
            break

    # Save to public/esika_catalog.json
    output_path = os.path.join("public", "esika_catalog.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(products_list, f, ensure_ascii=False, indent=2)

    print(f"\n¡Éxito! Se guardaron {len(products_list)} productos de Ésika en '{output_path}'")
    return products_list

if __name__ == "__main__":
    scrape_esika_catalog(100)
