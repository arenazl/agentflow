---
screen: autorizaciones
title: Autorizaciones de venta (captaciones)
applies_to: [agentflow]
---

# Qué hace esta pantalla

Tabla con todas las autorizaciones de venta firmadas por propietarios. Cada
autorización vincula una `Propiedad` con un `captador` (User) durante un
período (fecha_firma → fecha_vencimiento), define precio mínimo, comisión y
si es exclusividad o no.

Es la pantalla más sensible legalmente: sin autorización vigente no hay
derecho a comisión cuando se cierra una operación.

# Quién la usa

- **captador (vendedor)**: ve LAS SUYAS y las que tenga compartidas.
- **gerente / admin**: ve todas, alerta de vencimientos del equipo.

# Datos que maneja

- `Autorizacion` (propiedad_id, captador_id, fecha_firma, fecha_vencimiento,
  precio_minimo, moneda, comision_pct, exclusividad, pdf_url, observaciones, estado).
- Estados: `activa` / `vencida` / `ejecutada` / `cancelada`.
- Relación con `Propiedad` (titulo) y `User` (captador).

# Decisiones del usuario

1. **¿Qué autorizaciones vencen pronto?** Si vence en <15d, llamar al
   propietario para renovar AHORA.
2. **¿Hay autorizaciones vencidas todavía marcadas como `activa`?**
   Limpiar el estado.
3. **¿Las propiedades exclusivas están todas con autorización vigente?**
   Si una propiedad publicada no tiene autorización activa → riesgo de
   pelea de comisión.

# KPIs / señales que importan

| Señal | Significado |
|---|---|
| `vence_en` < 15 días | renovar urgente |
| `vence_en` < 0 (ya vencida) y estado = activa | inconsistencia, limpiar |
| Propiedad `publicada` sin autorización vigente | riesgo legal |
| Comisión promedio en el equipo | benchmark interno |

Industria AR: comisión típica 3-5%, exclusividad pesa más cuando el corredor
invierte en marketing y open house.

# Tips que la IA debe dar

- **HOT TIP**: la autorización con menos días para vencer (entre las
  activas). Nombre del propietario (si está en `observaciones`) o título de
  la propiedad + días restantes + acción concreta de renovación.
- **PRÓXIMO**: si hay propiedades publicadas sin autorización activa,
  flagearlas. Si no, sugerir captaciones nuevas según huecos del catálogo.
- **RESUMEN**: cuántas activas / vencidas / próximas a vencer; comisión
  promedio del mes vs equipo.

# Tips que la IA NO debe dar

- Mencionar autorizaciones que no existan en el contextData.
- Sugerir captar más sin data (no decir "captá más propiedades" en seco).
- Hablar de propiedades por id que no estén listadas.

# Acciones accionables

- `{ type: "navigate", to: "/autorizaciones/<id>" }` (ver / editar).
- `{ type: "navigate", to: "/propiedades/<id>" }` (ver propiedad).
- `{ type: "action", endpoint: "PATCH /api/autorizaciones/<id>", body: { fecha_vencimiento: "..." } }` (renovar inline).
- `{ type: "llamada", phone: "+549..." }` si está el teléfono del propietario.

# Ejemplo de prompt resuelto

**contextData:**

```json
{
  "rol": "captador",
  "total_activas": 12,
  "total_vencidas_no_limpiadas": 1,
  "proximas_a_vencer_15d": [
    { "id": 88, "propiedad_titulo": "Casa Belgrano 3amb", "dias_para_vencer": 12, "captador_nombre": "Lautaro Perez" }
  ],
  "vencidas_no_limpiadas": [
    { "id": 60, "propiedad_titulo": "Depto Caballito 1amb", "dias_vencida": 8 }
  ],
  "comision_promedio_pct": 4.1
}
```

**Respuesta JSON esperada:**

```json
{
  "hot_tip": {
    "title": "Casa Belgrano vence en 12 días",
    "body": "Autorización #88 de Casa Belgrano 3amb. Llamar al propietario YA para renovar antes de que se caiga.",
    "accent": "flame",
    "cta_label": "Ver autorización",
    "cta_action": { "type": "navigate", "to": "/autorizaciones/88" }
  },
  "next_action": {
    "title": "1 autorización vencida sin limpiar",
    "body": "La #60 (Depto Caballito) está vencida hace 8 días pero figura como activa. Cambiar estado a 'vencida' para no falsear el ranking.",
    "accent": "gold",
    "cta_label": "Limpiar estado",
    "cta_action": { "type": "navigate", "to": "/autorizaciones/60" }
  },
  "streak": {
    "title": "12 autorizaciones activas",
    "body": "Comisión promedio: 4.1%. Estás en línea con el equipo (industria AR: 3-5%).",
    "accent": "ok"
  }
}
```
