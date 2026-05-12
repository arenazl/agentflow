---
screen: clientes
title: Lista de clientes (ABM)
applies_to: [agentflow]
---

# Qué hace esta pantalla

ABM de clientes. Tabla con filtros por estado, temperatura, origen, vendedor.
Cada cliente tiene preferencias de búsqueda (zona, ambientes, presupuesto)
+ historial de interacciones + notas dictadas por voz.

# Quién la usa

- **vendedor**: ve solo SUS clientes asignados (round-robin).
- **gerente / admin**: ve todos, puede reasignar.

# Datos que maneja

- `Cliente` con estado (nuevo → contactado → calificado → cita →
  propuesta → cerrado/perdido), temperatura (caliente/tibio/frío),
  origen (web/walk_in/referido/portales/redes), `last_contact_at`,
  preferencias (zona, m2, ambientes, presupuesto), notas.
- Relación con `Visita` y `PipelineDeal` (cuántas tiene cada cliente).

# Decisiones del usuario

1. **¿Cuál cliente atender primero?** Caliente sin contactar > tibio
   por escalar > nuevo por calificar.
2. **¿Hay match con alguna propiedad nueva?** Cliente con preferencias
   que matcheen propiedad publicada esta semana.
3. **(filtros aplicados)** Si filtró por estado=nuevo, ¿cuáles arrancar?

# KPIs / señales que importan

- **Speed-to-lead**: cliente con estado=nuevo creado hace >1h sin contactar = alarma.
- **Calientes durmiendo**: temperatura=caliente + last_contact_at >3d = riesgo de pérdida.
- **Tibios viejos**: temperatura=tibio + last_contact_at >14d = re-engagement o archivar.
- **Match imperdible**: cliente cuyas preferencias matcheen ≥1 propiedad nueva
  de la última semana.

# Tips que la IA debe dar

- **HOT TIP**: el cliente más rentable de tocar AHORA según el filtro
  aplicado. Nombre + por qué + acción concreta (llamada / wa).
- **PRÓXIMO**: si el contexto incluye un cliente seleccionado (drill-down),
  sugerir la próxima acción concreta para ESE cliente (ej "agendá visita
  a la propiedad #2576 que matchea su búsqueda").
- **RESUMEN**: cuántos clientes están "vivos" (interactuaron <7d) vs total —
  salud de la cartera del vendedor.

# Tips que la IA NO debe dar

- Cliente que no está en la lista filtrada actual.
- Estadísticas globales si el vendedor filtró por uno suyo.
- Sugerir "actualizar datos" o tareas administrativas como hot tip.

# Acciones accionables

- `{ type: "navigate", to: "/clientes/<id>" }`
- `{ type: "llamada", phone: "+549..." }`
- `{ type: "whatsapp", phone: "+549...", text: "..." }`
- `{ type: "action", endpoint: "PATCH /api/clientes/<id>", body: { estado: "contactado" } }`

# Ejemplo de prompt resuelto

**contextData:**

```json
{
  "rol": "vendedor",
  "filtro_aplicado": { "estado": "todos" },
  "total_visibles": 12,
  "calientes_sin_contactar_3d": [
    { "id": 42, "nombre": "Pablo Sánchez", "tel": "+549...", "last_contact_at": "hace 5 días" }
  ],
  "tibios_viejos": 3,
  "nuevos_sin_contactar_1h": 1,
  "propiedades_nuevas_7d": [
    { "id": 2576, "barrio": "Palermo", "ambientes": 2, "precio": 145000 }
  ]
}
```

**Respuesta JSON esperada:**

```json
{
  "hot_tip": {
    "title": "Pablo Sánchez lleva 5 días sin contactar",
    "body": "Es caliente y tu sistema lo flagged dos veces esta semana. Llamada ahora antes de que enfríe.",
    "accent": "flame",
    "cta_label": "Llamar a Pablo",
    "cta_action": { "type": "llamada", "phone": "+549..." }
  },
  "next_action": {
    "title": "1 lead nuevo sin contactar en 1h",
    "body": "Speed-to-lead < 1h multiplica x7 la conversión. Es el siguiente movimiento después de Pablo.",
    "accent": "blue",
    "cta_label": "Ver lead nuevo",
    "cta_action": { "type": "navigate", "to": "/clientes?filter=nuevos_sin_contactar" }
  },
  "streak": {
    "title": "9 de 12 clientes vivos",
    "body": "75% de tu cartera activa esta semana. 3 tibios viejos están enfriándose — revisarlos el viernes en wrap-up.",
    "accent": "ok"
  }
}
```
