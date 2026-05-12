---
screen: dmo
title: Daily Method of Operation (vendedor inmobiliario)
applies_to: [agentflow]
---

# Qué hace esta pantalla

El vendedor inmobiliario abre esta pantalla cada mañana. Ve los bloques horarios de SU rutina diaria del día (DMO) en formato timeline horizontal + cards.

**IMPORTANTE: el DMO es dinámico.** Cada vendedor puede tener un template distinto según la metodología que le asignó el gerente. Los templates posibles incluyen:

- **DMO Argentina (Beyker)** — adaptado a AR. Bloques tipo: Apertura, WhatsApp Block (es el "money block" en AR), Captación activa, Calle/Visitas, Cierre. WhatsApp es el canal real en AR, no el cold calling.
- **Hour of Power (Tom Ferry)** — Mindset, Hour of Power (1h prospecting USA), Lead Follow-Up, Geo-Farm, Listing/Showing, Wrap-Up.
- **Classic Prospecting (Mike Ferry)** — Morning, Prospecting Block (3h ininterrumpidas), Follow-up, Appointments, Admin.
- **Work by Referral (Buffini)** — sphere-based: Morning Routine, Sphere Calls, Personal Notes, Pop-Bys, Lead Gen, CRM.
- **Dollar Productive (Workman)** — Market Snapshot, DPA, Skill Building, Client Care, Systems.

**NUNCA asumas un template específico.** Leé los `bloques` del contextData y usá EXACTAMENTE esos nombres y metas. Si el bloque se llama "WhatsApp Block" con meta 12, no digas "Money Block" ni "meta 20".

A lo largo del día el vendedor marca bloques completados y reporta valores de la métrica de cada bloque (conversaciones, contactos, llamadas, pop-bys, etc. — depende del bloque).

# Quién la usa

- **vendedor**: ve SU DMO del día, marca y reporta. Pantalla principal cada mañana.
- **gerente**: ve el DMO de cualquier vendedor (read-only). Coachea en 1:1s.

# Datos que maneja (modelo dinámico)

- `Coach` — autor de la metodología (Tom Ferry, Buffini, Workman, Beyker AR, etc.).
- `DmoTemplate` — un DMO concreto (pertenece a un Coach). Hay uno default por inmobiliaria.
- `DmoBloque` — bloque del template. Campos: nombre, hora_inicio, hora_fin, descripcion, color, es_money_block, **metrica_tipo** ('checkbox' | 'cantidad'), **metrica_label** (ej "Conversaciones", "Pop-bys", "Llamadas"), **metrica_meta** (numérico).
- `VendedorDmoAssignment` — qué template usa cada vendedor.
- `DmoLog` — 1 fila por vendedor x bloque x día. Campos: completado (bool), **valor_metrica** (int), notas.
- `User.meta_conversaciones_diaria` — meta GLOBAL del vendedor (suma de los bloques con métrica "conversaciones"). Default 20, editable por gerente.

# Decisiones del usuario

1. **¿Cumplo el bloque clave (es_money_block) o lo pateo?** El más sensible — la IA debe empujarlo a NO patearlo.
2. **¿A quién contacto en los próximos minutos?** Lead/cliente concreto, nombre + teléfono, motivo de prioridad. Si el bloque actual es de WhatsApp, sugerir WhatsApp; si es de calls, sugerir teléfono.
3. **¿Qué leads se están enfriando?** Tibios sin contacto +7 días = riesgo.
4. **¿Cómo voy contra mi meta del bloque actual?** Visualización + cuánto falta.
5. **¿Qué prepara el bloque que viene?** Acción concreta.

# KPIs / señales que importan

| KPI | Bien | Alarma |
|---|---|---|
| valor_metrica del bloque actual vs metrica_meta | >= 100% al cerrar el bloque | < 50% pasado el 70% del tiempo del bloque |
| bloques completados al mediodía | >= 50% | < 30% |
| es_money_block completado | Sí, dentro de su ventana horaria | Sin marcar pasada su hora_fin |
| Streak DMO ≥ 80% | 5+ días seguidos | corte de racha |
| Leads calientes sin contactar +3d | 0 | >= 2 |

# Tips que la IA debe dar

Generá 3 widgets. Usá SIEMPRE nombres reales del contextData.bloques (NUNCA "Money Block" si el bloque se llama distinto).

- **HOT TIP**: lo más impactante. Decidir según contexto:
  1. Si hay un bloque activo (`bloque_actual`) con métrica de cantidad y `valor_actual < metrica_meta * 0.5` cuando ya pasó el 50% del tiempo del bloque: empujar. Mencionar **el nombre real del bloque** ("Te falta acelerar el WhatsApp Block", "El Hour of Power está por cerrar"). Sugerir UN cliente caliente concreto si los hay (nombre + teléfono + motivo). Accent `flame`. CTA `llamada` o `whatsapp` según el tipo de bloque (WhatsApp → whatsapp, Calls/Hour of Power/Prospecting → llamada).
  2. Si el bloque actual con métrica ya cumplió `>= metrica_meta`: felicitar y sugerir UN cliente tibio para escalar. Accent `gold`. CTA `navigate` al cliente.
  3. Si hay bloques `es_money_block` vencidos sin completar: prioridad TOTAL — empujar a recuperarlo. Accent `flame`.
  4. Si no hay ningún bloque activo (entre bloques o fuera de horario): sugerir prep del próximo bloque.

- **PRÓXIMO**: countdown al siguiente bloque (`siguiente_bloque`) + sugerencia específica de qué preparar:
  - Si el bloque siguiente es de captación/prospecting → sugerir armar lista de a quién contactar.
  - Si es de visitas/showings → recordar dirección + cliente de las visitas agendadas hoy.
  - Si es de WhatsApp/Sphere Calls → sugerir abrir conversaciones pendientes con tibios.
  - Si es de wrap-up/CRM → recordar cargar notas pendientes.
  - Si es skill building → sugerir contenido para postear (mencionar propiedades si hay).
  Accent `blue`.

- **STREAK / RESUMEN**: estado de la racha + frase concreta corta.
  - Racha activa (≥5 días): celebrar, mencionar el récord si está cerca.
  - Corte hoy: motivar a empezar nueva.
  Accent `gold` o `ok`.

# Tips que la IA NO debe dar

- Mencionar bloques que NO existan en `contextData.bloques` (ej "Money Block" si el template es Buffini).
- "Llamá a tus clientes" genérico sin nombre.
- "Esforzate" / "Vos podés" / motivación vacía sin data.
- Mencionar clientes/propiedades que NO estén en el contextData.
- Sugerir WhatsApp para un bloque que es de teléfono o viceversa (mirar el `metrica_label` del bloque para inferir el canal).
- Repetir el mismo tip dos refreshes seguidos.

# Acciones accionables (CTAs disponibles)

- `{ type: "navigate", to: "/clientes/<id>" }`
- `{ type: "llamada", phone: "+549..." }`
- `{ type: "whatsapp", phone: "+549...", text: "..." }`
- `{ type: "action", endpoint: "POST /api/dmo/log", body: { bloque_id, completado: true } }`

# Cómo leer el contextData (estructura)

```json
{
  "template": { "nombre": "DMO Argentina (Beyker)", "coach": "Beyker AR" },
  "hora": "10:33",
  "fecha": "2026-05-11",
  "meta_conversaciones_diaria": 20,
  "conv_hoy": 1,
  "pct_completitud": 0,
  "bloques": [
    {
      "id": 12, "nombre": "Apertura", "hora_inicio": "08:30", "hora_fin": "09:00",
      "es_money_block": false, "metrica_tipo": "checkbox",
      "metrica_label": null, "metrica_meta": 0,
      "valor_actual": 0, "completado": false, "estado": "overdue"
    },
    {
      "id": 13, "nombre": "WhatsApp Block", "hora_inicio": "09:00", "hora_fin": "10:30",
      "es_money_block": true, "metrica_tipo": "cantidad",
      "metrica_label": "Conversaciones", "metrica_meta": 12,
      "valor_actual": 1, "completado": false, "estado": "overdue"
    }
  ],
  "bloque_actual": { "id": 14, "nombre": "Captacion activa", "hora_inicio": "10:30", "hora_fin": "11:30",
                     "metrica_label": "Contactos calidos", "metrica_meta": 5, "valor_actual": 0 },
  "siguiente_bloque": { "id": 15, "nombre": "Calle / Visitas", "hora_inicio": "14:00" },
  "bloques_completados_count": 0,
  "bloques_vencidos_no_completados": ["Apertura", "WhatsApp Block"]
}
```

`estado` puede ser: `'done'` (completado), `'now'` (en curso), `'pending'` (futuro), `'overdue'` (pasó la hora y no completado).

# Ejemplo de prompt resuelto

**contextData (vendedor Lautaro, template Beyker AR, 10:33hs):**

```json
{
  "template": { "nombre": "DMO Argentina (Beyker)", "coach": "Beyker AR" },
  "hora": "10:33",
  "conv_hoy": 1,
  "meta_conversaciones_diaria": 20,
  "bloques": [
    { "nombre": "Apertura", "estado": "overdue", "completado": false },
    { "nombre": "WhatsApp Block", "es_money_block": true, "metrica_label": "Conversaciones", "metrica_meta": 12, "valor_actual": 1, "estado": "overdue", "completado": false },
    { "nombre": "Captacion activa", "metrica_label": "Contactos calidos", "metrica_meta": 5, "valor_actual": 0, "estado": "now", "completado": false }
  ],
  "bloque_actual": { "nombre": "Captacion activa", "hora_fin": "11:30", "metrica_label": "Contactos calidos", "metrica_meta": 5, "valor_actual": 0 },
  "siguiente_bloque": { "nombre": "Calle / Visitas", "hora_inicio": "14:00" }
}
```

**Respuesta JSON esperada:**

```json
{
  "hot_tip": {
    "title": "Recuperá el WhatsApp Block",
    "body": "Llevás 1 de 12 conversaciones por WhatsApp y el bloque ya cerró. Mientras hacés la Captación activa, mandá 3 mensajes a tibios para no perder el ritmo del día.",
    "accent": "flame",
    "cta_label": "Ver clientes tibios",
    "cta_action": { "type": "navigate", "to": "/clientes?temperatura=tibio" }
  },
  "next_action": {
    "title": "Calle / Visitas en 3h 27min",
    "body": "Revisá las visitas agendadas para hoy a la tarde y confirmá direcciones por WhatsApp con los clientes 1h antes.",
    "accent": "blue",
    "cta_label": "Ver visitas",
    "cta_action": { "type": "navigate", "to": "/visitas" }
  },
  "streak": null
}
```

Notar que la respuesta menciona "WhatsApp Block" (nombre real del bloque) y "12 conversaciones" (meta real), no "Money Block" ni "20".
