# AgentFlow — Investigación de mercado e implementación

**Fecha:** mayo 2026
**Contexto:** AgentFlow es la herramienta interna de Coldwell Banker Beyker para seguimiento de vendedores inmobiliarios (DMO + pipeline + CRM operativo). Este documento consolida la investigación de mercado realizada y el rediseño del módulo DMO para hacerlo dinámico y adaptado al mercado argentino.

---

## 1. Resumen ejecutivo

Lo que se descubrió y lo que se hizo, en una página:

1. **El DMO clásico USA no aplica para Argentina.** Money Block / Hour of Power asumen cold calling — en AR nadie atiende números desconocidos. WhatsApp es el canal real.
2. **Ningún CRM mainstream (USA o LATAM) tiene coaching/DMO nativo.** Es un diferencial real de AgentFlow.
3. **Tokko Broker domina el mid-market AR** por la integración con ZonaProp/Argenprop/ML. AgentFlow no debe competir contra Tokko en difusión, sino integrarse y agregar la capa de seguimiento + IA.
4. **WhatsApp Business API + IA agéntica** es la mega-tendencia 2025-2026 y la jugada de mayor impacto para AR.
5. **Se rediseñó el módulo DMO** para ser dinámico (ABM de coaches, templates, bloques, asignaciones por vendedor) en lugar de hardcodeado, con 5 templates basados en metodologías reales del mercado.

---

## 2. Investigación de mercado

### 2.1 Players del mercado

#### USA / Global

| CRM | Pricing (USD) | Posicionamiento |
|---|---|---|
| **kvCORE / BoldTrail** | $500-$1.800/mes | All-in-one brokerages, CRM + IDX + lead gen |
| **Follow Up Boss** | $69-$1.000/mes | Best-of-breed CRM, fav de teams top |
| **Lofty** (ex-Chime) | desde $449/mes | All-in-one con IA |
| **BoomTown** | ~$1.000/mes + setup | Brokerages high-producing |
| **Top Producer** | $40-$70/mes | Veteranos y agentes solos |
| **Wise Agent** | $32-$49/mes | Solo agents, power dialer + drips |
| **Real Geeks** | desde $599/mes | Lead gen + IDX |
| **LionDesk** | desde $25/mes | Solos low-budget |
| **Sierra Interactive** | Custom ~$500+ | Teams medianos con SEO fuerte |

Polarización clara: **best-of-breed** (Follow Up Boss) vs **all-in-one** (kvCORE/Lofty/BoomTown).

#### LATAM / Argentina

| CRM | Notas |
|---|---|
| **Tokko Broker** | "El CRM #1 en Argentina". Foco: gestión propiedades + Red Tokko (MLS cooperativo) + difusión multi-portal. Cotización privada. |
| **Wasi** | Colombiano, expandió a AR. Foco web + CRM + difusión. |
| **Mediacore** | Argentino, fuerte en desarrollos / pozo. |
| **2clics** | Competidor directo de Tokko en AR. |
| **Bikas.ai** | AR, foco WhatsApp + IA, agente conversacional. |
| **Kommo** | $15-$45/user/mes. Muy usado en AR para pipeline WhatsApp. |

**Hallazgo clave:** Ningún competidor LATAM tiene coaching/DMO nativo. Diferencial defendible para AgentFlow.

### 2.2 Metodologías de productividad (coaches)

| Coach | Filosofía | Métrica clave |
|---|---|---|
| **Mike Ferry** (1975) | Old-school scripts + cold calling estructurado | **3h de prospecting AM ininterrumpido** |
| **Tom Ferry** (preside MFO) | Hybrid: scripts + branding + coaching | **"Hour of Power"**: 90 días seguidos hasta lograr **6 conversaciones reales** por día |
| **Brian Buffini** (1996) | Referral-based: calls, notes, pop-bys. Anti-cold-calling | Sistema "100 days to greatness", pop-by = visita corta con regalito |
| **Verl Workman** | Sistemas: "anything you do 3 times, create a system" | **"Dollar Productive Activities"** y time-blocking semanal |

**Sobre el "DMO" original de AgentFlow** (Market Review / Money Block / Skill Building / Dollar Productive / Wrap-up):
- "Dollar Productive" viene de **Workman**
- "Money Block" / "Hour of Power" viene de **Tom Ferry**
- "Market Review" / "Wrap-up" son genéricos
- La combinación de 5 bloques con esos nombres **no se encontró atribuida a un coach específico** — es probablemente síntesis interna Beyker/CB

**Estándar de conversaciones diarias:**
- Principiantes: 5 contactos/día
- Mínimo serio: **10 conversaciones reales/día**
- Ambicioso: 20 contactos/día
- Tom Ferry Hour of Power: 6 conversaciones reales por sesión
- Conversación = ida y vuelta real (in-person, teléfono, SMS, WhatsApp). Email NO cuenta.

### 2.3 KPIs estándar de la industria

**Lead funnel:**
- Cost Per Lead (CPL), Cost Per Qualified Lead (CPQL)
- Lead Velocity Rate (LVR)
- Lead-to-Appointment ratio
- Appointment-to-Listing/Contract ratio
- Contract-to-Close ratio
- Contact rate, Speed to lead

**Operación:**
- Days on Market (DOM)
- List-to-Sale price ratio
- Pipeline value
- Avg Sale Price, Transactions YTD

**Financiero:**
- GCI (Gross Commission Income)
- Net income post-split
- Referral rate / Retention rate

**Benchmarks USA 2024-2025:**

| Métrica | Benchmark |
|---|---|
| Appointment → Listing conversion (top teams) | 60-70% |
| Speed to lead ideal | <5 min |
| DOM nacional USA (enero 2026) | 66 días |
| DOM mercado balanceado | 30-60 días |
| GCI mediana REALTOR USA 2024 | $58.100 |
| GCI veteranos 16+ años | $78.900 mediana |
| GCI top agents (25+ deals/año) | >$300.000 |

**Para AR no hay benchmarks públicos equivalentes** — oportunidad para AgentFlow de volverse referencia.

### 2.4 Especificidades Argentina

**Regulación:**
- **Ley 25.028** (nacional) + **Ley 2340 CABA** + Colegios departamentales en provincia.
- **CUCICBA** (CABA): matrícula obligatoria, fees anuales.
- **AFIP**: inscripción, IVA o Monotributo, retención comprobantes **10 años**.
- **Ingresos Brutos** CABA o provincial.
- **Corredor vs Martillero**: profesiones legalmente distintas.
- Honorarios CUCICBA: típicamente 3-4% comprador y/o vendedor en CABA.

**Pipeline legal AR validado** (el de AgentFlow es correcto):
Captado → Publicado → Visita → Reserva → Boleto → Escrituración

Sobre Reserva/Boleto/Escritura:
- **Reserva**: contrato privado. Si el comprador se vuelve atrás pierde seña; si el vendedor, devuelve doblada.
- **Boleto**: contrato preliminar, no transfiere dominio, fija precio y plazo.
- **Escritura**: acto final que transfiere dominio. Escribano tiene 45 días para inscribirla.

**Coldwell Banker / MoxiWorks:**
- En USA/Canadá, CB usa **CB Ignite powered by MoxiWorks** (MoxiEngage CRM, MoxiPresent CMA, Moxi Websites, MoxiImpress).
- **En Argentina no se confirmó uso oficial de MoxiWorks** — oportunidad para AgentFlow como equivalente local adaptado a normativa AR.

### 2.5 Tendencias 2025-2026 en PropTech

- **AgenticAI / propOS**: AI agents que ejecutan workflows multi-step de forma autónoma.
- **Predictive lead scoring** con ML — AgentFlow ya lo hace con Gemini.
- **Chatbots / virtual ISAs** manejan ~80% de buyer queries iniciales según PwC/ULI.
- **Video messaging** (BombBomb).
- **Power dialers** (Mojo, PhoneBurner).
- **WhatsApp Business API** integrado al CRM — **mandatorio en LATAM**.
- **Drip cadences** automáticas post-no-answer.
- **e-Signature** integrado (Dotloop, SkySlope, DocuSign).
- **ISA virtuales 24/7** que califican leads off-hours.

Funding: VC en AI real estate tools alcanzó ~$100B acumulado a feb 2025. Mercado de AI en real estate: $222B (2024) → $303B (fin 2025) estimado.

---

## 3. WhatsApp Business API + IA agéntica (sección expandida)

**Esta es la jugada de mayor impacto para AgentFlow en el mercado AR.** Acá va el detalle completo.

### 3.1 Por qué WhatsApp es crítico en Argentina

- **94% de penetración** de WhatsApp en argentinos con smartphone (datos de Statista 2024).
- El argentino **no atiende llamadas de números desconocidos** post-pandemia. Cold calling tasa de respuesta < 3%.
- Compradores y vendedores **escriben primero por WhatsApp** antes que cualquier otro canal — incluido formulario web o llamada.
- Es el canal de **confirmación de visitas**, **envío de info de propiedades**, **negociación de reserva** y **coordinación con escribano** en TODAS las inmobiliarias serias de AR.
- Los CRMs gringos (kvCORE, Follow Up Boss) **no integran bien WhatsApp** — esto es un hueco competitivo enorme.

### 3.2 Qué es WhatsApp Business API (no confundir con WhatsApp Business app)

Tres productos distintos:

| Producto | Para quién | Limitaciones |
|---|---|---|
| **WhatsApp personal** | Persona física | Sin uso comercial automatizado |
| **WhatsApp Business app** (gratis) | PyMEs chicas | 1 dispositivo, sin API, sin automatización seria |
| **WhatsApp Business Platform (API)** | Empresas / SaaS | Multi-agente, automatización completa, pagar por conversación |

**Pricing oficial Meta** (model conversaciones, 2024-2026):
- Marketing template (proactivo, iniciado por la empresa): **~USD 0.06-0.08 por conversación** (Argentina).
- Utility template (notificaciones operativas): **~USD 0.015**.
- Service (cuando el cliente escribe primero, ventana 24h gratis): **gratis las primeras 1.000/mes**, luego ~USD 0.003.

Una conversación = ventana de 24h con un usuario, no por mensaje.

### 3.3 Proveedores (BSPs — Business Solution Providers)

No pegás directo a Meta, vas a través de un BSP autorizado:

| BSP | Foco | Pricing aprox |
|---|---|---|
| **Twilio** | Más maduro, dev-friendly, multi-canal | $0.005/msg + Meta conversation fee |
| **MessageBird** | Europeo, UX simple | Similar a Twilio |
| **360Dialog** | Especialista WhatsApp, alemán | USD 49-59/mes flat + Meta fees |
| **Gupshup** | India, muy usado en LATAM | Pricing más barato, soporte español |
| **Wati / Zoko** | Plataformas SaaS WhatsApp-only | $39-99/mes con UI propia |
| **Meta Cloud API directa** | Hosted por Meta, gratis | Setup más técnico, solo Meta fees |

**Recomendación para AgentFlow:** Meta Cloud API directa (gratis, hosted por Meta, sin BSP intermedio) o 360Dialog si querés soporte y dashboard. Twilio si en algún momento querés expandir a SMS / Voice.

### 3.4 IA agéntica — qué significa y cómo aplica

**Diferencia clave:**

| Chatbot tradicional | AI Agent agéntico |
|---|---|
| Responde preguntas Q&A con FAQ | Ejecuta workflows multi-step |
| Stateless, reactivo | Stateful, proactivo |
| "¿Tenés deptos en Palermo?" → texto | "¿Tenés deptos en Palermo?" → busca en CRM, filtra por presupuesto, devuelve 3 opciones, agenda visita en calendario, notifica al vendedor |
| 1 turno | N turnos con memoria de contexto |
| No usa tools/herramientas | Llama a APIs, consulta DB, escribe a CRM |

**Stack técnico típico de un AI agent:**
1. **LLM** (Gemini, Claude, GPT-4) como motor de razonamiento.
2. **Tools/funciones** que el LLM puede invocar:
   - `buscar_propiedades(zona, presupuesto, ambientes)` → consulta DB AgentFlow
   - `agendar_visita(cliente_id, propiedad_id, fecha)` → escribe en tabla `visitas`
   - `crear_lead(nombre, telefono, intereses)` → upsert en `clientes`
   - `derivar_a_humano(motivo)` → notifica al vendedor de guardia
3. **Memoria** del contexto de conversación (DB o vector store).
4. **Sistema de guardrails**: cuándo derivar a humano, cuándo no inventar precios, etc.
5. **Webhooks WhatsApp** para entrada/salida de mensajes.

### 3.5 Caso de uso para AgentFlow (flujo completo)

**Escenario:** lunes 23:00, llega una consulta de un buyer.

```
Usuario (WhatsApp): "Hola, vi en ZonaProp un depto en Palermo de USD 180k.
                    ¿Está disponible?"

[IA Agent en AgentFlow, off-hours]

1. Recibe webhook de Meta → procesa con Gemini
2. Tool call: buscar_propiedades(zona="Palermo", precio_max=200000)
   → encuentra propiedad ID 47 (la que el cliente vio)
3. Tool call: get_disponibilidad(propiedad_id=47)
   → estado = "publicada"
4. Tool call: crear_lead(nombre="?", telefono="+5491155...", interes="Palermo USD180k")
   → genera cliente_id=156 en estado "nuevo"
5. Responde por WhatsApp:
   "¡Hola! Sí, el depto sigue disponible. Te paso fotos extra y la
    info técnica. ¿Querés que te coordine una visita esta semana?
    Tenemos turnos miércoles 18hs o sábado 11hs."
6. Espera respuesta del usuario.

Usuario: "Sábado 11 me viene bárbaro"

7. Tool call: agendar_visita(cliente_id=156, propiedad_id=47,
                              fecha="2026-05-17 11:00")
   → crea visita en estado "agendada"
8. Tool call: get_vendedor_guardia(zona="Palermo") → Lautaro
9. Tool call: notificar_vendedor(vendedor_id=lautaro,
                                  mensaje="Visita agendada sábado 11hs")
10. Responde: "¡Perfecto! Te confirmé la visita sábado 11hs con
    Lautaro. Te va a escribir mañana para coordinar la dirección
    exacta. Cualquier duda escribime."
```

**Resultado**: lead capturado, calificado, agendado y derivado a un vendedor humano — **a las 23:00, sin que nadie estuviera laburando**. Speed to lead = 30 segundos.

### 3.6 Arquitectura propuesta para AgentFlow

```
┌──────────────────────────────────────────────────────────────┐
│  beykercoldwell (front público) o ZonaProp (lead externo)    │
│  → lead entra con teléfono WhatsApp                          │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Meta WhatsApp Cloud API                                     │
│  Webhook → AgentFlow /api/whatsapp/webhook                   │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  AgentFlow Backend                                           │
│                                                              │
│  services/whatsapp_agent.py                                  │
│  ├── recibir_mensaje() — parser webhook Meta                 │
│  ├── resolver_contexto() — busca conversación previa         │
│  ├── ejecutar_agent() — llama a Gemini con tools             │
│  │   tools disponibles:                                      │
│  │   - buscar_propiedades()                                  │
│  │   - agendar_visita()                                      │
│  │   - crear_lead()                                          │
│  │   - get_disponibilidad()                                  │
│  │   - notificar_vendedor()                                  │
│  │   - derivar_a_humano(motivo)                              │
│  ├── enviar_respuesta() — POST a Meta Cloud API              │
│  └── log_conversacion() — guarda en tabla whatsapp_messages  │
│                                                              │
│  Nueva tabla:                                                │
│  - whatsapp_conversations (cliente_id, estado, ultima_msg)   │
│  - whatsapp_messages (conv_id, direccion, contenido, ts)     │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Vendedor humano recibe push/email con el lead calificado    │
│  + la transcripción de la conversación que ya tuvo el agent  │
└──────────────────────────────────────────────────────────────┘
```

### 3.7 Roadmap sugerido (3 fases)

**Fase 1 — Inbox compartido (1-2 semanas):**
- Setup Meta Cloud API + webhook a AgentFlow.
- Tabla `whatsapp_messages` + UI tipo inbox en AgentFlow donde el vendedor ve y responde mensajes desde el CRM.
- Sin IA todavía. Solo unificar el canal.

**Fase 2 — Auto-responder + lead capture (2-3 semanas):**
- IA simple (Gemini) que responde fuera de horario con plantilla y captura el lead.
- Detecta zona/presupuesto del mensaje del usuario y crea el contacto en `clientes`.
- Notifica al vendedor de guardia.

**Fase 3 — Agent completo con tools (4-6 semanas):**
- Function calling con Gemini.
- Agendamiento de visitas, búsqueda de propiedades, derivación inteligente.
- Memoria de conversación, multi-turn.
- Dashboard de métricas: % de leads atendidos por IA, % derivados, conversión.

**Stack técnico:**
- Backend: FastAPI ya está, agrego `services/whatsapp_agent.py`.
- LLM: Gemini 2.5 Flash (ya en uso para lead scoring) con function calling.
- DB: tablas nuevas en MySQL Aiven.
- Frontend: nueva pantalla `/inbox` tipo conversación.

### 3.8 Costo estimado por mes (Beyker como cliente)

Asumiendo 200 leads/mes que conversan por WhatsApp:

| Concepto | Costo |
|---|---|
| Meta WhatsApp conversations (200 service @ $0.003 + 50 marketing @ $0.07) | ~$4-5 |
| Gemini 2.5 Flash (10k tokens promedio por conversación, 200 conv) | ~$1-2 |
| BSP (si usás 360Dialog) | $49/mes flat |
| **Total mensual (con BSP)** | **~$55** |
| **Total mensual (Meta Cloud API directa)** | **~$7** |

**ROI estimado:** si una sola operación cerrada gracias a un lead que el agent capturó off-hours genera $5.000+ USD de comisión, el sistema se paga 100x al mes.

---

## 4. Implementación realizada — Rediseño DMO dinámico

### 4.1 Problema original

El DMO estaba **hardcodeado** con 5 bloques fijos:
1. Market Review
2. Money Block
3. Skill Building
4. Dollar Productive
5. Wrap-up

Problemas:
- No aplicable al mercado argentino (Money Block = cold calling)
- No permitía customización por inmobiliaria (futuro multi-tenant SaaS)
- No permitía A/B testing entre metodologías
- No permitía que distintos vendedores siguieran metodologías distintas

### 4.2 Solución implementada

**Modelo de datos nuevo** (`backend/models/dmo.py`):

```
Coach (ABM)
├── id, nombre, descripcion, foto_url, fuente_url
└── es_oficial (flag de coach pre-cargado, no eliminable desde UI)

DmoTemplate (pertenece a Coach)
├── id, coach_id, nombre, descripcion, mercado
├── activo (bool)
└── es_default_inmobiliaria (uno por inmobiliaria)

DmoBloque (pertenece a Template)
├── id, template_id, orden
├── nombre, descripcion
├── hora_inicio, hora_fin, color
├── es_money_block (flag visual)
├── metrica_tipo: 'checkbox' | 'cantidad'
├── metrica_label (ej: "Conversaciones", "Pop-bys")
└── metrica_meta (numérico, meta diaria)

VendedorDmoAssignment
├── vendedor_id, template_id
└── relación 1:1 (un vendedor → un template)

DmoLog (refactorizado)
├── vendedor_id, bloque_id, fecha
├── completado: bool
├── valor_metrica: int (reemplaza conversaciones_reportadas hardcodeado)
└── notas
```

### 4.3 5 templates seedados (basados en investigación)

#### Beyker AR (default) — mercado argentino
1. **Apertura** (08:30-09:00) — checkbox — revisar portales, agenda, leads
2. **WhatsApp Block** (09:00-10:30) — Money Block — meta: 12 conversaciones reales
3. **Captación activa** (10:30-11:30) — meta: 5 contactos cálidos
4. **Calle / Visitas** (14:00-17:00) — meta: 1 visita o reunión presencial
5. **Cierre** (17:30-18:30) — checkbox — cargar CRM, agenda mañana

#### Tom Ferry — Hour of Power
Mindset Morning → Hour of Power (6 conv reales) → Lead Follow-Up → Geo-Farm → Listing/Showing Time → Daily Wrap-Up

#### Mike Ferry — Classic Prospecting
Morning Schedule → Prospecting Block (3h ininterrumpidas, meta 20 contactos) → Lead Follow-up → Appointments/Showings → Admin

#### Brian Buffini — Work by Referral
Morning Routine → Sphere Calls (5 calls) → Personal Notes (5 notas manuscritas) → Pop-By Time (3 visitas) → Lead Gen Activities → CRM Update

#### Verl Workman — Dollar Productive
Market Snapshot → DPA Dollar Productive (15 contactos) → Skill Building → Client Care → Systems & Process

### 4.4 Asignaciones de la demo

- Lautaro, Romina, Federico → **Beyker AR** (3 vendedores con el default)
- Camila → **Buffini** (Work by Referral)
- Martin → **Tom Ferry** (Hour of Power)

Permite mostrar en la demo cómo 5 vendedores pueden estar siguiendo 3 metodologías distintas, todas administradas desde el mismo gerente.

### 4.5 Endpoints REST nuevos

```
GET    /api/coaches/                       — lista de coaches
POST   /api/coaches/                       — crear coach
PATCH  /api/coaches/{id}                   — editar
DELETE /api/coaches/{id}                   — eliminar (si no es oficial)

GET    /api/dmo-templates/                 — lista de templates
GET    /api/dmo-templates/{id}             — detalle con bloques
POST   /api/dmo-templates/                 — crear template + bloques
PATCH  /api/dmo-templates/{id}             — editar template + bloques
DELETE /api/dmo-templates/{id}             — eliminar (si no tiene asignaciones)
POST   /api/dmo-templates/{id}/clone       — clonar para customizar

GET    /api/dmo-assignments/               — lista de asignaciones
POST   /api/dmo-assignments/               — upsert (vendedor → template)
DELETE /api/dmo-assignments/{vendedor_id}  — desasignar

GET    /api/dmo/dia                        — devuelve el día del vendedor
                                             (resuelve su template dinámicamente)
POST   /api/dmo/log                        — upsert log de bloque
```

### 4.6 Pantallas frontend nuevas

- **`/coaches`** — cards con ABM, fuente_url, badge "Oficial". Solo admin/gerente.
- **`/dmo-templates`** — cards con preview de bloques + SideModal con editor anidado (reorder, color picker, Money Block flag, tipo de métrica + meta) + botón clonar. Solo admin/gerente.
- **`/asignaciones-dmo`** — tabla de vendedores con dropdown del template asignado. Solo admin/gerente.
- **`/dmo`** (refactorizado) — 100% dinámico. Lee `data.template.bloques`, renderiza N bloques (no más 5 fijos), usa `metrica_label` genérico, muestra badge del coach asignado, empty state si el vendedor no tiene template.

### 4.7 Lo que NO se tocó (scope limpio)

- `Autorizaciones.tsx` y `Configuracion.tsx` — los toca otro agente en paralelo.
- Endpoints `/api/autorizaciones/`, `/api/users/`.
- `screens/*.md` (manuales del AI Coach).
- Modelos de Cliente, Propiedad, Visita, Pipeline.

---

## 5. Próximos pasos sugeridos (priorizados)

### Prioridad 1 — Core competitivo inmediato

1. **WhatsApp Business API + ISA virtual con IA** (detallado en sección 3) — la jugada de mayor impacto en AR.
2. **Comisiones, splits y caps por agente** — crítico para Beyker como franquicia multi-agente.
3. **Sincronización Tokko ↔ AgentFlow** vía API oficial (reemplazar scraping de beykercoldwell).

### Prioridad 2 — Automation

4. **Nurture cadences / drip campaigns** automatizadas por etapa.
5. **Speed-to-lead alerts** + round-robin assignment.
6. **CMA (Comparativo de Mercado) con IA** estilo MoxiPresent.

### Prioridad 3 — Compliance AR

7. **Módulo legal AR**: matrícula CUCICBA, numeración boletos/reservas, escribano, plazo 45 días.
8. **Reportes financieros**: GCI mensual/YTD, conversion funnel completo.

### Prioridad 4 — Coaching layer (diferencial AgentFlow)

9. **DMO histórico + accountability**: ranking por adherencia, alertas al gerente, comparativa entre templates.
10. **A/B testing entre metodologías**: medir conversion por template ("vendedores con DMO Ferry vs Buffini vs Beyker AR → cuál convierte más").

### Bonus

- e-Signature integrada (DocuSign API).
- Transaction management estilo Dotloop.
- Sphere/referral tracking estilo Buffini.

---

## 6. Fuentes principales consultadas

- [Tom Ferry — 90-day HOP Challenge](https://www.tomferry.com/blog/90-day-hop-challenge/)
- [Mike Ferry Organization](https://www.mikeferry.com/)
- [Buffini & Company](https://www.buffiniandcompany.com/)
- [Workman Success Systems](https://workmansuccess.com/)
- [Tokko Broker](https://www.tokkobroker.com/es-ar/)
- [HousingWire — Best Real Estate CRM](https://www.housingwire.com/articles/best-real-estate-crm/)
- [AgentFire — Top CRMs](https://agentfire.com/blog/top-crms-real-estate/)
- [Follow Up Boss vs kvCORE](https://www.selecthub.com/real-estate-crm-software/kvcore-vs-follow-up-boss/)
- [First Page Sage — Real Estate Benchmarks 2025](https://firstpagesage.com/reports/real-estate-marketing-metrics-benchmarks/)
- [CUCICBA — Obligaciones legales](https://www.cucicba.com.ar/obligaciones-legales-de-un-corredor-inmobiliario-en-la-ciudad-de-buenos-aires/)
- [PwC — Emerging Trends in PropTech](https://www.pwc.com/us/en/industries/financial-services/asset-wealth-management/real-estate/emerging-trends-in-real-estate-pwc-uli/trends/proptech-impact.html)
- [Meta WhatsApp Business Platform — pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [MoxiWorks](https://moxiworks.com/)

---

*Documento generado tras investigación con WebSearch + WebFetch (~26 fuentes) y rediseño del módulo DMO. Mayo 2026.*
