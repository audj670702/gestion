# SCaD Gestión

**App operativa** · https://gestion.scad.mx

Seguimiento de proyectos e integración del expediente técnico.

Vistas por rol de la EO: **Dirección** (EJECUTIVO), **Operación** (colaborador responsable) e **Instancia** (CLIENTE). El ADM (incluido el principal) alterna las tres desde el menú de cuenta y ve **Panel de Control**. Sólo en Operación se trabaja el checklist; Dirección e Instancia son de consulta.

Menú de cuenta: avatar + nombre a mostrar, correo, Actualizar, Editar perfil (`sysPwaProfile`), Cerrar sesión. Instalar app: aviso del navegador en Android; tutorial en video (`assets/tutorial-instalar-app.mp4`) en iPhone.

- Identidad y sesión: SYS (`sys-autenticacion?app=GESTION`, token firmado).
- Backend: Wix (`backend/gestionCore.js`, endpoints `gestionPwaContext`, `gestionTokenRefresh`, `gestionApi`, `gestionArchivo`). El código del backend no se publica en este repositorio.
- Documentos: Drive de la Empresa Operadora (carga directa desde el navegador).
- Panel ADM: Wix (`/panel-gestion`).

Programación: modelo NEXUS extendido. Las actividades llegan en el contexto SYS (`actividades`). **Requeridas** (origen ADM): las programa el administrador, generales de la EO o de un proyecto. **Propias** (origen USUARIO): las programa el colaborador, siempre ligadas a un proyecto suyo. Las de proyecto se marcan cumplidas desde la actividad o desde Seguimiento (siempre dejan anotación); el ADM puede convertir una propia en requerida. Calendario, lista, filtros por origen y tipo, búsqueda, agenda por proyecto y bloque «Actividades de hoy».

**Versión:** v0.8.0

Documentos por requerimiento: todos los archivos se conservan y se muestran en su detalle, con nombre original, autor y fecha. El backend asigna un nombre `<folio-proyecto>-R<requerimiento>-<consecutivo>.<extensión>` y reserva el consecutivo antes de abrir la carga directa a Drive. Los reintentos de confirmación no crean documentos duplicados.

La carpeta del proyecto se elige en el Panel ADM con Google Picker, usando la misma cuenta de Google conectada por el administrador principal de la EO. Las cargas nuevas usan esa carpeta; los documentos existentes conservan su ubicación. Si no se ha elegido una carpeta, se mantiene la estructura automática anterior.

**Orden de activación:** publicar primero los cambios de Wix (Panel v0.6.0, `gestionAdmin.web.js`, `gestionCore.js`) y después integrar esta versión de la PWA. La colección privada `GES_CargasArchivos` y los campos de carpeta/trazabilidad deben existir antes de activar el backend. No se amplía el permiso de Google más allá de `drive.file`.

Identidad gráfica aprobada en encabezado y acceso. Barra azul flotante (estilo NEXUS): Proyectos, Programación y Opciones. Opciones conserva cuenta, vistas por rol y Panel ADM.

Inicio: logotipo centrado con zoom y disolución. Respeta movimiento reducido y libera la pantalla incluso si falla la red.

