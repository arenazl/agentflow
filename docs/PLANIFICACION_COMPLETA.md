# AgentFlow — Planificación completa hasta MVP terminado

**Audiencia:** Lucas (dev/owner técnico) + Pato Benitez Bagur (dueño negocio Beyker).
**Fecha:** mayo 2026.
**Objetivo:** detallar TODO lo que falta para dejar AgentFlow "de pies a cabeza", módulo por módulo, con DMOs por rol diseñados, ABMs nuevos, esfuerzo estimado y orden de implementación.

---

## 1. Visión del producto (la base sobre la que se apoya todo)

AgentFlow es **manual de procedimientos diario + análisis de cumplimiento** para inmobiliarias. No es un sistema de premios — los premios son una capa opcional encima.

**Tres pilares:**

1. **Manual diario por rol (DMO).** Cada persona de la oficina tiene su rutina horaria configurable: vendedor, coordinador, gerente, recluter, captador. Bloques con horarios y metas numéricas concretas. Es la disciplina operativa.

2. **Análisis profundo del cumplimiento.** Histórico, racha, comparativas, detección de patrones, leads enfriándose. Es lo que NINGÚN CRM del mercado tiene incorporado y nuestro foso defensivo.

3. **Capa de incentivos (opcional).** Puntos, premios, castigos atados a métricas del manual. Va arriba, no es el corazón.

Todo lo que viene a continuación se ordena en función de esos tres pilares.

---

## 2. Estado actual (qué YA está hecho)

### Backend
- DMO dinámico completo: Coach, DmoTemplate, DmoBloque, VendedorDmoAssignment, DmoLog.
- 5 coaches seedados con investigación (Beyker AR, Tom Ferry, Mike Ferry, Buffini, Workman).
- ABMs REST: `/api/coaches/`, `/api/dmo-templates/` (con clone), `/api/dmo-assignments/`.
- CRM operativo: clientes, propiedades (con stock propio y oficina via campo captador_id), visitas, autorizaciones, pipeline kanban con las 6 etapas legales AR.
- Auth JWT, roles (admin/gerente/vendedor).
- Dashboard con KPIs en vivo y ranking de vendedores.

### Frontend
- Páginas: Dashboard, DMO (dinámico), Clientes, Propiedades, Visitas, Pipeline, Autorizaciones, Configuración, Coaches, Templates DMO, Asignaciones DMO, Inbox (en progreso).
- Layout responsive, theme light/dark con CSS vars.
- Voz dictada (Web Speech API).
- AI Coach contextual (Gemini) ya agnóstico al template.

### Infra
- Backend en Heroku auto-deploy desde GitHub Actions.
- Frontend en Netlify (`agentflow-beyker.netlify.app`).
- BD en Aiven MySQL.
- 5 vendedores demo con templates asignados (3 Beyker AR, 1 Buffini, 1 Tom Ferry).

---

## 3. Lo que falta — clasificado por pilar

### Pilar 1: Manual diario por rol (DMO) — completar templates reales

La **estructura** está. Falta cargar los **DMOs específicos de Beyker para cada rol**.

**Roles a cubrir y DMOs propuestos** (ajustables con Pato):

#### 3.1 Vendedor / Asesor

Ya cargado el "DMO Argentina (Beyker)" como default. Mantener.

| Hora | Bloque | Métrica | Meta |
|---|---|---|---|
| 08:30-09:00 | Apertura | checkbox | revisar portales/leads/agenda |
| 09:00-10:30 | WhatsApp Block (money block) | Conversaciones | 12 |
| 10:30-11:30 | Captación activa | Contactos cálidos | 5 |
| 14:00-17:00 | Calle / Visitas | Visitas o reuniones | 1 |
| 17:30-18:30 | Cierre | checkbox | cargar CRM, agenda mañana |

#### 3.2 Coordinador (soporte ventas + administrativo)

Falta crear. Propuesta:

| Hora | Bloque | Métrica | Meta |
|---|---|---|---|
| 08:30-09:30 | Apertura administrativa | checkbox | revisar carga de la noche, mails, urgentes |
| 09:30-11:00 | Control de pipeline | Deals revisados | 15 |
| 11:00-12:30 | Coordinación de visitas | Confirmaciones | 100% visitas día |
| 14:00-16:00 | Carga + publicación (money block) | Propiedades cargadas/actualizadas | 3 |
| 16:00-17:30 | Soporte a vendedores | checkbox | resolver pedidos del equipo |
| 17:30-18:00 | Reporte a gerencia | checkbox | enviar KPIs del día |

#### 3.3 Gerente

Falta crear. Foco análisis + coaching + decisión, no operativo:

| Hora | Bloque | Métrica | Meta |
|---|---|---|---|
| 08:30-09:00 | Revisión KPIs oficina | checkbox | abrir dashboard, identificar focos |
| 09:00-10:00 | 1:1 del día (rotativo) | Asesor coacheado | 1 |
| 10:00-11:30 | Captación inmueble propio (money block) | Contactos cálidos | 4 |
| 14:00-16:00 | Decisiones estratégicas | checkbox | reuniones, alianzas, contratos |
| 16:00-17:00 | Review de deals abiertos | Deals revisados | 10 |
| 17:00-18:00 | Cierre + planificación | checkbox | armar agenda equipo día siguiente |

#### 3.4 Recluter

Falta crear. Pipeline propio de captación de talento:

| Hora | Bloque | Métrica | Meta |
|---|---|---|---|
| 09:00-09:30 | Apertura | checkbox | revisar pipeline candidatos, LinkedIn |
| 09:30-11:00 | Outreach (money block) | Mensajes a candidatos | 25 |
| 11:00-12:30 | Entrevistas | Entrevistas hechas | 2 |
| 14:00-15:30 | Seguimiento pipeline reclutamiento | Candidatos avanzados etapa | 5 |
| 15:30-17:00 | Onboarding nuevos | checkbox | acompañar los que entran |
| 17:00-17:30 | Reporting + cierre | checkbox | armar reporte semanal |

#### 3.5 Captador / Lister (si Beyker lo tiene separado del vendedor)

| Hora | Bloque | Métrica | Meta |
|---|---|---|---|
| 08:30-09:00 | Apertura | checkbox | zona a trabajar hoy, leads expirados |
| 09:00-10:30 | Geo-farm (money block) | Contactos en zona | 15 |
| 10:30-12:00 | Tasaciones / CMA | CMAs preparados | 2 |
| 14:00-16:30 | Visitas de captación | Visitas + autorizaciones | 1+ |
| 16:30-17:30 | Carga al CRM | checkbox | subir captaciones del día |
| 17:30-18:00 | Cierre | checkbox | armar zona mañana |

**Decisión a tomar con Pato:** ¿Captador es rol separado o lo cubre el vendedor en su DMO?

#### Esfuerzo
- Cargar los 5 DMOs en la app: **1 tarde** (4-5 hs) sentado con Pato definiendo bloques específicos.
- Crear nuevo coach "Beyker Custom" agrupando los 5 templates: incluido.

---

### Pilar 2: Análisis profundo — módulos analíticos faltantes

Lo que diferencia AgentFlow del resto. Hoy hay KPIs en el dashboard pero falta el análisis pesado.

#### 3.6 Histórico DMO por vendedor (módulo nuevo)

- Pantalla `/dmo/historico/:vendedor_id` con vista calendario heat-map de cumplimiento.
- Por día, qué bloques completó, valor de cada métrica, % cumplimiento global.
- Filtros: rango de fechas, bloque específico, comparar con promedio del equipo.
- **Endpoints:** `GET /api/dmo/historico?vendedor_id=X&desde=&hasta=`.
- **Esfuerzo:** 2 días.

#### 3.7 Racha y streaks

- Cada vendedor tiene su racha (días consecutivos con DMO ≥ 80% completo).
- Récord histórico personal.
- Alerta visual cuando se corta la racha.
- **Modelo:** tabla `vendedor_streak` (vendedor_id, dias_actual, record, ultima_actualizacion).
- **Esfuerzo:** 1 día.

#### 3.8 Detección de patrones (semi-automática)

- "Federico llega tarde al Money Block los lunes" (3 lunes consecutivos).
- "Camila baja un 40% los viernes vs el promedio."
- "Romina lleva 5 días sin hacer 1 visita."
- Job cron diario que analiza los logs y genera alertas en una tabla `coaching_alerts`.
- Visible en el dashboard del gerente.
- **Esfuerzo:** 3 días.

#### 3.9 Comparativas (asesor vs equipo, mes vs mes)

- Vista tipo radar: "Tu cumplimiento por bloque vs promedio del equipo".
- Tendencia mensual de cada vendedor.
- Identificación de "fortalezas" y "debilidades" estructurales.
- **Esfuerzo:** 2 días.

#### 3.10 Coaching Dashboard del gerente

Reemplaza el dashboard actual con vista enfocada en decisión:

- Top 3 asesores en peligro (racha cortada / cumplimiento bajo).
- Sugerencias automáticas de 1:1 ("Pato, hablá con Federico — 5 días seguidos sin completar la Captación").
- Comparativa rápida del equipo.
- KPIs financieros (cuando esté el módulo de comisiones).
- **Esfuerzo:** 2 días.

---

### Pilar 3: Sistema de incentivos (opcional pero pedido por Pato)

#### 3.11 ABM de Objetivos

Vendedor tiene N objetivos (anual, mensual, trimestral) con metas y tracking.

**Modelo:**
```
Objetivo
├── id, vendedor_id, tipo (anual | mensual | trimestral | custom)
├── nombre ("1 desarrollo al mes", "12 operaciones año", "USD 50k GCI")
├── metrica_tipo (cantidad | monto)
├── meta_valor
├── fecha_inicio, fecha_fin
└── activo

ObjetivoLog
├── objetivo_id, fecha
├── valor_acumulado (calculado o manual)
└── notas
```

**ABM:**
- `/objetivos` admin/gerente: crea objetivos por vendedor o por rol.
- Vendedor ve sus objetivos en su pantalla con barra de avance.

**Esfuerzo:** 2-3 días.

#### 3.12 ABM de Reglas de puntos

Definir qué actividad da cuántos puntos.

**Modelo:**
```
ReglaPuntos
├── id, nombre, descripcion
├── evento (ej: 'dmo_bloque_completado', 'money_block_completado',
│           'visita_concretada', 'deal_a_reserva', 'objetivo_cumplido')
├── puntos
└── activo
```

**Eventos posibles:**
- Completar bloque DMO no-money-block: 5 puntos
- Completar money block: 20 puntos
- DMO ≥ 90% del día: 50 puntos
- Racha de 5 días seguidos: 100 puntos bonus
- Visita concretada: 30 puntos
- Deal pasa a Reserva: 200 puntos
- Deal a Boleto: 500 puntos
- Deal a Escrituración: 1000 puntos
- Captación firmada: 150 puntos
- Objetivo mensual cumplido: 500 puntos

**ABM:** admin/gerente edita las reglas. Vendedor solo las ve.

**Esfuerzo:** 2 días.

#### 3.13 Wallet de puntos por vendedor

**Modelo:**
```
PuntosLedger
├── id, vendedor_id
├── fecha, evento, regla_id
├── puntos (+/-)
├── motivo (descripcion human-readable)
└── ref_id (ej: bloque_id, deal_id que generó el punto)
```

- Job que se dispara al guardar un log DMO o cambiar etapa de pipeline → aplica las reglas activas.
- Vendedor ve su balance + historial.
- Gerente ve ranking de puntos.

**Esfuerzo:** 2 días.

#### 3.14 ABM de Premios (catálogo de canjes)

**Modelo:**
```
Premio
├── id, nombre, descripcion, foto_url
├── costo_puntos
├── stock (nullable = ilimitado)
└── activo

CanjePremio
├── id, vendedor_id, premio_id
├── puntos_descontados
├── fecha
├── estado (pendiente | aprobado | entregado | rechazado)
└── notas
```

Ejemplos pre-cargados:
- Día libre: 1500 puntos
- Cena para 2: 800 puntos
- Voucher Visa USD 100: 2000 puntos
- Curso de capacitación: 1200 puntos

**ABM** admin/gerente. **Pantalla** del vendedor con catálogo + canje + estado.

**Esfuerzo:** 2 días.

#### 3.15 ABM de Castigos (opcional)

Mismo modelo que premios pero negativo. Más controversial, hablarlo con Pato antes de implementarlo. Capaz se reemplaza por "alertas al gerente" en vez de descuento real.

**Esfuerzo:** 1 día si se decide hacer.

---

### Pilar 4: Módulos financieros faltantes

#### 3.16 Comisiones y splits

Beyker es franquicia — cada deal tiene comisión, split franquicia/agente, retenciones.

**Modelo:**
```
Comision
├── id, deal_id
├── monto_operacion, moneda
├── pct_comision_total (sobre operación)
├── monto_comision_total
├── split_franquicia_pct, split_franquicia_monto
├── split_agente_pct, split_agente_monto
├── retencion_iva_pct, retencion_iva_monto
├── retencion_iibb_pct, retencion_iibb_monto
├── neto_agente
├── estado (pendiente | liquidada | cobrada)
└── fecha_liquidacion
```

**Endpoints:** ABM `/api/comisiones/` + reporte mensual.

**Pantalla:** `/comisiones` admin/gerente con tabla + cálculo automático. Vendedor ve solo las suyas.

**Esfuerzo:** 3 días.

#### 3.17 Cálculo de puntas

"Puntas" = cuándo Beyker representa al comprador, al vendedor, o ambos (doble punta) en una operación.

**Modelo:**
- Agregar campos a `PipelineDeal`: `punta` (comprador | vendedor | doble).
- Reporte "promedio de puntas por asesor mensual".

**Esfuerzo:** 1 día.

#### 3.18 Diagnóstico inicial por asesor

Pato lo mencionó. Es la foto del punto de partida cuando un asesor entra a la oficina.

**Modelo:**
```
DiagnosticoAsesor
├── id, vendedor_id, fecha
├── experiencia_anios
├── operaciones_ultimo_anio
├── gci_ultimo_anio
├── fortalezas (text: captación, ventas, presentación, etc.)
├── debilidades (text)
├── tipos_propiedad_fuertes (text)
├── zonas_dominio (text)
├── horas_disponibles_dia
├── meta_anual_propuesta
└── observaciones_gerente
```

**Pantalla:** form de carga en alta de asesor + visible en su perfil.

**Esfuerzo:** 1 día.

---

### Pilar 5: Integraciones externas

#### 3.19 Tokko Broker (sync de propiedades)

Documentado en `docs/INVESTIGACION_E_IMPLEMENTACION.md` y README. Necesitamos el token. Mientras tanto usar snapshot estático.

**Esfuerzo:** 1 día cuando se tenga el token.

#### 3.20 WhatsApp Business + bot lead capture

Documentado en `docs/INVESTIGACION_E_IMPLEMENTACION.md` sección 3.

**Fase 1 — Inbox compartido:** ya hay `Inbox.tsx` en progreso. Falta integrar Meta Cloud API.

**Esfuerzo total:** 6-8 semanas (3 fases).

#### 3.21 Cloudinary fotos (ya está, sin laburo extra)

#### 3.22 Brevo SMTP para mails transaccionales (ya está)

---

### Pilar 6: Compliance argentino

#### 3.23 Datos legales del corredor

Agregar a `User`:
- matricula_cucicba (string)
- jurisdiccion (CABA | provincia + departamental)
- inscripcion_iibb
- afip_iva | monotributo

#### 3.24 Generación de boletos y reservas

PDF generado desde la app con datos del CRM auto-completados. Plantillas legales argentinas validadas.

**Esfuerzo:** 3-4 días con asesoramiento legal.

#### 3.25 Tracking de escribano y plazo 45 días

Agregar a `PipelineDeal`:
- escribano_nombre
- escribano_matricula
- fecha_escritura
- fecha_limite_inscripcion_45d (calculada)
- inscripta (bool)

**Esfuerzo:** 1 día.

---

## 4. Orden de implementación recomendado

### Fase A — Terminar el pilar 1 (esta semana)

1. Sentarse con Pato 1h y bajar los DMOs por rol reales de Beyker.
2. Cargar los 5 templates (vendedor, coordinador, gerente, recluter, captador).
3. Asignar a cada empleado real su template.

**Tiempo total:** 1 día.

### Fase B — Análisis (pilar 2) — 2 semanas

4. Histórico DMO con calendario heat-map.
5. Sistema de racha + récord.
6. Patrones automáticos básicos.
7. Coaching dashboard.
8. Comparativas asesor vs equipo.

### Fase C — Incentivos (pilar 3) — 2 semanas

9. ABM Objetivos.
10. ABM Reglas de puntos.
11. Wallet de puntos.
12. ABM Premios + canjes.
13. (Opcional) ABM Castigos.

### Fase D — Financiero (pilar 4) — 1.5 semanas

14. Comisiones y splits.
15. Puntas.
16. Diagnóstico inicial.

### Fase E — Compliance AR (pilar 6) — 1 semana

17. Datos legales del corredor.
18. Tracking escribano + plazo 45 días.
19. Generación de boletos/reservas en PDF (opcional, con asesoramiento legal).

### Fase F — Integraciones (pilar 5) — variable

20. Tokko sync (1 día cuando llega el token).
21. WhatsApp Business + bot (6-8 semanas, en paralelo a otras fases).

---

## 5. Estimación total

| Fase | Duración | Resultado |
|---|---|---|
| A — DMOs reales | 1 día | App lista para usar en Beyker |
| B — Análisis | 2 semanas | Diferencial competitivo activado |
| C — Incentivos | 2 semanas | Lo que Pato pidió cubierto |
| D — Financiero | 1.5 semanas | Comisiones y diagnóstico |
| E — Compliance AR | 1 semana | Profesionalización legal |
| F — Integraciones | variable | Tokko + WhatsApp |

**MVP funcional completo de Beyker (A + B + C + D): ~5-6 semanas.**

WhatsApp + IA agéntica suma 6-8 semanas más en paralelo, no bloquea las otras fases.

---

## 6. Tres preguntas críticas que necesitamos resolver con Pato antes de avanzar

1. **¿Captador es rol separado o lo cubre el vendedor?** Define si son 4 o 5 DMOs.
2. **¿Modelo de puntos?** Qué actividades suman, qué premios desbloquea, cómo se mantiene fair el sistema entre roles distintos (la recluter no captura propiedades, ¿gana menos puntos siempre?).
3. **¿Cómo calcula Beyker las puntas y los splits?** Determina el módulo financiero.

Con esas 3 respuestas, el MVP completo arranca solo y se cierra en 5-6 semanas.

---

*Documento de planificación. Mayo 2026. Actualizable a medida que se resuelven decisiones con el dueño del negocio.*
