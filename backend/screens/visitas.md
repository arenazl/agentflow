---
screen: visitas
title: Agenda de visitas
applies_to: [agentflow]
---

# Qué hace esta pantalla

Tabla con todas las visitas (pasadas y futuras). Cada visita tiene
cliente + propiedad + vendedor + fecha_hora + estado (agendada,
concretada, cancelada, ausente) + resultado (interesado, no_interesado,
hizo_oferta, indeciso) + notas dictadas por voz.

# Quién la usa

- **vendedor**: ve SUS visitas.
- **gerente / admin**: ve todas.

# Datos que maneja

- `Visita` con cliente_id, propiedad_id, vendedor_id, fecha_hora,
  estado, resultado, notas_voz.
- Relación con `Cliente.temperatura` y `Propiedad.estado`.

# Decisiones del usuario

1. **¿Qué visitas tengo hoy y mañana?** Preparar info para cada una.
2. **¿Qué visitas pasadas no tienen notas cargadas?** Cerrarlas antes
   de que se enfríe la memoria.
3. **¿Qué visitas terminaron en "interesado" sin pase a pipeline?**
   Crear deal en pipeline.
4. **(filtros)** Próximas vs pasadas.

# KPIs / señales que importan

| Señal | Significado |
|---|---|
| Visitas próximas sin recordatorio enviado | mandar wa/mail |
| Visitas hace >24h sin notas | recuperar mientras está fresco |
| Visitas con resultado "interesado" sin deal en pipeline | conversión perdida |
| Visitas "ausente" reiterado del mismo cliente | flaguear cliente como "no serio" |

Industria: appointment-to-client signed = 40-50% en top performers.
Si baja, falla la presentación o el cliente está mal calificado.

# Tips que la IA debe dar

- **HOT TIP**: si hay visitas hoy con menos de 3h por delante, sugerir
  preparación (datos del cliente, propiedades similares, comparables).
  Si ya pasaron y no tienen notas: recordar cargarlas YA.
- **PRÓXIMO**: visita que termina con "interesado" sin pase a pipeline
  → sugerir crear deal con prob. 40%.
- **RESUMEN**: ratio appointment-to-client del mes + comparación con
  estándar (40-50%).

# Tips que la IA NO debe dar

- Recordatorios genéricos ("preparate para la visita") — siempre
  vinculados a datos del cliente/propiedad.
- Sugerir reagendar si no se justifica.

# Acciones accionables

- `{ type: "navigate", to: "/visitas/<id>" }` (edit + notas).
- `{ type: "navigate", to: "/clientes/<cliente_id>" }` (ficha cliente).
- `{ type: "whatsapp", phone: "+549...", text: "Recordatorio visita..." }`.
- `{ type: "action", endpoint: "POST /api/pipeline/", body: { ... } }` crear deal.

# Ejemplo de prompt resuelto

**contextData:**

```json
{
  "ahora": "2026-05-12T14:20:00",
  "visitas_proximas_3h": [
    { "id": 88, "fecha_hora": "2026-05-12T16:00:00", "cliente": "Pablo Sánchez",
      "propiedad": "Depto Palermo 2amb", "cliente_temperatura": "caliente" }
  ],
  "visitas_sin_notas_24h": [
    { "id": 76, "cliente": "Mariana Díaz", "fecha_hora": "2026-05-11T17:00:00", "estado": "concretada" }
  ],
  "visitas_interesado_sin_deal": 2,
  "ratio_apt_to_client_mes": 32
}
```

**Respuesta JSON esperada:**

```json
{
  "hot_tip": {
    "title": "Visita en 1h40 con Pablo (caliente)",
    "body": "Depto Palermo 2amb. Llevá comparables del barrio y data de expensas — Pablo ya vio la propiedad 3 veces online.",
    "accent": "flame",
    "cta_label": "Ver propiedad",
    "cta_action": { "type": "navigate", "to": "/propiedades/2576" }
  },
  "next_action": {
    "title": "Notas pendientes de ayer",
    "body": "Visita de Mariana sin notas cargadas hace 21h. Cargá ahora mientras tenés fresco lo que dijo.",
    "accent": "gold",
    "cta_label": "Cargar notas",
    "cta_action": { "type": "navigate", "to": "/visitas/76" }
  },
  "streak": {
    "title": "Apt-to-client: 32% este mes",
    "body": "El estándar de la industria es 40-50%. 2 visitas con resultado 'interesado' siguen sin deal en pipeline — crearlos sube el ratio sin esfuerzo extra.",
    "accent": "blue"
  }
}
```
