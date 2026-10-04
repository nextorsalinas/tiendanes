// Logic for System Configuration & Data Tools (configuracion.html) | nestt. ADMIN
document.addEventListener("DOMContentLoaded", async () => {
  let productsList = [];

  const jsonTextarea = document.getElementById("config-bulk-json-input");
  const btnReloadJson = document.getElementById("btn-reload-json");
  const btnDownloadJson = document.getElementById("btn-download-json");
  const btnGitSync = document.getElementById("btn-git-sync");
  const btnClearCatalog = document.getElementById("btn-clear-catalog-danger");
  const bulkForm = document.getElementById("configBulkJsonForm");
  const btnSaveJson = document.getElementById("btn-save-json-changes");

  async function loadConfigData() {
    try {
      productsList = await window.db.getProducts();
      populateJsonTextarea();
    } catch (e) {
      console.error("Error al cargar productos en configuración:", e);
    }
  }

  function populateJsonTextarea() {
    if (jsonTextarea) {
      jsonTextarea.value = JSON.stringify(productsList, null, 2);
    }
  }

  // 1. Reload JSON button
  if (btnReloadJson) {
    btnReloadJson.addEventListener("click", async () => {
      btnReloadJson.disabled = true;
      btnReloadJson.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Cargando...';
      await loadConfigData();
      btnReloadJson.disabled = false;
      btnReloadJson.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Recargar';
    });
  }

  // 2. Download JSON button
  if (btnDownloadJson) {
    btnDownloadJson.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(productsList, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `nestt_catalogo_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // 3. Git Sync Handler
  if (btnGitSync) {
    btnGitSync.addEventListener("click", async () => {
      btnGitSync.disabled = true;
      btnGitSync.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Sincronizando Git...';

      try {
        const res = await window.db.syncWithGit("Actualización desde panel de configuración");
        if (res && res.success) {
          alert("✅ ¡Repositorio sincronizado!\n\n" + (res.commit || "Archivos confirmados en Git.") + (res.pushed ? "\n\nSe subieron los cambios a GitHub (push completado)." : ""));
        } else {
          alert("ℹ️ Estado Git: " + (res.error || "No se detectaron cambios pendientes o estás en el entorno en la nube."));
        }
      } catch (err) {
        alert("Error al sincronizar con Git: " + err.message);
      } finally {
        btnGitSync.disabled = false;
        btnGitSync.innerHTML = '<i class="bi bi-git me-1"></i> Sincronizar Repositorio (Git)';
      }
    });
  }

  // 4. Bulk JSON Edit Form Submit
  if (bulkForm) {
    bulkForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rawText = jsonTextarea.value.trim();

      try {
        const parsed = JSON.parse(rawText);
        if (!Array.isArray(parsed)) {
          alert("El contenido JSON debe ser un arreglo de productos: [ { ... }, { ... } ]");
          return;
        }

        if (btnSaveJson) {
          btnSaveJson.disabled = true;
          btnSaveJson.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando en Firestore...';
        }

        const totalSaved = await window.db.bulkImportProducts(parsed);
        alert(`¡Catálogo actualizado con éxito! Se guardaron ${totalSaved} productos.`);
        await loadConfigData();
      } catch (err) {
        alert("Error al procesar el archivo JSON. Verifica que la sintaxis sea válida:\n" + err.message);
      } finally {
        if (btnSaveJson) {
          btnSaveJson.disabled = false;
          btnSaveJson.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Guardar y Aplicar Cambios';
        }
      }
    });
  }

  // 5. Clear Catalog Danger Button
  if (btnClearCatalog) {
    btnClearCatalog.addEventListener("click", async () => {
      const confirmText = prompt('⚠️ ACCIÓN DESTRUCTIVA:\nPara vaciar todos los productos del catálogo, escribe "ELIMINAR" a continuación:');
      if (confirmText === "ELIMINAR") {
        await window.db.bulkImportProducts([]);
        alert("El catálogo ha sido vaciado.");
        await loadConfigData();
      }
    });
  }

  // Initial Load
  await loadConfigData();
});
