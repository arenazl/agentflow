---
screen: dmo
title: Daily Method of Operation (vendedor inmobiliario)
applies_to: [agentflow]
---

# Qué hace esta pantalla

El vendedor inmobiliario abre esta pantalla cada mañana. Ve sus 5 bloques
horarios del día (Market Review 8-9, Money Block 9-11, Skill Building 11-12,
Dollar Productive 13-16:30, Wrap-up 16:30-17:30) en formato timeline
horizontal + cards.

A lo largo del día va marcando bloques completados y reportando
conversaciones reales del Money Block (meta default 20 por día,
configurable por gerente).

# Quién la usa

- **vendedor**: ve SU dmo del día, marca y reporta. Esta es su pantalla
  principal cada mañana.
- **gerente**: puede ver el dmo de cualquier vendedor (read-only), no marca.
  Lo usa para coachear en 1:1s.

# Datos que maneja

- `DmoBloque` — 5 bloques fijos (configurables por admin),
  campos: nombre, hora_inicio, hora_fin, descripcion, color, es_money_block.
- `DmoLog` — 1 fila por vendedor x bloque x día.
  campos: completado (bool), conversaciones_reportadas (int), notas.
- `User.meta_conversaciones_diaria` — default 20, editable por gerente.
- `Cliente` con `temperatura=caliente` y `last_contact_at` antiguo
  (>3 días = candidatos a contactar HOY).
- `Visita.fecha_hora` de hoy y mañana (sirve para sugerir prep).

# Decisiones del usuario

1. **¿Cumplo el Money Block o lo pateo?** El más sensible. La IA debe
   empujarlo a NO patearlo.
2. **¿A quién llamo en los próximos minutos?** Lead/cliente concreto,
   nombre + teléfono, motivo de prioridad.
3. **¿Qué leads se están enfriando?** Tibios sin contacto hace +7 días
   son riesgo de pérdida.
4. **¿Cómo voy contra mi meta?** Visualización + cuánto falta.
5. **¿Cómo voy contra el equipo?** Comparativa simple.

# KPIs / señales que importan

| KPI | Bien | Alarma |
|---|---|---|
| conv_hoy / meta | >= 100% | < 50% pasadas las 11h |
| bloques_completados pre-14h | >= 60% (3 de 5) | < 40% |
| Money Block completado | Sí, antes de las 11h | Sin marcar a las 11:30h |
| Streak DMO ≥ 80% | 5+ días seguidos | corte de racha (volver a 0) |
| Leads calientes sin contactar >3d | 0 | >= 2 |

Industria: 20 conv/día es el estándar de top performers (Tom Ferry,
Landvoice). Speed-to-lead <1h multiplica x7 la conversión.

# Tips que la IA debe dar

- **HOT TIP**: lo más impactante. Tres modos según contexto:
  1. Si `conv_hoy < meta * 0.8`: nombrar UN cliente caliente concreto
     (nombre, teléfono, motivo de prioridad) que el vendedor pueda
     llamar AHORA. Accent `flame`. CTA `llamada` o `whatsapp`.
  2. Si `conv_hoy >= meta`: felicitar y sugerir escalar UN cliente tibio
     hacia calificación. Accent `gold`. CTA `navigate` al cliente.
  3. Si hay leads calientes sin contactar +3 días: prioridad TOTAL.
     Accent `flame`. CTA llamada.

- **PRÓXIMO**: countdown al siguiente bloque por hora_inicio + sugerencia
  específica de qué preparar en ese bloque:
  - Skill Building → "postear estas 2 propiedades nuevas en IG"
    (listar ids reales si los hay).
  - Dollar Productive → si hay visitas hoy, recordar dirección + cliente.
  - Wrap-up → recordar cargar las notas de visita pendientes.
  Accent `blue`.

- **RESUMEN**: streak actual + récord histórico + frase concreta corta.
  Si la racha está activa (≥5 días): celebrar.
  Si se cortó hoy: motivar a empezar nueva.
  Accent `gold` o `ok`.

# Tips que la IA NO debe dar

- "Llamá a tus clientes" (genérico, sin nombre).
- "Esforzate" / "Vos podés" / motivación vacía sin data.
- Mencionar clientes/propiedades que NO estén en el contextData
  (alucinación).
- Sugerir acciones que requieran salir de la pantalla DMO sin un CTA
  navegable.
- Repetir el mismo tip dos refreshes seguidos (cachear y rotar).

# Acciones accionables (CTAs disponibles)

- `{ type: "navigate", to: "/clientes/<id>" }` — abrir ficha de cliente.
- `{ type: "llamada", phone: "+549..." }` — abre tel: link.
- `{ type: "whatsapp", phone: "+549...", text: "..." }` — abre wa.me con mensaje pre-armado.
- `{ type: "action", endpoint: "POST /api/dmo/log", body: { bloque_id, completado: true } }` — marcar bloque inline sin navegar.

# Ejemplo de prompt resuelto

**contextData:**

```json
{
  "conv_hoy": 14,
  "meta": 20,
  "completados": 3,
  "total_bloques": 5,
  "hora": "10:30",
  "siguiente_bloque": { "id": 3, "nombre": "Skill Building", "hora_inicio": "11:00" },
  "money_block_done": true,
  "leads_calientes_pendientes": [
    { "id": 42, "nombre": "Pablo Sánchez", "tel": "+5491140001234", "motivo": "Vio propiedad #2576 tres veces esta semana, no pidió info" }
  ],
  "streak_dias": 7,
  "streak_record": 12
}
```

**Respuesta JSON esperada:**

```json
{
  "hot_tip": {
    "title": "Te faltan 6 conversaciones para la meta",
    "body": "Llamá a Pablo Sánchez. Vio la propiedad #2576 tres veces esta semana y no pidió info. Es la jugada más caliente que tenés ahora.",
    "accent": "flame",
    "cta_label": "Llamar a Pablo",
    "cta_action": { "type": "llamada", "phone": "+5491140001234" }
  },
  "next_action": {
    "title": "Skill Building en 30 min",
    "body": "Aprovechá para postear las 2 propiedades que captaste esta semana en IG. Texto sugerido listo si lo querés.",
    "accent": "blue",
    "cta_label": "Ir a propiedades",
    "cta_action": { "type": "navigate", "to": "/propiedades?filter=mias_recientes" }
  },
  "streak": {
    "title": "7 días en racha",
    "body": "Vas para tu récord (12). Si cumplís hoy ≥ 16/20 conv y cerrás los 5 bloques, mantenés la racha.",
    "accent": "gold",
    "cta_label": null,
    "cta_action": null
  }
}
```
