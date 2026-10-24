# SCaD Gestión

**App operativa** · https://gestion.scad.mx

Seguimiento de proyectos e integración del expediente técnico.

Vistas por rol de la EO: **Dirección** (EJECUTIVO), **Operación** (colaborador responsable) e **Instancia** (CLIENTE). El ADM (incluido el principal) alterna las tres desde el menú de cuenta y ve **Panel de Control**. Sólo en Operación se trabaja el checklist; Dirección e Instancia son de consulta.

Menú de cuenta: avatar + nombre a mostrar, correo, Actualizar, Editar perfil (`sysPwaProfile`), Cerrar sesión. Instalar app: aviso del navegador en Android; tutorial en video (`assets/tutorial-instalar-app.mp4`) en iPhone.

- Identidad y sesión: SYS (`sys-autenticacion?app=GESTION`, token firmado).
- Backend: Wix (`backend/gestionCore.js`, endpoints `gestionPwaContext`, `gestionTokenRefresh`, `gestionApi`, `gestionArchivo`). El código del backend no se publica en este repositorio.
- Documentos: Drive de la Empresa Operadora (carga directa desde el navegador).
- Panel ADM: Wix (`/panel-gestion`).

Programación: mismo modelo que NEXUS. Las actividades llegan en el contexto SYS (`actividades` o `programacion`), las captura el ADM en el panel y en la app son de consulta (calendario, lista, filtro por tipo, búsqueda, detalle y bloque «Actividades de hoy»).

**Versión:** v0.3.0
