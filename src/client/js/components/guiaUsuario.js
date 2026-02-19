/**
 * Guía de Usuario View
 * In-app visual user guide with real screenshots
 */

export class GuiaUsuarioView {
  constructor(container) {
    this.container = container;
    this.activeSection = null;
  }

  async render() {
    this.container.innerHTML = this.template();
    this.bindEvents();
    // Scroll to section if hash has anchor
    const anchor = window.location.hash.split("?section=")[1];
    if (anchor) {
      const el = document.getElementById(`guide-${anchor}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  template() {
    return `
      <div class="guide-view">
        <div class="guide-header">
          <div class="guide-header-info">
            <h1 class="guide-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
                <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
              </svg>
              Guía de Usuario
            </h1>
            <p class="guide-subtitle">Todo lo que necesitas para gestionar tus expedientes jurídicos</p>
          </div>
        </div>

        <div class="guide-layout">
          <!-- Table of Contents -->
          <nav class="guide-toc">
            <div class="guide-toc-title">Contenido</div>
            <a href="#" class="guide-toc-link active" data-section="inicio">
              <span class="guide-toc-number">1</span>
              Vista General
            </a>
            <a href="#" class="guide-toc-link" data-section="expedientes">
              <span class="guide-toc-number">2</span>
              Expedientes
            </a>
            <a href="#" class="guide-toc-link" data-section="crear-expediente">
              <span class="guide-toc-number">3</span>
              Crear Expediente
            </a>
            <a href="#" class="guide-toc-link" data-section="facturacion">
              <span class="guide-toc-number">4</span>
              Facturación ARAG
            </a>
            <a href="#" class="guide-toc-link" data-section="particulares">
              <span class="guide-toc-number">5</span>
              Particulares
            </a>
            <a href="#" class="guide-toc-link" data-section="turno">
              <span class="guide-toc-number">6</span>
              Turno de Oficio
            </a>
            <a href="#" class="guide-toc-link" data-section="estadisticas">
              <span class="guide-toc-number">7</span>
              Estadísticas
            </a>
            <a href="#" class="guide-toc-link" data-section="configuracion">
              <span class="guide-toc-number">8</span>
              Configuración
            </a>
          </nav>

          <!-- Guide Content -->
          <div class="guide-content">

            <!-- Section 1: Vista General (Dashboard) -->
            <section class="guide-section" id="guide-inicio">
              <div class="guide-section-header">
                <span class="guide-section-number">1</span>
                <div>
                  <h2 class="guide-section-title">Vista General — Dashboard</h2>
                  <p class="guide-section-desc">La pantalla principal muestra un resumen de todos tus expedientes.</p>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/dashboard.png" alt="Dashboard - Panel de control" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:20%;left:22%">A</span>
                  <span class="guide-overlay-badge" style="top:55%;left:55%">B</span>
                  <span class="guide-overlay-badge" style="top:5%;left:94%">C</span>
                </div>
                <div class="guide-screenshot-caption">Dashboard: vista general con métricas y expedientes recientes</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">A</span>
                  <div class="guide-step-content">
                    <strong>Métricas rápidas</strong> — En la parte superior verás cuatro tarjetas: Entradas del Mes, Archivados del Mes, Pendientes y Ratio de Cierre.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">B</span>
                  <div class="guide-step-content">
                    <strong>Tabla de expedientes recientes</strong> — Muestra los expedientes más recientes con su tipo, referencia, cliente y estado. Haz clic en cualquier fila para ver los detalles.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">C</span>
                  <div class="guide-step-content">
                    <strong>Nuevo Expediente</strong> — El botón en la esquina superior derecha te lleva directamente al formulario de creación.
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 2: Expedientes -->
            <section class="guide-section" id="guide-expedientes">
              <div class="guide-section-header">
                <span class="guide-section-number">2</span>
                <div>
                  <h2 class="guide-section-title">Expedientes</h2>
                  <p class="guide-section-desc">Lista completa de todos los expedientes del despacho.</p>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/expedientes.png" alt="Lista de expedientes" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:13%;left:18%">1</span>
                  <span class="guide-overlay-badge" style="top:13%;left:88%">2</span>
                  <span class="guide-overlay-badge" style="top:19%;left:22%">3</span>
                  <span class="guide-overlay-badge" style="top:28%;left:50%">4</span>
                </div>
                <div class="guide-screenshot-caption">Lista de expedientes con filtros por tipo y buscador</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">1</span>
                  <div class="guide-step-content">
                    <strong>Filtrar por tipo</strong> — Usa las pestañas <span class="guide-badge guide-badge-arag">ARAG</span> <span class="guide-badge guide-badge-particular">Particulares</span> <span class="guide-badge guide-badge-turno">Turno Oficio</span> para ver solo un tipo de expediente.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">2</span>
                  <div class="guide-step-content">
                    <strong>Buscar</strong> — Escribe el nombre del cliente o la referencia en el campo de búsqueda para encontrar un expediente rápidamente.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">3</span>
                  <div class="guide-step-content">
                    <strong>Ordenar columnas</strong> — Haz clic en los encabezados de columna (Ref. Interna, Cliente, Entrada) para ordenar la tabla.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">4</span>
                  <div class="guide-step-content">
                    <strong>Ver detalle</strong> — Haz clic en cualquier fila para abrir la ficha completa del expediente.
                  </div>
                </div>
              </div>

              <div class="guide-info-box">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <strong>Estados de un expediente</strong><br/>
                  <span class="guide-status guide-status-open">Abierto</span> — Expediente activo en tramitación<br/>
                  <span class="guide-status guide-status-judicial">Judicial</span> — Expediente en fase judicial (solo ARAG)<br/>
                  <span class="guide-status guide-status-archived">Archivado</span> — Expediente cerrado (solo lectura)
                </div>
              </div>
            </section>

            <!-- Section 3: Crear Expediente -->
            <section class="guide-section" id="guide-crear-expediente">
              <div class="guide-section-header">
                <span class="guide-section-number">3</span>
                <div>
                  <h2 class="guide-section-title">Crear un Nuevo Expediente</h2>
                  <p class="guide-section-desc">Cómo dar de alta un nuevo expediente según su tipo.</p>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/crear-expediente.png" alt="Formulario de nuevo expediente" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:28%;left:40%">1</span>
                  <span class="guide-overlay-badge" style="top:43%;left:42%">2</span>
                  <span class="guide-overlay-badge" style="top:55%;left:55%">3</span>
                  <span class="guide-overlay-badge" style="top:91%;left:50%">4</span>
                </div>
                <div class="guide-screenshot-caption">Formulario de creación de expediente</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">1</span>
                  <div class="guide-step-content">
                    <strong>Selecciona el tipo</strong> — Elige entre ARAG, Particular o Turno de Oficio. Los campos del formulario cambian según el tipo.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">2</span>
                  <div class="guide-step-content">
                    <strong>Datos del cliente</strong> — Nombre del cliente (obligatorio), fecha de entrada e idioma del cliente.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">3</span>
                  <div class="guide-step-content">
                    <strong>Referencias</strong><br/>
                    &bull; <span class="guide-badge guide-badge-arag">ARAG</span>: Introduce la referencia ARAG (formato DJ00XXXXXX). La referencia interna IY se genera automáticamente.<br/>
                    &bull; <span class="guide-badge guide-badge-particular">Particular</span>: La referencia IY-AA-NNN se genera automáticamente.<br/>
                    &bull; <span class="guide-badge guide-badge-turno">Turno de Oficio</span>: Introduce el número de designación.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">4</span>
                  <div class="guide-step-content">
                    <strong>Guardar</strong> — Pulsa el botón "Crear Expediente" para guardarlo.
                  </div>
                </div>
              </div>

              <div class="guide-info-box guide-info-box-warning">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <strong>Importante</strong><br/>
                  Las referencias nunca se reutilizan, ni siquiera si se elimina un expediente. La referencia ARAG (DJ00...) debe ser única.
                </div>
              </div>
            </section>

            <!-- Section 4: Facturación ARAG -->
            <section class="guide-section" id="guide-facturacion">
              <div class="guide-section-header">
                <span class="guide-section-number">4</span>
                <div>
                  <h2 class="guide-section-title">Facturación ARAG</h2>
                  <p class="guide-section-desc">Genera minutas y suplidos para los expedientes ARAG y envíalos por email.</p>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <img src="images/guide/facturacion-lista.png" alt="Lista de facturación ARAG" class="guide-screenshot" loading="lazy" />
                <div class="guide-screenshot-caption">Lista de expedientes ARAG pendientes de facturación</div>
              </div>

              <div class="guide-callout">
                <div class="guide-callout-title">Flujo de facturación</div>
                <div class="guide-flow">
                  <div class="guide-flow-step">
                    <div class="guide-flow-icon">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                    </div>
                    <span>Generar PDF</span>
                  </div>
                  <div class="guide-flow-arrow">→</div>
                  <div class="guide-flow-step">
                    <div class="guide-flow-icon">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
                    </div>
                    <span>Firmar</span>
                  </div>
                  <div class="guide-flow-arrow">→</div>
                  <div class="guide-flow-step">
                    <div class="guide-flow-icon">
                      <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                    </div>
                    <span>Enviar email</span>
                  </div>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/facturacion-detalle.png" alt="Detalle de facturación ARAG" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:37%;left:42%">1</span>
                  <span class="guide-overlay-badge" style="top:68%;left:45%">2</span>
                  <span class="guide-overlay-badge" style="top:20%;left:78%">3</span>
                  <span class="guide-overlay-badge" style="top:35%;left:78%">4</span>
                </div>
                <div class="guide-screenshot-caption">Detalle de un expediente ARAG con historial de documentos</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">1</span>
                  <div class="guide-step-content">
                    <strong>Generar Minuta</strong> — Pulsa "Generar y Enviar" para crear el PDF de la factura, firmarlo y enviarlo por email. El importe es siempre 203€ + 21% IVA = 245,63€.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">2</span>
                  <div class="guide-step-content">
                    <strong>Generar Suplido</strong> — Solo disponible cuando el expediente está en estado <span class="guide-status guide-status-judicial">Judicial</span>. Selecciona el partido judicial y se calculará el importe de desplazamiento automáticamente.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">3</span>
                  <div class="guide-step-content">
                    <strong>Historial</strong> — En el panel derecho verás el historial completo: documentos generados y emails enviados con su estado.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">4</span>
                  <div class="guide-step-content">
                    <strong>Reintentar email</strong> — Si un email falló, verás un botón "Reintentar" junto al registro para volver a enviarlo.
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 5: Particulares -->
            <section class="guide-section" id="guide-particulares">
              <div class="guide-section-header">
                <span class="guide-section-number">5</span>
                <div>
                  <h2 class="guide-section-title">Particulares — Hoja de Encargo</h2>
                  <p class="guide-section-desc">Gestiona las hojas de encargo de los clientes particulares.</p>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/particulares.png" alt="Vista de Particulares" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:30%;left:5%">1</span>
                  <span class="guide-overlay-badge" style="top:55%;left:96%">2</span>
                </div>
                <div class="guide-screenshot-caption">Lista de expedientes de clientes particulares</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">1</span>
                  <div class="guide-step-content">
                    <strong>Filtrar y buscar</strong> — Usa las pestañas (Todos, Abiertos, Judicial, Archivados) y el buscador para localizar un expediente.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">2</span>
                  <div class="guide-step-content">
                    <strong>Columna HdE</strong> — Indica si el expediente ya tiene una Hoja de Encargo generada. Haz clic en la fila para acceder al detalle.
                  </div>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/particulares-hoja-de-encargo.png" alt="Detalle de Hoja de Encargo" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:35%;left:35%">1</span>
                  <span class="guide-overlay-badge" style="top:88%;left:32%">2</span>
                  <span class="guide-overlay-badge" style="top:60%;left:52%">3</span>
                  <span class="guide-overlay-badge" style="top:18%;left:82%">4</span>
                </div>
                <div class="guide-screenshot-caption">Detalle de un expediente particular con Hoja de Encargo</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">1</span>
                  <div class="guide-step-content">
                    <strong>Datos de la Hoja de Encargo</strong> — Rellena los servicios contratados, honorarios base, provisión de fondos e IVA. El total se calcula automáticamente.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">2</span>
                  <div class="guide-step-content">
                    <strong>Generar y Enviar</strong> — Pulsa "Generar y Enviar" para crear el PDF, firmarlo digitalmente y enviarlo por email al cliente en un solo paso.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">3</span>
                  <div class="guide-step-content">
                    <strong>Estado del documento</strong> — El panel derecho muestra el progreso: Generado → Firmado → Enviado. Cada paso se marca automáticamente.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">4</span>
                  <div class="guide-step-content">
                    <strong>Historial</strong> — En la columna derecha verás el historial completo con las acciones realizadas sobre el expediente y sus documentos.
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 6: Turno de Oficio -->
            <section class="guide-section" id="guide-turno">
              <div class="guide-section-header">
                <span class="guide-section-number">6</span>
                <div>
                  <h2 class="guide-section-title">Turno de Oficio</h2>
                  <p class="guide-section-desc">Expedientes de defensa de oficio asignados por el juzgado.</p>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/turno-oficio.png" alt="Vista de Turno de Oficio" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:34%;left:7%">1</span>
                  <span class="guide-overlay-badge" style="top:70%;left:20%">2</span>
                </div>
                <div class="guide-screenshot-caption">Lista de expedientes de turno de oficio agrupados por estado</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">1</span>
                  <div class="guide-step-content">
                    <strong>Filtrar por estado</strong> — Usa las pestañas (Todos, Abiertos, Finalizados, Archivados) para ver los expedientes según su fase. Cada pestaña muestra el número de casos.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">2</span>
                  <div class="guide-step-content">
                    <strong>Tarjetas de expediente</strong> — Cada tarjeta muestra la referencia, designación, fecha y estado. Pulsa "Gestionar →" para abrir el detalle.
                  </div>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/turno-de-oficio.png" alt="Detalle de expediente Turno de Oficio" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:20%;left:20%">1</span>
                  <span class="guide-overlay-badge" style="top:18%;left:45%">2</span>
                  <span class="guide-overlay-badge" style="top:44%;left:35%">3</span>
                  <span class="guide-overlay-badge" style="top:68%;left:20%">4</span>
                </div>
                <div class="guide-screenshot-caption">Detalle de un expediente de turno de oficio</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">1</span>
                  <div class="guide-step-content">
                    <strong>Datos del justiciable</strong> — Referencia interna, nombre, fecha de entrada y designación del turno de oficio.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">2</span>
                  <div class="guide-step-content">
                    <strong>Observaciones y notas</strong> — Campo de texto con autoguardado para anotar detalles del procedimiento, juzgado asignado, etc.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">3</span>
                  <div class="guide-step-content">
                    <strong>Documentos y envíos</strong> — Las pestañas "Histórico Documentos" e "Histórico Envíos" muestran los archivos subidos y los correos enviados.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">4</span>
                  <div class="guide-step-content">
                    <strong>Estado y cierre</strong> — En la parte inferior izquierda se muestra el estado actual y la fecha de cierre. Si el expediente está abierto, verás el botón "Marcar como Finalizado". Pulsa "Imprimir" en la parte superior derecha para generar una copia impresa.
                  </div>
                </div>
              </div>

              <div class="guide-info-box">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <div>
                  Los expedientes de Turno de Oficio no generan facturas. Solo se gestionan documentos y el estado del caso.
                </div>
              </div>
            </section>

            <!-- Section 7: Estadísticas -->
            <section class="guide-section" id="guide-estadisticas">
              <div class="guide-section-header">
                <span class="guide-section-number">7</span>
                <div>
                  <h2 class="guide-section-title">Estadísticas</h2>
                  <p class="guide-section-desc">Visualiza la actividad del despacho con gráficos y métricas.</p>
                </div>
              </div>

              <div class="guide-screenshot-container">
                <div class="guide-screenshot-wrapper">
                  <img src="images/guide/estadisticas.png" alt="Estadísticas" class="guide-screenshot" loading="lazy" />
                  <span class="guide-overlay-badge" style="top:3%;left:76%">1</span>
                  <span class="guide-overlay-badge" style="top:3%;left:84%">2</span>
                  <span class="guide-overlay-badge" style="top:14%;left:35%">3</span>
                  <span class="guide-overlay-badge" style="top:40%;left:30%">4</span>
                </div>
                <div class="guide-screenshot-caption">Panel de estadísticas con gráficos de actividad</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">1</span>
                  <div class="guide-step-content">
                    <strong>Seleccionar año</strong> — Usa el selector de año para ver estadísticas de períodos anteriores.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">2</span>
                  <div class="guide-step-content">
                    <strong>Filtrar por tipo</strong> — Filtra las estadísticas por tipo de expediente (ARAG, Particular, Turno de Oficio o todos).
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">3</span>
                  <div class="guide-step-content">
                    <strong>Métricas clave</strong> — Tarjetas con los totales del año: Expedientes Nuevos, Expedientes Archivados, Expedientes Pendientes y Media Mensual.
                  </div>
                </div>
                <div class="guide-step">
                  <span class="guide-step-badge">4</span>
                  <div class="guide-step-content">
                    <strong>Gráfico mensual</strong> — El gráfico de barras muestra la actividad mes a mes. Pasa el ratón sobre una barra para ver el detalle.
                  </div>
                </div>
              </div>
            </section>

            <!-- Section 8: Configuración -->
            <section class="guide-section" id="guide-configuracion">
              <div class="guide-section-header">
                <span class="guide-section-number">8</span>
                <div>
                  <h2 class="guide-section-title">Configuración</h2>
                  <p class="guide-section-desc">Ajustes del sistema: email, certificado digital, tarifas y copias de seguridad.</p>
                </div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge guide-step-badge-indigo">Tarifas</span>
                  <div class="guide-step-content">
                    <strong>Configuración ARAG</strong> — Tarifa base (203€), porcentaje de IVA (21%) y la dirección de email donde se envían las minutas y suplidos.
                  </div>
                </div>
              </div>
              <div class="guide-screenshot-container">
                <img src="images/guide/configuracion-tarifa-base.png" alt="Configuración ARAG" class="guide-screenshot" loading="lazy" />
                <div class="guide-screenshot-caption">Configuración ARAG: tarifa base, IVA y email de facturación</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge guide-step-badge-indigo">Km</span>
                  <div class="guide-step-content">
                    <strong>Suplidos por desplazamiento</strong> — Importes en euros por partido judicial (Torrox, Vélez-Málaga, Torremolinos, Fuengirola, Marbella, Estepona, Antequera). Estos valores se aplican automáticamente al generar un suplido.
                  </div>
                </div>
              </div>
              <div class="guide-screenshot-container">
                <img src="images/guide/configuracion-suplidos.png" alt="Tabla de Kilometraje" class="guide-screenshot" loading="lazy" />
                <div class="guide-screenshot-caption">Tabla de kilometraje por partido judicial</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge guide-step-badge-amber">SMTP</span>
                  <div class="guide-step-content">
                    <strong>Configuración de email</strong> — Servidor SMTP, puerto, seguridad, usuario, contraseña y dirección de envío. Pulsa "Probar Conexión" para verificar que la conexión funciona correctamente.
                  </div>
                </div>
              </div>
              <div class="guide-screenshot-container">
                <img src="images/guide/configuracion-smtp.png" alt="Configuración SMTP" class="guide-screenshot" loading="lazy" />
                <div class="guide-screenshot-caption">Configuración del servidor de correo electrónico (SMTP)</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge guide-step-badge-green">Cert</span>
                  <div class="guide-step-content">
                    <strong>Certificado digital</strong> — Ruta al archivo .p12 y contraseña del certificado ACA. Pulsa "Probar Certificado" para verificar. Cuando está configurado, los documentos se firman digitalmente con validez legal. Sin certificado, se usa firma visual.
                  </div>
                </div>
              </div>
              <div class="guide-screenshot-container">
                <img src="images/guide/configuracion-certificado-digital.png" alt="Certificado Digital" class="guide-screenshot" loading="lazy" />
                <div class="guide-screenshot-caption">Certificado digital ACA para firma de documentos PDF</div>
              </div>

              <div class="guide-steps">
                <div class="guide-step">
                  <span class="guide-step-badge">Docs</span>
                  <div class="guide-step-content">
                    <strong>Almacenamiento de documentos</strong> — Directorio donde se guardan los PDFs generados (minutas y suplidos). Pulsa "Guardar Configuración" para aplicar todos los cambios de esta página.
                  </div>
                </div>
              </div>
              <div class="guide-screenshot-container">
                <img src="images/guide/configuracion-almacenamiento-de-documentos.png" alt="Almacenamiento de Documentos" class="guide-screenshot" loading="lazy" />
                <div class="guide-screenshot-caption">Ruta de almacenamiento de documentos y botón de guardar</div>
              </div>

              <div class="guide-info-box guide-info-box-warning">
                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <strong>Acceso restringido</strong><br/>
                  Los cambios en la configuración afectan al funcionamiento de todo el sistema. Solo modifica estos valores si estás segura de lo que haces.
                </div>
              </div>
            </section>

            <!-- Quick Reference -->
            <section class="guide-section guide-section-reference" id="guide-referencia">
              <div class="guide-section-header">
                <span class="guide-section-number">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                    <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd"/>
                  </svg>
                </span>
                <div>
                  <h2 class="guide-section-title">Referencia Rápida</h2>
                  <p class="guide-section-desc">Atajos y conceptos clave para usar Record+ de forma eficiente.</p>
                </div>
              </div>

              <div class="guide-ref-grid">
                <div class="guide-ref-card">
                  <div class="guide-ref-card-title">Tipos de Expediente</div>
                  <div class="guide-ref-item">
                    <span class="guide-badge guide-badge-arag">ARAG</span>
                    <span>Seguro de defensa jurídica. Ref: DJ00XXXXXX</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-badge guide-badge-particular">Particular</span>
                    <span>Cliente privado. Ref: IY-AA-NNN</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-badge guide-badge-turno">Turno Oficio</span>
                    <span>Defensa de oficio. Ref: Designación</span>
                  </div>
                </div>

                <div class="guide-ref-card">
                  <div class="guide-ref-card-title">Navegación</div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-key">Dashboard</span>
                    <span>Vista general y métricas</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-key">Expedientes</span>
                    <span>Todos los casos</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-key">Facturación</span>
                    <span>Minutas y suplidos ARAG</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-key">Particulares</span>
                    <span>Hojas de encargo</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-key">Turno</span>
                    <span>Casos de oficio</span>
                  </div>
                </div>

                <div class="guide-ref-card">
                  <div class="guide-ref-card-title">Flujo de Trabajo</div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-step-mini">1</span>
                    <span>Crear expediente con datos del cliente</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-step-mini">2</span>
                    <span>Gestionar documentos y facturas</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-step-mini">3</span>
                    <span>Enviar documentos por email</span>
                  </div>
                  <div class="guide-ref-item">
                    <span class="guide-ref-step-mini">4</span>
                    <span>Archivar cuando se cierre el caso</span>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Table of contents navigation
    const tocLinks = this.container.querySelectorAll(".guide-toc-link");
    tocLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        const target = document.getElementById(`guide-${section}`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        // Update active state
        tocLinks.forEach((l) => l.classList.remove("active"));
        link.classList.add("active");
      });
    });

    // Scroll spy: update TOC active state on scroll
    const sections = this.container.querySelectorAll(".guide-section");
    const content = this.container.querySelector(".guide-content");
    if (content) {
      content.addEventListener("scroll", () => {
        let current = "";
        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const contentRect = content.getBoundingClientRect();
          if (rect.top - contentRect.top < 120) {
            current = section.id.replace("guide-", "");
          }
        });
        if (current) {
          tocLinks.forEach((l) => {
            l.classList.toggle("active", l.dataset.section === current);
          });
        }
      });
    }

    // Handle broken images gracefully
    const images = this.container.querySelectorAll(".guide-screenshot");
    images.forEach((img) => {
      img.addEventListener("error", () => {
        img.closest(".guide-screenshot-container").innerHTML = `
          <div class="guide-screenshot-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
              <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V4.5a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v15a1.5 1.5 0 001.5 1.5z"/>
            </svg>
            <span>Captura pendiente de añadir</span>
          </div>
        `;
      });
    });
  }
}
