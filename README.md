# RecordPlus - Sistema de Gestión de Expedientes Jurídicos

Sistema de gestión de expedientes para despacho de abogados. Maneja tres tipos de casos: ARAG (seguros), Particulares y Turno de Oficio.

## 🚀 Estado Actual

- **Backend**: Node.js + Express + SQLite ✅
- **Frontend**: Vanilla JS SPA ✅
- **Servidor**: Clouding.io (Barcelona) - `217.71.207.83` ✅
- **Base de datos**: SQLite persistente en `/home/appuser/data/`

## 📁 Estructura del Proyecto

```
recordplus/
├── src/
│   ├── client/           # Frontend (HTML, CSS, JS)
│   │   ├── css/
│   │   ├── js/
│   │   │   ├── components/
│   │   │   ├── api.js
│   │   │   ├── app.js
│   │   │   └── router.js
│   │   └── index.html
│   └── server/           # Backend (Node.js + Express)
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       └── index.js
├── migrations/           # SQL migrations
├── data/                 # SQLite database (local dev)
├── deploy/               # Deployment scripts
│   ├── setup.sh          # Initial server setup
│   ├── update.sh         # Deploy updates
│   └── cloudflare-setup.md
├── ecosystem.config.cjs  # PM2 configuration
└── package.json
```

## 🖥️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Inicializar base de datos
node migrations/run.js

# Iniciar servidor (puerto 3000)
npm start

# Abrir en navegador
open http://localhost:3000
```

## 🌐 Servidor de Producción

**IP**: `217.71.207.83`  
**Usuario**: `appuser`  
**App**: `/home/appuser/recordplus`  
**Data**: `/home/appuser/data/legal-cases.db`  
**Certificates**: `/home/appuser/data/certificates`
**Backups**: `/home/appuser/backups/` (diario 3 AM)

### Comandos útiles (en el servidor)

```bash
# Ver estado de la app
sudo -u appuser pm2 status

# Ver logs
sudo -u appuser pm2 logs recordplus

# Reiniciar app
sudo -u appuser pm2 restart recordplus

# Desplegar actualizaciones
cd /home/appuser/recordplus
sudo -u appuser git pull
sudo -u appuser npm install --production
sudo -u appuser pm2 restart recordplus
```

### Acceso directo (sin Cloudflare)

```bash
# Desde tu Mac, túnel SSH temporal
ssh -L 3000:localhost:3000 root@217.71.207.83

# Luego abrir en navegador
open http://localhost:3000
```

## 🔐 Próximos Pasos: Cloudflare Zero Trust

Para acceso seguro desde internet sin exponer puertos:

1. Instalar Cloudflare Tunnel en el servidor
2. Configurar Zero Trust (autenticación por email)
3. Desplegar frontend en Cloudflare Pages

Ver: `deploy/cloudflare-setup.md`

## 📊 Módulos

| Módulo           | Estado | Descripción                         |
| ---------------- | ------ | ----------------------------------- |
| Dashboard        | ✅     | Panel principal con métricas        |
| Expedientes      | ✅     | CRUD completo de casos              |
| Facturación ARAG | ✅ UI  | Pantalla de facturación (mock data) |
| Particulares     | ✅ UI  | Hoja de encargo (mock data)         |
| Turno de Oficio  | ✅ UI  | Gestión de expedientes              |
| Estadísticas     | ✅ UI  | Dashboard financiero (mock data)    |
| Configuración    | ✅     | Tarifas y kilometraje               |
| Admin DB         | ✅     | Visor de base de datos              |

## 🗄️ Base de Datos

SQLite con las siguientes tablas:

- `cases` - Expedientes
- `document_history` - Historial de documentos
- `email_history` - Historial de emails
- `configuration` - Configuración del sistema
- `reference_counters` - Contadores de referencias

## 📝 Git Workflow

```bash
# Ver cambios
git status

# Commit y push
git add .
git commit -m "feat: descripción del cambio"
git push

# En el servidor, actualizar
ssh root@217.71.207.83
cd /home/appuser/recordplus
sudo -u appuser git pull
sudo -u appuser pm2 restart recordplus
```

## 🔧 Tecnologías

- **Backend**: Node.js 20, Express, better-sqlite3
- **Frontend**: Vanilla JS (ES Modules), CSS custom properties
- **Database**: SQLite
- **Process Manager**: PM2
- **Hosting**: Clouding.io (Barcelona, España - RGPD)

---

**Repositorio**: https://github.com/josfko/recordplus
