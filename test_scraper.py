import urllib.request
import json

url = "https://esika.tiendabelcorp.com.mx/api/catalog_system/pub/products/search?_from=0&_to=19"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
}

req = urllib.request.Request(url, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print(f"Total productos obtenidos de VTEX API: {len(data)}")
        if len(data) > 0:
            first = data[0]
            print("Ejemplo Producto VTEX:")
            print("Nombre:", first.get('productName'))
            print("Código:", first.get('productReference'))
            print("Categorías:", first.get('categories'))
            items = first.get('items', [])
            if items:
                sellers = items[0].get('sellers', [])
                if sellers:
                    comm = sellers[0].get('commertialOffer', {})
                    print("Precio Lista:", comm.get('ListPrice'))
                    print("Precio Venta:", comm.get('Price'))
                images = items[0].get('images', [])
                if images:
                    print("Imagen URL:", images[0].get('imageUrl'))
except Exception as e:
    print("Error al consultar API:", e)
