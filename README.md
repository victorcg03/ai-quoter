# 💬 AI Quoter — Asesor de propuestas web (Astro + React + IA)

Genera propuestas conversacionales para webs: la IA sugiere funcionalidades, calculas el precio, y descargas un **PDF** con el desglose. Incluye un bloque informativo con el **coste anual** (dominio, hosting y mantenimiento) explicado para clientes.

## ✨ Funcionalidades

- Chat que **entiende contexto** y propone features realistas (Ollama + Llama 3.1).
- Selección de SKUs (catálogo) + extras personalizados.
- Cálculo de precio con dependencias/exclusiones coherentes.
- **PDF profesional** con desglose.
- Estimación **anual** aparte (dominio/hosting/mantenimiento).
- Persistencia local de propuestas en `data/quotes.json`.

## 🧱 Stack

- **Astro 5** + **@astrojs/node** (API routes en Node).
- **React** (UI), **Tailwind v4** (via `@tailwindcss/vite`).
- **Zod** para validar entrada/salida.
- **Ollama** como motor de IA local o en otro servicio.

## 🔐 Variables de entorno

Crea un `.env` a partir de `.env.example`:

```ini
# IA / Ollama
# Local:  http://localhost:11434
# Coolify (si el servicio se llama "ollama"): http://ollama:11434
OLLAMA_URL=http://localhost:11434
OLLAMA_TIMEOUT_MS=25000

# Logs
LOG_LEVEL=info            # debug | info | error
LOG_NS=AGENT,SUGGEST,QUOTE,PDF

# Puerto (Coolify suele inyectar PORT automáticamente)
# PORT=3000
```

> **Importante:** no subas `.env` al repo.

## 🧪 Desarrollo local

```bash
# 1) IA
ollama serve
ollama pull llama3.1:8b

# 2) App
cp .env.example .env
pnpm i
pnpm dev
```

Abre `http://localhost:4321`.

## 🚀 Producción sin Dockerfile (Coolify)

1. **Servicio Ollama**

   - Imagen: `ollama/ollama:latest`
   - Puerto interno: `11434`
   - Volumen: `/root/.ollama`
   - (Opc.) Ejecuta `ollama pull llama3.1:8b` tras arrancar.

2. **Servicio Node.js (este repo)**
   - Build command: `pnpm i && pnpm build`
   - Start command: `pnpm start`
   - Puerto interno: `3000`
   - Variables:
     - `OLLAMA_URL=http://ollama:11434`
     - `OLLAMA_TIMEOUT_MS=25000`
     - `LOG_LEVEL=info`
     - `LOG_NS=AGENT,SUGGEST,QUOTE,PDF`
   - **Volumen/persistencia**: monta `/app/data` para no perder `quotes.json`.

> Ambos servicios deben compartir la misma red de Coolify para que `http://ollama:11434` resuelva.

## 🛡️ Seguridad y buenas prácticas

- No subir `.env` ni `data/quotes.json`.
- La API limpia/valida salida de la IA con Zod y filtros.
- Limita desvíos de conversación (cutoff) para mantener foco.
