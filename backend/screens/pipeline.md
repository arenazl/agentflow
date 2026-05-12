---
screen: pipeline
title: Pipeline Kanban de deals
applies_to: [agentflow]
---

# Qué hace esta pantalla

Kanban con 6 columnas (etapas legales AR: Captado → Publicado → Visita →
Reserva → Boleto → Escrituración). Cada card es un deal (cliente +
propiedad + vendedor + precio negociado + comisión + probabilidad).
Drag & drop entre columnas.

# Quién la usa

- **vendedor**: ve SUS deals.
- **gerente / admin**: ve todos los deals de la oficina.

# Datos que maneja

- `PipelineDeal` (cliente_id, propiedad_id, vendedor_id, etapa, precio_negociado,
  comision_estimada, probabilidad_pct, fecha_estimada_cierre, updated_at).
- Métricas derivadas: comisión total por etapa, días en cada etapa,
  age del deal.

# Decisiones del usuario

1. **¿Qué deal empujar HOY?** El más maduro (etapa avanzada) que lleva
   más tiempo sin movimiento.
2. **¿Qué deal está enfermo?** Atascado en una etapa más del benchmark.
3. **(gerente) ¿Qué columna es el cuello de botella?** Visita o Reserva
   acumulando deals sin pasar.
4. **¿Pipeline value tendría que crecer?** Sugerir captar más o calificar más.

# KPIs / señales que importan

| Etapa | Tiempo "normal" | Tiempo "alarma" |
|---|---|---|
| Captado → Publicado | <7 días | >14 días |
| Publicado → Visita | <14 días | >30 días |
| Visita → Reserva | <14 días | >30 días |
| Reserva → Boleto | <7 días | >14 días |
| Boleto → Escrituración | 30-60 días | >90 días |

Probabilidades canónicas: captado 10% / publicado 25% / visita 40% /
reserva 70% / boleto 90% / escrituración 100%.

# Tips que la IA debe dar

- **HOT TIP**: el deal con MAYOR probabilidad de cierre + días estancado.
  Acción concreta para destrabarlo. Ej "Deal #14 lleva 21d en 'reserva',
  con USD 8k de comisión esperada — llamar al cliente HOY para acordar
  fecha de boleto".
- **PRÓXIMO**: si hay deals nuevos en 'captado' sin acción, sugerir el
  próximo movimiento (publicar fotos, alta en portales, etc.).
- **RESUMEN**: pipeline value total + variación 7d + cuántos cerraron
  esta semana.

# Tips que la IA NO debe dar

- Mover deals por la IA sin acción del usuario.
- Sugerir cambios de probabilidad sin justificación.
- Listar TODOS los deals (la pantalla ya los muestra) — siempre UNO concreto.

# Acciones accionables

- `{ type: "navigate", to: "/pipeline/<id>" }` (detalle del deal).
- `{ type: "navigate", to: "/clientes/<cliente_id>" }`.
- `{ type: "llamada", phone: "+549..." }`.
- `{ type: "action", endpoint: "PATCH /api/pipeline/<id>", body: { etapa: "<siguiente>" } }`.

# Ejemplo de prompt resuelto

**contextData:**

```json
{
  "rol": "vendedor",
  "deals_por_etapa": { "captado": 3, "publicado": 5, "visita": 6, "reserva": 3, "boleto": 2, "escrituracion": 1 },
  "pipeline_value_usd": 84000,
  "cambio_7d_pct": -3,
  "deal_mas_maduro_estancado": {
    "id": 14, "cliente": "Mariana Díaz", "propiedad": "Depto Palermo 2amb",
    "etapa": "reserva", "dias_estancado": 21, "comision_estimada": 8200, "telefono": "+549..."
  },
  "deals_recien_captados_sin_publicar": 2,
  "cerrados_esta_semana": 1
}
```

**Respuesta JSON esperada:**

```json
{
  "hot_tip": {
    "title": "Deal de Mariana lleva 21 días en 'reserva'",
    "body": "USD 8.2k de comisión esperada. Llamar HOY para acordar fecha de boleto antes de que se caiga.",
    "accent": "flame",
    "cta_label": "Llamar a Mariana",
    "cta_action": { "type": "llamada", "phone": "+549..." }
  },
  "next_action": {
    "title": "2 propiedades captadas sin publicar",
    "body": "Pasarlas a 'publicado' es el movimiento más barato del día — sube tu pipeline value 25%.",
    "accent": "gold",
    "cta_label": "Ver captados",
    "cta_action": { "type": "navigate", "to": "/pipeline?etapa=captado" }
  },
  "streak": {
    "title": "USD 84k en pipeline (−3% vs semana)",
    "body": "1 cerrado esta semana. La caída de 3% es saludable si los deals atrás están avanzando — revisar el deal de Mariana primero.",
    "accent": "blue"
  }
}
```
