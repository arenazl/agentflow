---
screen: propiedades
title: Catálogo de propiedades
applies_to: [agentflow]
---

# Qué hace esta pantalla

Grid de cards con propiedades captadas por la oficina. Filtros por estado,
barrio, tipo, precio. Cada card muestra foto, barrio, m², ambientes,
precio, captador, badge de exclusividad/estado.

# Quién la usa

- **vendedor**: ve TODAS las propiedades (no solo las suyas) porque puede
  matchear con sus clientes.
- **gerente / admin**: ve todas + acciones de gestión.

# Datos que maneja

- `Propiedad` (titulo, descripcion, tipo, direccion, barrio, lat/lng,
  m2, ambientes, precio, estado, exclusividad, captador_id).
- `FotoPropiedad` (galería Cloudinary).
- `Autorizacion` (link con fecha_vencimiento y precio_minimo).
- `Visita` por propiedad (cuántas visitas tuvo).

# Decisiones del usuario

1. **¿Tengo cliente que matchee con esta propiedad?** Más relevante si
   la propiedad es nueva.
2. **¿Esta propiedad está bien priceada?** Days on market vs zona.
3. **(captador) ¿Bajo el precio o cambio estrategia?** Si lleva +30d
   publicada sin reservas.
4. **(filtro por barrio)** ¿Cuáles son las top de este barrio?

# KPIs / señales que importan

| Señal | Significado |
|---|---|
| dias_publicada > 30 sin reservas | priceada alta — sugerir ajuste o re-publicación |
| visitas_total > 5 sin oferta | bien priceada pero algo objetivo falla (fotos? descripción?) |
| autorizacion.vence < 15 días | renovar urgente |
| precio > 110% del promedio del barrio (mismo m2/amb) | sobrepreciada |

# Tips que la IA debe dar

- **HOT TIP**: cuando hay una propiedad seleccionada (drill-down):
  - Match con cliente de la cartera (nombre + por qué matchea).
  - Si está estancada (>30d): sugerir ajuste de precio (calcular % del comparable).
  - Si autorización vence <15d: alerta de renovación.
- **HOT TIP** (vista lista): la propiedad con mejor match-rate sin movimiento
  esta semana. Ej "Departamento Palermo 2amb sin visitas hace 10 días y matchea
  con 3 de tus clientes — agendar visitas".
- **PRÓXIMO**: sugerir la siguiente propiedad a captar según huecos de oferta
  detectados en pedidos de clientes (qué piden los clientes que NO tenés en
  catálogo).
- **RESUMEN**: % de propiedades del catálogo con visita esta semana —
  salud del flujo.

# Tips que la IA NO debe dar

- Mencionar propiedades fuera del filtro actual.
- Sugerir cambios de precio sin justificación numérica (debe haber comparable).
- Recomendar acciones administrativas (actualizar fotos) como hot tip si
  hay temas más urgentes.

# Acciones accionables

- `{ type: "navigate", to: "/propiedades/<id>" }`
- `{ type: "navigate", to: "/visitas?propiedad_id=<id>" }` para agendar.
- `{ type: "action", endpoint: "PATCH /api/propiedades/<id>", body: { precio_publicacion: <nuevo> } }`
- `{ type: "navigate", to: "/autorizaciones/<id>?accion=renovar" }`

# Ejemplo de prompt resuelto

**contextData:**

```json
{
  "filtro": { "barrio": "Palermo" },
  "total_visibles": 5,
  "propiedades_estancadas_30d": [
    {
      "id": 2576, "titulo": "Depto 2 amb. Palermo", "dias_publicada": 35,
      "precio": 145000, "comparable_promedio_barrio": 130000, "visitas_total": 1,
      "clientes_que_matchean": [
        { "id": 42, "nombre": "Pablo Sánchez" },
        { "id": 51, "nombre": "Mariana Díaz" }
      ]
    }
  ],
  "autorizaciones_por_vencer_15d": [
    { "id": 88, "propiedad_titulo": "Casa Belgrano 3amb", "dias_para_vencer": 12 }
  ]
}
```

**Respuesta JSON esperada:**

```json
{
  "hot_tip": {
    "title": "Depto Palermo lleva 35 días sin movimiento",
    "body": "Está 11% sobre el promedio del barrio (USD 145k vs USD 130k). Tenés 2 clientes que matchean. Sugerir al propietario ajuste a USD 132k.",
    "accent": "flame",
    "cta_label": "Ver propiedad",
    "cta_action": { "type": "navigate", "to": "/propiedades/2576" }
  },
  "next_action": {
    "title": "Autorización vence en 12 días",
    "body": "Casa Belgrano 3amb. Llamar al propietario para renovar antes de que se caiga.",
    "accent": "gold",
    "cta_label": "Renovar autorización",
    "cta_action": { "type": "navigate", "to": "/autorizaciones/88?accion=renovar" }
  },
  "streak": {
    "title": "5 propiedades en Palermo",
    "body": "Solo 1 con visita esta semana. El catálogo del barrio necesita oxígeno — revisar fotos y descripciones.",
    "accent": "blue"
  }
}
```
