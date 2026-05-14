# Base de conocimiento del bot WhatsApp

Estos archivos son la **fuente de verdad** del bot conversacional de Beyker. Se cargan automáticamente en el system prompt de Gemini cada vez que el bot responde.

## Cómo se usan

`services/whatsapp_bot.py` lee todos los `*.md` de este directorio al inicio del proceso y los concatena al prompt del bot. Cualquier cambio en estos archivos se refleja al reiniciar el backend.

## Archivos

| Archivo | Qué contiene |
|---|---|
| `beyker_identidad.md` | Quiénes somos, filosofía, diferencial |
| `beyker_contacto.md` | Dirección, teléfonos, horarios |
| `beyker_servicios.md` | Qué hacemos (compra, venta, alquiler, tasación) |
| `beyker_comisiones.md` | Honorarios y valores estándar |
| `beyker_proceso.md` | Las 6 etapas legales AR explicadas para clientes |
| `beyker_zonas.md` | Zonas donde operamos |
| `beyker_faq.md` | 20+ preguntas frecuentes con respuesta |
| `beyker_tono.md` | Cómo escribe el bot (tono, qué nunca hace, ejemplos) |

## Reglas para editar

1. **Lenguaje natural, no técnico.** Estos archivos los puede editar Pato sin tocar código.
2. **Sin info inventada.** Si no tenés un dato confirmado (teléfono real, precio real), poné `[COMPLETAR]` y el bot va a derivar al humano cuando le pregunten eso.
3. **Sin emojis.** El bot no usa emojis, vos tampoco acá.
4. **Cortito y claro.** El bot lee todo esto en cada respuesta — si el MD es muy largo, gasta tokens innecesarios.
5. **Lo que cambia minuto a minuto NO va acá.** Eso son las tools (`buscar_propiedades`, `agendar_visita`, etc.) que consultan la DB real.

## Cómo agregar info nueva

1. Editá el `.md` correspondiente (o creá uno nuevo si es una categoría diferente).
2. Reiniciá el backend (Heroku redeploy automático con push a main).
3. Probá la pregunta nueva por WhatsApp → debería contestarla.

## Cómo detectar alucinaciones

Si el bot inventa algo (precio que no existe, dirección que no es), revisá:
1. ¿La info está en algún MD? Si no, agregala.
2. ¿El MD es ambiguo? Aclará con más detalle.
3. ¿El bot no llamó a la tool correspondiente? Reforzá la instrucción en `beyker_tono.md`.

---

*Última actualización del lineamiento: mayo 2026.*
