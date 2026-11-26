# Fábrica de software de PasoVivo

Implementación operativa del §20 del [Plan Maestro](../../PLAN_MAESTRO.md): roles, ciclo de trabajo,
gates, criterios de terminado y formato de entrega. La fábrica **no sustituye** las decisiones del
Product Owner.

## 1. Organización

| Rol | Responsabilidad | Evidencia |
|---|---|---|
| Product Owner (humano) | Alcance, prioridades, gates y aceptación | Decisión versionada en el tablero |
| Orquestador | DAG de issues, contratos previos, integración y revisión | Plan de ola, verificación de diff, reporte |
| Arquitecto | Contratos, ADR, invariantes | ADR y revisión de interfaces |
| Backend | API, dominio, persistencia, permisos | Código, migraciones, pruebas |
| Frontend | Dashboard, editor, accesibilidad | Implementación y E2E |
| Extensión | MV3, captura, redacción, pairing | Paquete y pruebas Chromium |
| Verificación | Runner, locators, política, fixtures | Suite reproducible y evidencias |
| Seguridad y privacidad | Amenazas, contención, autorización, datos | Hallazgos y pruebas adversariales |
| QA independiente | Aceptación, regresión, defectos | Comandos, resultados y cobertura |
| DevOps/SRE | CI/CD, imágenes, backups, observabilidad | Pipeline y runbooks |
| Tech Writer | README, manuales, API, ADR, releases | Documentación reproducible |

En este repositorio cada rol tiene un agente en [`.pi/agents/`](../../.pi/agents) con su
responsabilidad, sus rutas permitidas y su formato de salida. El orquestador es el agente principal:
no implementa lo que delega y **verifica** lo que recibe.

Agentes disponibles hoy: `arquitecto`, `backend`, `frontend`, `verificacion`, `seguridad`, `qa` y
`documentacion`. Los roles de extensión y DevOps se crearán al iniciar su ola (§18.1), no antes.

## 2. Ciclo de trabajo (§20.2)

1. El orquestador lee `PLAN_MAESTRO.md`, `AGENTS.md`, los ADR y el estado real del repositorio.
2. Selecciona un issue READY del [tablero](../product/tablero.md), fija contrato, límites, rutas
   permitidas y pruebas **antes** de delegar.
3. Delega al rol adecuado con objetivo, dependencias, restricciones, comandos y criterio de salida.
   Un issue por rama (`feat/PV-xxx-descripcion`); sin secretos compartidos.
4. El agente inspecciona, implementa lo mínimo, ejecuta pruebas y entrega el formato del §20.4. Si
   algo no se puede ejecutar, lo marca como bloqueo; nunca simula.
5. QA revisa el diff y reproduce las pruebas. Seguridad revisa captura, runner, permisos y datos.
   Arquitecto revisa contratos y migraciones. Quien implementa no aprueba su cambio sensible.
6. El orquestador integra solo cuando las dependencias y el gate se cumplen; ejecuta smoke y
   regresión reales.
7. Se actualiza issue, documentación y decisiones. **Los gates G0–G3 los aprueba el PO humano.**

## 3. Gates y alcance

| Gate | Qué exige | Estado |
|---|---|---|
| G0 | Dolor confirmado y acceso a entornos de prueba (PV-001/PV-002) | **Pendiente**: no hay entrevistas |
| G1 | Flujo técnico demostrado y controles básicos (PV-003–PV-006) | Evidencia técnica completa (fixture, detección de cambio, aislamiento); **espera decisión del PO** |
| G2 | Calidad y checklist de release local (PV-049) | No iniciado |
| G3 | Evidencia comercial (PV-055/PV-056) | No iniciado |

PV-001 y PV-002 requieren entrevistas con personas reales: **la fábrica no las inventa**. Mientras G0
no se registre, el trabajo técnico avanza por instrucción explícita del PO y queda anotado como
adelanto, no como cumplimiento del gate.

## 4. Olas de ejecución

El orden sigue §18.1: E1 desbloquea la fundación, y cada ola deja evidencia verificable.

| Ola | Issues | Salida |
|---|---|---|
| Ola 1 (E1) | PV-003, PV-005, PV-006 | Fixture reproducible + detección de cambio + controles de aislamiento → evidencia de G1 |
| Ola 2 (E2) | PV-008, PV-010, PV-011, PV-013 | PostgreSQL y migración de identidad **listos**; Auth.js decidido en ADR-011; pendiente el login real y los entornos autorizados |
| Ola 3 (E3/E4) | PV-014–PV-021, PV-022–PV-027 | Captura con extensión y procedimientos versionados |
| Ola 4 (E5/E6) | PV-028–PV-040 | Runner, resultados, incidencias y ciclo completo |

PV-004 (spike MV3) se ejecuta con la ola 3 porque depende del pairing y de la política de red.

## 5. Criterio de terminado (§16.4)

Un issue no es DONE sin: criterios cumplidos, diff revisado, lint/tipos/build OK, pruebas ejecutadas
con salida resumida, controles de seguridad y accesibilidad aplicados, documentación actualizada,
migración/rollback revisados cuando aplique, sin secretos ni datos reales, y **aceptación del PO**.
La cobertura objetivo inicial es ≥80 % de ramas en redacción, políticas y máquinas de estado, sin
perseguir porcentajes globales.

## 6. Formato de entrega (§20.4)

```yaml
issue: PV-XXX
status: REVIEW # o BLOCKED, nunca DONE sin aceptación
summary: descripcion concreta
files_changed: []
commands_executed: []
checks:
  - name: unit
    status: NOT_RUN
    evidence: explicar motivo
acceptance_criteria: []
security_privacy_notes: []
risks_or_blockers: []
adr_required: false
next_dependency: null
```

## 7. Gobernanza de herramientas (§20.5)

- Cada delegación declara rutas permitidas; nadie escribe fuera de su issue.
- Sin acceso a sistemas externos, sin datos reales y sin secretos en prompts o artefactos.
- El orquestador verifica el resultado real (`git status`, diff, comandos) antes de reportar.
- Los commits, PRs y despliegues los decide el PO; la fábrica no publica artefactos por sí sola.
- Si la plataforma no puede delegar o ejecutar algo, se informa la limitación; no se inventan
  agentes ni resultados.
