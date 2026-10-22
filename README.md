# BRONMA · Cobranza inteligente

Frontend de cobranza para Grupo BRONMA, centrado en las rutas y clientes de Torreón. React 19, TypeScript, Vite, TanStack Query y Leaflet/OpenStreetMap. Identidad dorada, carbón y marfil; el asistente se llama **BRONMIA**.

## Ejecutar la demo

Requiere Node 22.12 o superior.

```sh
npm ci
npm run dev
```

Abre http://localhost:5173/mapa. Sin `VITE_API_URL`, se abre una demo explícitamente identificada. También puede activarse con `VITE_USE_MOCKS=true`. Incluye 15 negocios ficticios, tres rutas y dos clientes sin ubicación. Los pagos y ubicaciones de demostración viven en memoria: se reinician al recargar. No se envían recordatorios ni se simulan importaciones exitosas.

La pantalla principal reúne búsqueda, filtros, lista por prioridad, chinchetas por estado, polilíneas por orden de visita y expediente con notas y evaluación de Ayax. Los clientes sin coordenadas aparecen únicamente en la lista. En móvil hay pestañas Mapa y Lista, y el expediente se abre sobre el mapa.

## Conectar el backend BRONMA

Copia `.env.example` a `.env.local`, conservando cualquier configuración existente. Para datos reales:

```dotenv
VITE_USE_MOCKS=false
VITE_API_URL=http://localhost:8080/api/v1
BRONMA_API_URL=http://localhost:8080/api/v1
```

Reinicia el proceso. `VITE_API_URL` es la URL pública de Spring Boot, con `/api/v1`. El backend debe permitir por CORS el origen del frontend. `BRONMA_API_URL` es la misma API, utilizada exclusivamente por el servidor del asistente. No existe una conexión predeterminada al antiguo backend de retail. Para un proxy del mismo origen, establece `VITE_API_URL=/api/v1` y configura `BRONMA_API_URL` en el servidor Node.

Con backend configurado no se sustituyen los errores por datos de demo. El cliente BRONMA no usa los adaptadores del contrato anterior: conserva los nombres, enums y montos string del contrato de cobranza. Los cálculos de dinero de la demo y la validación del formulario usan centavos enteros con BigInt; las pantallas reales muestran los totales calculados por Spring Boot.

## Pantallas

| Ruta | Contenido |
| --- | --- |
| `/mapa` | Clientes, avisos, rutas, expediente, pago y ubicación |
| `/ruta/:id` | Vista de ruta, pagos con origen RUTA |
| `/dashboard` | Cartera total y vencida, antigüedad y principales deudores |
| `/recordatorios` | Mensajes y estados, filtros y paginación |
| `/importar` | Excel/CSV de hasta 5 MB, importación real y errores por fila |
| `/configuracion` | Empresa, crédito, horario, WhatsApp y proveedor de riesgo IA |
| `/bromia` | Asistente con consultas, dictado e historial de interfaces |

`/` abre el mapa y `/softy` redirige a BRONMIA. Las pantallas anteriores de retail se conservaron como código de referencia y pruebas, fuera de la navegación operativa.

## BRONMIA

La demo ofrece **respuestas guiadas**, identificadas como tales. Para conectar el modelo real, configura en el servidor:

```dotenv
OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=
OLLAMA_MODEL=gemma4:31b
A2UI_MODEL=gemma4:31b
```

Las claves nunca llevan el prefijo `VITE_`. BRONMIA usa `/api/bromia/chat` y consulta únicamente endpoints BRONMA de clientes, rutas, cartera, riesgo y recordatorios. No envía mensajes ni registra pagos por conversación. El dictado conserva la integración existente del navegador y requiere autorización del micrófono; no se comprobó con hardware real.

`GET /api/bromia/health` informa si existe un proveedor configurado; no verifica la validez de su clave ni la cuota. La IA de riesgo Ayax (`/configuracion/ia`) se configura en Spring Boot de forma independiente del asistente conversacional.

## Pagos y ubicación

Cada apertura del formulario genera un `uuidDispositivo`, conservado al reintentar. Los pagos se validan contra el saldo y mantienen el monto decimal como string. Ante un fallo de red, conserva el formulario abierto para reutilizar el mismo UUID. En modo real, el formulario carga los usuarios del backend y permite elegir quién registra el pago, hasta que exista autenticación. El backend sigue siendo responsable de permisos e idempotencia persistente.

La oficina fija una ubicación con un clic y puede arrastrarla antes de guardar. GPS muestra la precisión y rechaza más de 100 metros, como el contrato. La ubicación siempre requiere confirmación; no se geocodifican direcciones. GPS requiere HTTPS o localhost.

## Comprobar y desplegar

```sh
npm test
npm run build
npm start
```

`npm run dev` inicia Vite (5173) y Node (3001). `npm start` sirve la compilación, API y rutas desde Node. `vercel.json` incluye las funciones del asistente y el proxy. Define las variables antes de construir: `VITE_*` se incorporan a la compilación. Este trabajo no publicó ni modificó un despliegue existente.

Se verificaron la compilación, las pruebas unitarias y de formularios, el mapa real y recorridos de demostración en escritorio y un marco móvil de 390 × 844. Las pruebas previas de retail siguen disponibles para proteger el código conservado.

Pendiente del roadmap: mapa de calor, editor de políticas de recordatorios y conexión con el backend real. Fuera de este cambio: autenticación, cobros offline, optimización de recorridos por calles y verificación en teléfonos físicos. La importación requiere las columnas que acuerde el equipo con el sistema de ventas; no se inventa una plantilla.

OpenStreetMap se carga con atribución visible y sin precarga masiva. Necesita internet; si falla el mapa base, la lista y el expediente siguen disponibles. El service worker guarda interfaz y assets, nunca respuestas de cobranza ni pagos offline.
