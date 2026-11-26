const screens = [
  {
    "id": "login",
    "nav": "Inicio",
    "title": "Bienvenido a PasoVivo",
    "sub": "El conocimiento de tu equipo, siempre vigente.",
    "tag": "ACCESO",
    "cards": [
      {
        "title": "Tu espacio",
        "value": "PasoVivo",
        "desc": "Documenta · Verifica · Actualiza",
        "tone": "primary"
      }
    ],
    "rows": [
      {
        "title": "Correo electrónico",
        "desc": "editor@ejemplo.test",
        "status": "",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "Contraseña",
        "desc": "••••••••  ·  Campo protegido",
        "status": "",
        "tone": "neutral",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Entrar a la demo",
        "target": "onboarding",
        "kind": "primary"
      }
    ]
  },
  {
    "id": "onboarding",
    "nav": "Inicio",
    "title": "Configura tu espacio",
    "sub": "Completa estos pasos para empezar con seguridad.",
    "tag": "PASO 1 DE 3",
    "cards": [
      {
        "title": "Espacio de trabajo",
        "value": "Equipo Operaciones",
        "desc": "Entorno local de demostración",
        "tone": "primary"
      },
      {
        "title": "Configuración",
        "value": "1 de 3",
        "desc": "Sin conexiones externas",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Nombre del espacio",
        "desc": "Equipo Operaciones",
        "status": "Preparado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Dominio autorizado",
        "desc": "https://demo.pasovivo.test",
        "status": "Pendiente",
        "tone": "warning",
        "target": ""
      },
      {
        "title": "Extensión de navegador",
        "desc": "Emparejamiento de un solo uso",
        "status": "Pendiente",
        "tone": "warning",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Autorizar entorno de prueba",
        "target": "environment",
        "kind": "primary"
      },
      {
        "label": "Ir al panel de demo",
        "target": "dashboard",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "environment",
    "nav": "Configuración",
    "title": "Autorizar un entorno",
    "sub": "Limita el alcance del grabador y del motor de verificación.",
    "tag": "PASO 2 DE 3",
    "cards": [
      {
        "title": "Origen permitido",
        "value": "demo.pasovivo.test",
        "desc": "Fixture local · sin datos reales",
        "tone": "primary"
      },
      {
        "title": "Política",
        "value": "Solo lectura",
        "desc": "Las escrituras requieren fixture autorizado",
        "tone": "success"
      }
    ],
    "rows": [
      {
        "title": "Dominio",
        "desc": "https://demo.pasovivo.test",
        "status": "Permitido",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Tipo de entorno",
        "desc": "Demostración aislada",
        "status": "Pruebas",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Capturas de pantalla",
        "desc": "Desactivadas de forma predeterminada",
        "status": "Privacidad",
        "tone": "neutral",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Guardar y emparejar",
        "target": "pairing",
        "kind": "primary"
      },
      {
        "label": "Volver",
        "target": "onboarding",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "pairing",
    "nav": "Configuración",
    "title": "Conecta la extensión",
    "sub": "Instala la extensión y utiliza un código temporal de emparejamiento.",
    "tag": "PASO 3 DE 3",
    "cards": [
      {
        "title": "Código temporal",
        "value": "PV  82  46",
        "desc": "Ejemplo · expira en 5 minutos",
        "tone": "primary"
      },
      {
        "title": "Permisos",
        "value": "1 dominio",
        "desc": "Sin acceso global al navegador",
        "tone": "success"
      }
    ],
    "rows": [
      {
        "title": "Extensión PasoVivo",
        "desc": "Chrome / Edge · Manifest V3",
        "status": "Demo",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "Origen permitido",
        "desc": "demo.pasovivo.test",
        "status": "Autorizado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Estado de conexión",
        "desc": "Confirmación de emparejamiento",
        "status": "Esperando",
        "tone": "warning",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Simular emparejamiento correcto",
        "target": "dashboard",
        "kind": "primary"
      },
      {
        "label": "Ver código expirado",
        "target": "pairing-error",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "pairing-error",
    "nav": "Configuración",
    "title": "El código ha expirado",
    "sub": "Por seguridad, los códigos no pueden reutilizarse.",
    "tag": "ERROR RECUPERABLE",
    "cards": [
      {
        "title": "Emparejamiento",
        "value": "Expirado",
        "desc": "No se ha concedido acceso",
        "tone": "danger"
      }
    ],
    "rows": [
      {
        "title": "Qué ocurrió",
        "desc": "El código temporal dejó de ser válido.",
        "status": "Sin conexión",
        "tone": "warning",
        "target": ""
      },
      {
        "title": "Cómo continuar",
        "desc": "Genera un código nuevo y vuelve a intentarlo.",
        "status": "",
        "tone": "neutral",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Generar otro código",
        "target": "pairing",
        "kind": "primary"
      }
    ]
  },
  {
    "id": "dashboard",
    "nav": "Inicio",
    "title": "Resumen de operaciones",
    "sub": "Consulta la vigencia de tus procedimientos y las incidencias pendientes.",
    "tag": "ESPACIO DE TRABAJO",
    "cards": [
      {
        "title": "Procedimientos",
        "value": "3",
        "desc": "2 publicados · 1 borrador",
        "tone": "neutral"
      },
      {
        "title": "Verificados",
        "value": "1",
        "desc": "Con evidencia reciente",
        "tone": "success"
      },
      {
        "title": "Cambios detectados",
        "value": "1",
        "desc": "Requiere revisión",
        "tone": "warning"
      },
      {
        "title": "Sin verificar",
        "value": "1",
        "desc": "Sin evidencia vigente",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Consulta de inventario",
        "desc": "Operaciones · v1.2 · 5 pasos",
        "status": "Verificado",
        "tone": "success",
        "target": "manual"
      },
      {
        "title": "Consulta de facturas",
        "desc": "Contabilidad · v1.0 · 4 pasos",
        "status": "Cambio sospechado",
        "tone": "warning",
        "target": "incident"
      },
      {
        "title": "Alta de proveedores",
        "desc": "Administración · borrador",
        "status": "Sin verificar",
        "tone": "neutral",
        "target": "editor"
      }
    ],
    "actions": [
      {
        "label": "Nuevo procedimiento",
        "target": "capture-setup",
        "kind": "primary"
      },
      {
        "label": "Ver procedimientos",
        "target": "procedures",
        "kind": "secondary"
      },
      {
        "label": "Revisar incidencias",
        "target": "incidents",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "procedures",
    "nav": "Procedimientos",
    "title": "Biblioteca de procedimientos",
    "sub": "Organiza guías por área, responsable, versión y estado.",
    "tag": "BIBLIOTECA",
    "cards": [
      {
        "title": "Publicados",
        "value": "2",
        "desc": "Versiones inmutables",
        "tone": "neutral"
      },
      {
        "title": "Borradores",
        "value": "1",
        "desc": "Pendiente de aprobación",
        "tone": "neutral"
      },
      {
        "title": "Filtros",
        "value": "Todos",
        "desc": "Estado · Área · Responsable",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Consulta de inventario",
        "desc": "Operaciones · v1.2 · 5 pasos",
        "status": "Verificado",
        "tone": "success",
        "target": "manual"
      },
      {
        "title": "Consulta de facturas",
        "desc": "Contabilidad · v1.0 · 4 pasos",
        "status": "Cambio sospechado",
        "tone": "warning",
        "target": "incident"
      },
      {
        "title": "Alta de proveedores",
        "desc": "Administración · borrador",
        "status": "Sin verificar",
        "tone": "neutral",
        "target": "editor"
      }
    ],
    "actions": [
      {
        "label": "Grabar procedimiento",
        "target": "capture-setup",
        "kind": "primary"
      },
      {
        "label": "Ver versiones",
        "target": "versions",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "capture-setup",
    "nav": "Capturas",
    "title": "Nueva captura",
    "sub": "Selecciona el sitio autorizado y la política de grabación.",
    "tag": "CAPTURA · CONFIGURACIÓN",
    "cards": [
      {
        "title": "Nombre",
        "value": "Consulta de inventario",
        "desc": "Procedimiento de ejemplo",
        "tone": "primary"
      },
      {
        "title": "Origen",
        "value": "demo.pasovivo.test",
        "desc": "Entorno autorizado",
        "tone": "success"
      },
      {
        "title": "Capturas visuales",
        "value": "Desactivadas",
        "desc": "Se pueden solicitar explícitamente",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Datos de entrada",
        "desc": "Valores reales excluidos; se usan marcadores.",
        "status": "Protegido",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Alcance",
        "desc": "Solo pestaña activa y origen aprobado.",
        "status": "Limitado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Indicador visible",
        "desc": "Pausar y detener en cualquier momento.",
        "status": "Activado",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Iniciar grabación de demo",
        "target": "recording",
        "kind": "primary"
      },
      {
        "label": "Cancelar",
        "target": "procedures",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "recording",
    "nav": "Capturas",
    "title": "Grabación en curso",
    "sub": "La extensión muestra un indicador persistente y registra acciones permitidas.",
    "tag": "● GRABANDO",
    "cards": [
      {
        "title": "Sesión de captura",
        "value": "00:01:24",
        "desc": "Tiempo ilustrativo · 4 eventos",
        "tone": "danger"
      },
      {
        "title": "Página activa",
        "value": "Inventario",
        "desc": "demo.pasovivo.test",
        "tone": "primary"
      }
    ],
    "rows": [
      {
        "title": "01 · Abrir inventario",
        "desc": "Navegación al módulo de inventario",
        "status": "Registrado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "02 · Seleccionar almacén",
        "desc": "Seleccionar fixture «Principal»",
        "status": "Registrado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "03 · Consultar existencias",
        "desc": "Clic en botón Consultar",
        "status": "Registrado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "04 · Comprobar tabla",
        "desc": "Checkpoint: resultados visibles",
        "status": "Registrado",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Detener y revisar",
        "target": "review",
        "kind": "primary"
      },
      {
        "label": "Pausar",
        "target": "paused",
        "kind": "secondary"
      },
      {
        "label": "Simular dominio no autorizado",
        "target": "blocked-capture",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "paused",
    "nav": "Capturas",
    "title": "Grabación pausada",
    "sub": "No se registran acciones mientras la sesión está en pausa.",
    "tag": "CAPTURA PAUSADA",
    "cards": [
      {
        "title": "Sesión",
        "value": "4 eventos",
        "desc": "Los pasos anteriores se conservan",
        "tone": "warning"
      }
    ],
    "rows": [
      {
        "title": "Pausa activa",
        "desc": "Puedes revisar la pestaña sin registrar acciones.",
        "status": "Pausado",
        "tone": "warning",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Reanudar",
        "target": "recording",
        "kind": "primary"
      },
      {
        "label": "Detener y revisar",
        "target": "review",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "blocked-capture",
    "nav": "Capturas",
    "title": "Captura pausada por seguridad",
    "sub": "Has salido del origen autorizado. No se registra información de esta página.",
    "tag": "ORIGEN NO AUTORIZADO",
    "cards": [
      {
        "title": "Origen actual",
        "value": "externo.ejemplo.test",
        "desc": "Fuera de la lista permitida",
        "tone": "danger"
      }
    ],
    "rows": [
      {
        "title": "Captura detenida",
        "desc": "No se guardaron eventos del nuevo sitio.",
        "status": "Protegido",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Para continuar",
        "desc": "Regresa al origen autorizado o finaliza la sesión.",
        "status": "",
        "tone": "neutral",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Volver al sitio autorizado",
        "target": "recording",
        "kind": "primary"
      },
      {
        "label": "Finalizar sesión",
        "target": "review",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "review",
    "nav": "Capturas",
    "title": "Revisa los pasos capturados",
    "sub": "Elimina datos sensibles, comprueba instrucciones y confirma antes de guardar.",
    "tag": "REVISIÓN DE CAPTURA",
    "cards": [
      {
        "title": "Eventos",
        "value": "4",
        "desc": "Todos se conservan hasta confirmar",
        "tone": "neutral"
      },
      {
        "title": "Privacidad",
        "value": "Sin valores reales",
        "desc": "Capturas visuales desactivadas",
        "tone": "success"
      }
    ],
    "rows": [
      {
        "title": "1 · Abrir inventario",
        "desc": "Navegar a /inventario",
        "status": "Conservar",
        "tone": "success",
        "target": ""
      },
      {
        "title": "2 · Seleccionar almacén",
        "desc": "Variable {{almacen}} · sin valor real",
        "status": "Enmascarado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "3 · Consultar existencias",
        "desc": "Acción click · fixture permitido",
        "status": "Conservar",
        "tone": "success",
        "target": ""
      },
      {
        "title": "4 · Comprobar tabla",
        "desc": "Checkpoint: tabla visible",
        "status": "Conservar",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Generar borrador",
        "target": "editor",
        "kind": "primary"
      },
      {
        "label": "Descartar sesión",
        "target": "procedures",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "editor",
    "nav": "Procedimientos",
    "title": "Editor de procedimiento",
    "sub": "Reorganiza instrucciones, define checkpoints y clasifica acciones.",
    "tag": "BORRADOR · SIN PUBLICAR",
    "cards": [
      {
        "title": "Consulta de inventario",
        "value": "Borrador",
        "desc": "Cambios aún no publicados",
        "tone": "primary"
      },
      {
        "title": "Validación",
        "value": "4 de 4",
        "desc": "Sin datos sensibles detectados",
        "tone": "success"
      },
      {
        "title": "Ejecución",
        "value": "Fixture",
        "desc": "Sin modificaciones en producción",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "01 · Abrir el módulo Inventario",
        "desc": "navigate · /inventario",
        "status": "Verificable",
        "tone": "success",
        "target": ""
      },
      {
        "title": "02 · Seleccionar almacén",
        "desc": "fill_fixture · variable almacen",
        "status": "Fixture",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "03 · Consultar existencias",
        "desc": "click · role=button, name=Consultar",
        "status": "Fixture",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "04 · Comprobar la tabla",
        "desc": "assert_visible · inventory-results",
        "status": "Checkpoint",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Revisar publicación",
        "target": "publish",
        "kind": "primary"
      },
      {
        "label": "Vista de manual",
        "target": "manual",
        "kind": "secondary"
      },
      {
        "label": "Volver a captura",
        "target": "review",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "publish",
    "nav": "Procedimientos",
    "title": "Publicar una versión",
    "sub": "Revisa alcance, permisos y cambios antes de crear una versión inmutable.",
    "tag": "CONFIRMACIÓN",
    "cards": [
      {
        "title": "Nueva versión",
        "value": "v1.3",
        "desc": "Se conservará el historial",
        "tone": "primary"
      },
      {
        "title": "Validación",
        "value": "Correcta",
        "desc": "4 pasos · 1 checkpoint",
        "tone": "success"
      }
    ],
    "rows": [
      {
        "title": "Alcance",
        "desc": "Demo autorizada · datos sintéticos",
        "status": "Validado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Privacidad",
        "desc": "Sin secretos ni valores de entrada reales",
        "status": "Validado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Aprobación",
        "desc": "Administrador del espacio · demo",
        "status": "Requerida",
        "tone": "warning",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Confirmar publicación de demo",
        "target": "manual",
        "kind": "primary"
      },
      {
        "label": "Regresar al editor",
        "target": "editor",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "manual",
    "nav": "Procedimientos",
    "title": "Consulta de inventario",
    "sub": "Guía publicada para consultar existencias en un entorno autorizado.",
    "tag": "GUÍA PUBLICADA",
    "cards": [
      {
        "title": "Versión",
        "value": "v1.3",
        "desc": "Versión de demostración",
        "tone": "primary"
      },
      {
        "title": "Última verificación",
        "value": "Sin verificar",
        "desc": "Verifica esta versión antes de confiar en ella",
        "tone": "warning"
      },
      {
        "title": "Propietario",
        "value": "Operaciones",
        "desc": "Responsable del procedimiento",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "01 · Abrir Inventario",
        "desc": "Accede al módulo de inventario.",
        "status": "",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "02 · Seleccionar almacén",
        "desc": "Elige un almacén de prueba.",
        "status": "",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "03 · Consultar existencias",
        "desc": "Pulsa Consultar.",
        "status": "",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "04 · Validar resultados",
        "desc": "Comprueba que la tabla esté visible.",
        "status": "Checkpoint",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Ejecutar verificación",
        "target": "run-config",
        "kind": "primary"
      },
      {
        "label": "Editar borrador",
        "target": "editor",
        "kind": "secondary"
      },
      {
        "label": "Historial de versiones",
        "target": "versions",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "run-config",
    "nav": "Verificaciones",
    "title": "Configura una verificación",
    "sub": "Elige una versión publicada y un entorno autorizado.",
    "tag": "PREVIO A EJECUCIÓN",
    "cards": [
      {
        "title": "Versión",
        "value": "v1.3",
        "desc": "Snapshot inmutable",
        "tone": "primary"
      },
      {
        "title": "Entorno",
        "value": "Fixture local",
        "desc": "Sin acceso a producción",
        "tone": "success"
      },
      {
        "title": "Modo",
        "value": "Chequeo seguro",
        "desc": "Acciones limitadas a política",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Origen permitido",
        "desc": "demo.pasovivo.test",
        "status": "Validado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Alcance de comprobación",
        "desc": "Navegación, selección, consulta y tabla visible",
        "status": "4 pasos",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "Evidencia",
        "desc": "Metadatos y capturas depuradas si se autorizan",
        "status": "Sin secretos",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Iniciar verificación simulada",
        "target": "running",
        "kind": "primary"
      },
      {
        "label": "Cancelar",
        "target": "manual",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "running",
    "nav": "Verificaciones",
    "title": "Verificación en curso",
    "sub": "Sigue el progreso de cada paso. Puedes cancelar la ejecución.",
    "tag": "RUN · 3 DE 4",
    "cards": [
      {
        "title": "Progreso",
        "value": "75 %",
        "desc": "3 de 4 pasos comprobados",
        "tone": "primary"
      },
      {
        "title": "Entorno",
        "value": "Fixture local",
        "desc": "Ejecución simulada",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Abrir Inventario",
        "desc": "Elemento localizado y visible",
        "status": "Correcto",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Seleccionar almacén",
        "desc": "Fixture cargado correctamente",
        "status": "Correcto",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Consultar existencias",
        "desc": "Acción permitida por política",
        "status": "Correcto",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Validar resultados",
        "desc": "Esperando checkpoint",
        "status": "En curso",
        "tone": "warning",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Simular resultado correcto",
        "target": "run-success",
        "kind": "primary"
      },
      {
        "label": "Simular cambio detectado",
        "target": "incident",
        "kind": "secondary"
      },
      {
        "label": "Cancelar ejecución",
        "target": "run-cancelled",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "run-success",
    "nav": "Verificaciones",
    "title": "Verificación completada",
    "sub": "Todos los pasos verificables se completaron en el entorno seleccionado.",
    "tag": "RESULTADO · CORRECTO",
    "cards": [
      {
        "title": "Resultado",
        "value": "4 de 4",
        "desc": "Alcance limitado al fixture",
        "tone": "success"
      },
      {
        "title": "Duración",
        "value": "12 s",
        "desc": "Valor simulado",
        "tone": "neutral"
      },
      {
        "title": "Versión",
        "value": "v1.3",
        "desc": "Evidencia asociada a esta versión",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Abrir Inventario",
        "desc": "Navegación",
        "status": "Correcto",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Seleccionar almacén",
        "desc": "Fixture",
        "status": "Correcto",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Consultar existencias",
        "desc": "Acción autorizada",
        "status": "Correcto",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Validar resultados",
        "desc": "Checkpoint visible",
        "status": "Correcto",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Ver historial",
        "target": "versions",
        "kind": "primary"
      },
      {
        "label": "Volver al panel",
        "target": "dashboard",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "run-cancelled",
    "nav": "Verificaciones",
    "title": "Verificación cancelada",
    "sub": "Una ejecución incompleta no prueba que el procedimiento funcione.",
    "tag": "RESULTADO · NO CONCLUYENTE",
    "cards": [
      {
        "title": "Resultado",
        "value": "Cancelado",
        "desc": "No se certifica la vigencia",
        "tone": "warning"
      }
    ],
    "rows": [
      {
        "title": "Ejecución",
        "desc": "Cancelada por el operador",
        "status": "No concluyente",
        "tone": "warning",
        "target": ""
      },
      {
        "title": "Evidencia",
        "desc": "Conservar únicamente datos autorizados",
        "status": "",
        "tone": "neutral",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Reintentar",
        "target": "run-config",
        "kind": "primary"
      },
      {
        "label": "Volver a la guía",
        "target": "manual",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "incidents",
    "nav": "Cambios",
    "title": "Bandeja de incidencias",
    "sub": "Prioriza cambios sospechados y fallos no concluyentes.",
    "tag": "INCIDENCIAS",
    "cards": [
      {
        "title": "Abiertas",
        "value": "1",
        "desc": "Requiere revisión humana",
        "tone": "warning"
      },
      {
        "title": "Bloqueadas",
        "value": "0",
        "desc": "Sin errores de política",
        "tone": "neutral"
      },
      {
        "title": "Resueltas",
        "value": "0",
        "desc": "Historial de demo",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Cambio en el botón de consulta",
        "desc": "Inventario · selector no encontrado",
        "status": "Abierta",
        "tone": "warning",
        "target": "incident"
      },
      {
        "title": "Sin incidencias adicionales",
        "desc": "No se detectaron otros cambios en esta demo.",
        "status": "—",
        "tone": "neutral",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Revisar cambio",
        "target": "incident",
        "kind": "primary"
      },
      {
        "label": "Volver al panel",
        "target": "dashboard",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "incident",
    "nav": "Cambios",
    "title": "Cambio sospechado en Inventario",
    "sub": "El motor no pudo localizar el elemento esperado. El cambio aún no está confirmado.",
    "tag": "INCIDENCIA · ABIERTA",
    "cards": [
      {
        "title": "Antes · v1.3",
        "value": "Consultar",
        "desc": "role=button · name=Consultar",
        "tone": "danger"
      },
      {
        "title": "Ahora · fixture",
        "value": "Buscar existencias",
        "desc": "Candidato localizado · sin aprobación",
        "tone": "warning"
      },
      {
        "title": "Resultado",
        "value": "3 de 4",
        "desc": "No concluyente",
        "tone": "warning"
      }
    ],
    "rows": [
      {
        "title": "Evidencia anterior",
        "desc": "Botón «Consultar» presente en la versión publicada.",
        "status": "",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "Evidencia actual",
        "desc": "El texto esperado no coincide. No se ha ejecutado otro botón.",
        "status": "",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "Propuesta",
        "desc": "Actualizar el selector y la instrucción tras revisión.",
        "status": "Pendiente",
        "tone": "warning",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Revisar propuesta",
        "target": "change-review",
        "kind": "primary"
      },
      {
        "label": "Volver a incidencias",
        "target": "incidents",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "change-review",
    "nav": "Cambios",
    "title": "Revisa la corrección propuesta",
    "sub": "Compara los cambios y decide si quieres preparar un borrador.",
    "tag": "APROBACIÓN HUMANA",
    "cards": [
      {
        "title": "Instrucción anterior",
        "value": "Pulsa Consultar",
        "desc": "v1.3 · versión publicada",
        "tone": "danger"
      },
      {
        "title": "Instrucción nueva",
        "value": "Pulsa Buscar existencias",
        "desc": "Propuesta · sin publicar",
        "tone": "success"
      }
    ],
    "rows": [
      {
        "title": "Locator anterior",
        "desc": "role=button; name=Consultar",
        "status": "Eliminar",
        "tone": "danger",
        "target": ""
      },
      {
        "title": "Locator propuesto",
        "desc": "role=button; name=Buscar existencias",
        "status": "Agregar",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Seguridad",
        "desc": "Se mantiene la política de entorno de prueba.",
        "status": "Sin cambio",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Aceptar y crear borrador",
        "target": "corrected-editor",
        "kind": "primary"
      },
      {
        "label": "Rechazar propuesta",
        "target": "incidents",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "corrected-editor",
    "nav": "Procedimientos",
    "title": "Borrador de corrección",
    "sub": "El procedimiento publicado no cambia hasta aprobar la nueva versión.",
    "tag": "BORRADOR · V1.4",
    "cards": [
      {
        "title": "Cambios",
        "value": "1 paso",
        "desc": "Propuesta aceptada · pendiente de publicar",
        "tone": "primary"
      },
      {
        "title": "Versión anterior",
        "value": "v1.3",
        "desc": "Se conserva sin modificación",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "03 · Buscar existencias",
        "desc": "click · role=button, name=Buscar existencias",
        "status": "Modificado",
        "tone": "warning",
        "target": ""
      },
      {
        "title": "04 · Validar resultados",
        "desc": "assert_visible · inventory-results",
        "status": "Sin cambios",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Publicar v1.4 de demo",
        "target": "corrected-run",
        "kind": "primary"
      },
      {
        "label": "Volver a propuesta",
        "target": "change-review",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "corrected-run",
    "nav": "Verificaciones",
    "title": "Reverifica la nueva versión",
    "sub": "La incidencia sigue abierta hasta comprobar la corrección.",
    "tag": "REVERIFICACIÓN · V1.4",
    "cards": [
      {
        "title": "Versión",
        "value": "v1.4",
        "desc": "Nueva versión inmutable",
        "tone": "primary"
      },
      {
        "title": "Incidencia",
        "value": "Pendiente",
        "desc": "No se cierra solo por publicar",
        "tone": "warning"
      }
    ],
    "rows": [
      {
        "title": "Paso corregido",
        "desc": "Buscar existencias",
        "status": "Listo para comprobar",
        "tone": "neutral",
        "target": ""
      },
      {
        "title": "Checkpoint",
        "desc": "Tabla de inventario visible",
        "status": "Pendiente",
        "tone": "warning",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Simular verificación satisfactoria",
        "target": "resolved",
        "kind": "primary"
      },
      {
        "label": "Simular fallo persistente",
        "target": "incident",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "resolved",
    "nav": "Cambios",
    "title": "Incidencia resuelta",
    "sub": "La nueva versión pasó la comprobación del entorno de demostración.",
    "tag": "RESUELTA · CON EVIDENCIA",
    "cards": [
      {
        "title": "Versión",
        "value": "v1.4",
        "desc": "Nueva versión verificada",
        "tone": "success"
      },
      {
        "title": "Resultado",
        "value": "4 de 4",
        "desc": "Alcance: fixture local",
        "tone": "success"
      }
    ],
    "rows": [
      {
        "title": "Cambio aprobado",
        "desc": "Consultar → Buscar existencias",
        "status": "Aprobado",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Verificación posterior",
        "desc": "Checkpoint visible",
        "status": "Correcto",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Historial",
        "desc": "v1.3 y v1.4 conservadas",
        "status": "Auditado",
        "tone": "success",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Ver historial",
        "target": "versions",
        "kind": "primary"
      },
      {
        "label": "Volver al panel",
        "target": "dashboard",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "versions",
    "nav": "Procedimientos",
    "title": "Historial y versiones",
    "sub": "Consulta snapshots publicados; restaurar crea un borrador nuevo.",
    "tag": "CONTROL DE VERSIONES",
    "cards": [
      {
        "title": "Historial",
        "value": "3 versiones",
        "desc": "Datos ilustrativos",
        "tone": "neutral"
      },
      {
        "title": "Integridad",
        "value": "Inmutable",
        "desc": "Conservar evidencia por versión",
        "tone": "success"
      }
    ],
    "rows": [
      {
        "title": "v1.4 · Corrección de locator",
        "desc": "Demo · Cambio en el botón de consulta",
        "status": "Publicada",
        "tone": "success",
        "target": "resolved"
      },
      {
        "title": "v1.3 · Captura inicial",
        "desc": "Demo · 4 pasos",
        "status": "Histórica",
        "tone": "neutral",
        "target": "manual"
      },
      {
        "title": "v1.2 · Versión anterior",
        "desc": "Demo · 5 pasos",
        "status": "Histórica",
        "tone": "neutral",
        "target": ""
      }
    ],
    "actions": [
      {
        "label": "Crear borrador desde anterior",
        "target": "editor",
        "kind": "primary"
      },
      {
        "label": "Volver al manual",
        "target": "manual",
        "kind": "secondary"
      }
    ]
  },
  {
    "id": "settings",
    "nav": "Configuración",
    "title": "Configuración del espacio",
    "sub": "Administra permisos, privacidad y entornos de ejecución.",
    "tag": "ADMINISTRACIÓN",
    "cards": [
      {
        "title": "Entornos",
        "value": "1 autorizado",
        "desc": "Fixture local",
        "tone": "success"
      },
      {
        "title": "Retención",
        "value": "30 días",
        "desc": "Política ilustrativa",
        "tone": "neutral"
      },
      {
        "title": "Rol actual",
        "value": "Administrador",
        "desc": "Demo · aprobación habilitada",
        "tone": "neutral"
      }
    ],
    "rows": [
      {
        "title": "Entornos y orígenes",
        "desc": "Configura los dominios permitidos.",
        "status": "Gestionar",
        "tone": "neutral",
        "target": "environment"
      },
      {
        "title": "Extensión y conexión",
        "desc": "Revocar o renovar emparejamiento.",
        "status": "Gestionar",
        "tone": "neutral",
        "target": "pairing"
      },
      {
        "title": "Privacidad y retención",
        "desc": "No se capturan contraseñas ni tokens.",
        "status": "Protegido",
        "tone": "success",
        "target": ""
      },
      {
        "title": "Auditoría",
        "desc": "Acciones de publicación y revisión.",
        "status": "Consultar",
        "tone": "neutral",
        "target": "versions"
      }
    ],
    "actions": [
      {
        "label": "Administrar dominios",
        "target": "environment",
        "kind": "primary"
      },
      {
        "label": "Volver al panel",
        "target": "dashboard",
        "kind": "secondary"
      }
    ]
  }
];
const C={bg:'#F5F7F9',white:'#FFFFFF',ink:'#14252B',muted:'#596D76',border:'#DCE5E9',primary:'#087F78',primaryLight:'#E3F5F2',success:'#166C46',successLight:'#E4F5EA',warning:'#935B0C',warningLight:'#FFF2D9',danger:'#A3293A',dangerLight:'#FCE8EB',neutral:'#50636B',neutralLight:'#EDF1F3',dark:'#132D33'};
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const fill=h=>[{type:'SOLID',color:rgb(h)}];
const targets=new Map(), links=[];
const nav=[['Inicio','dashboard','⌂'],['Procedimientos','procedures','▤'],['Capturas','capture-setup','◉'],['Verificaciones','run-config','✓'],['Cambios','incidents','↻'],['Configuración','settings','⚙']];
const font={family:'Inter',style:'Regular'}, semibold={family:'Inter',style:'Semi Bold'}, bold={family:'Inter',style:'Bold'};
function frame(parent,name,x,y,w,h,bg=C.white,r=0,border=false){const n=figma.createFrame();n.name=name;parent.appendChild(n);n.x=x;n.y=y;n.resize(w,h);n.fills=bg?fill(bg):[];n.cornerRadius=r;n.clipsContent=false;if(border){n.strokes=fill(C.border);n.strokeWeight=1;}return n;}
function txt(parent,name,value,x,y,w,size=14,col=C.ink,weight='regular'){const n=figma.createText();parent.appendChild(n);n.name=name;n.fontName=weight==='bold'?bold:weight==='semi'?semibold:font;n.fontSize=size;n.characters=value;n.fills=fill(col);n.textAutoResize='HEIGHT';n.resize(w,Math.max(18,size*1.4));n.x=x;n.y=y;n.lineHeight={unit:'PERCENT',value:135};return n;}
function button(parent,label,target,x,y,w,kind='primary'){const b=frame(parent,label,x,y,w,46,kind==='primary'?C.primary:C.white,8,kind!=='primary');txt(b,'Etiqueta',label,13,13,w-26,14,kind==='primary'?C.white:C.ink,'semi');if(target)links.push([b,target]);return b;}
function pill(parent,label,tone,x,y,w){const t=frame(parent,'Estado / '+label,x,y,w,28,C[tone+'Light']||C.neutralLight,14);txt(t,'Estado',label,10,5,w-20,12,C[tone]||C.neutral,'semi');return t;}
function makeScreen(page,s,i){const f=frame(page,`${String(i+1).padStart(2,'0')} · ${s.title}`, (i%4)*1520,Math.floor(i/4)*980,1440,900,C.bg,0);targets.set(s.id,f);const side=frame(f,'Navegación',0,0,248,900,C.dark);frame(side,'Marca',24,26,36,36,C.primary,10);txt(side,'Símbolo','▶',32,31,24,20,C.white,'bold');txt(side,'PasoVivo','PasoVivo',72,29,158,24,C.white,'bold');txt(side,'Workspace','EQUIPO OPERACIONES',24,98,200,11,'#A4C4C6','semi');nav.forEach(([label,target,icon],j)=>{let active=s.nav===label;const b=frame(side,label,16,132+j*52,216,44,active?'#215057':null,8);txt(b,'Icono',icon,14,10,24,19,active?'#7CE2CE':'#BDD1D3');txt(b,'Etiqueta',label,44,12,160,14,active?C.white:'#D9E7E8','semi');links.push([b,target]);});txt(side,'Footer','DEMO · Entorno seguro',24,845,200,12,'#A4C4C6');const top=frame(f,'Barra superior',248,0,1192,72,C.white);txt(top,'Breadcrumb','PasoVivo   /   '+s.nav,32,25,700,14,C.muted,'semi');pill(top,'●  Demo', 'neutral',940,22,88);txt(top,'Usuario','Editor  ▾',1054,25,110,14,C.ink,'semi');let main=frame(f,'Contenido',280,100,1128,770,null);txt(main,'Contexto',s.tag,0,0,1128,11,C.primary,'bold');txt(main,'Título',s.title,0,24,1128,32,C.ink,'bold');txt(main,'Descripción',s.sub,0,77,1128,15,C.muted);const gap=16,n=s.cards.length,w=(1128-gap*(n-1))/n;for(let k=0;k<n;k++){const v=s.cards[k],b=frame(main,'Indicador / '+v.title,k*(w+gap),116,w,130,C.white,12,true);frame(b,'Acento',0,0,4,130,C[v.tone]||C.neutral,2);txt(b,'Etiqueta',v.title,18,16,w-36,13,C.muted,'semi');txt(b,'Valor',v.value,18,41,w-36,v.value.length>20?20:27,C[v.tone]||C.ink,'bold');txt(b,'Detalle',v.desc,18,89,w-36,12,C.muted);}
const table=frame(main,'Detalle del flujo',0,268,1128,64+s.rows.length*68,C.white,12,true);txt(table,'Encabezado',s.nav==='Capturas'?'Eventos y controles':s.nav==='Verificaciones'?'Ejecución y evidencia':'Detalle del procedimiento',20,18,1040,17,C.ink,'semi');s.rows.forEach((r,k)=>{const y=56+k*68;const row=frame(table,r.title,12,y,1104,64,r.target?'#F7FAFA':C.white,8);txt(row,'Título',r.title,14,9,730,15,C.ink,'semi');txt(row,'Descripción',r.desc,14,33,745,12,C.muted);if(r.status)pill(row,r.status,r.tone,810,18,252);if(r.target){txt(row,'Abrir','›',1072,15,22,22,C.primary,'bold');links.push([row,r.target]);}});let x=0;for(const a of s.actions){const bw=Math.min(370,Math.max(130,a.label.length*7.4+35));button(main,a.label,a.target,x,268+64+s.rows.length*68+22,bw,a.kind);x+=bw+12;}txt(main,'Nota','Prototipo interactivo · Datos simulados · No ejecuta acciones en sitios reales.',0,740,1128,11,C.muted);return f;}
async function main(){await Promise.all([font,semibold,bold].map(f=>figma.loadFontAsync(f)));const page=figma.createPage();page.name='01 · Producto — Pantallas';await figma.setCurrentPageAsync(page);screens.forEach((s,i)=>makeScreen(page,s,i));let count=0,failed=0;for(const [node,id] of links){const d=targets.get(id);if(!d)continue;const reaction={trigger:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:d.id,navigation:'NAVIGATE',transition:null,preserveScrollPosition:false}]};try{if(node.setReactionsAsync)await node.setReactionsAsync([reaction]);else node.reactions=[reaction];count++;}catch(e){failed++;}}
const guide=figma.createPage();guide.name='02 · Flujos y sistema de diseño';await figma.setCurrentPageAsync(guide);const b=frame(guide,'Mapa de navegación',0,0,1600,1100,C.bg);txt(b,'Título','PasoVivo / Arquitectura de experiencia',48,40,1500,34,C.ink,'bold');txt(b,'Descripción','Flujos principales y alternativos · Prototipo de referencia',48,94,1500,16,C.muted);const flows=[['01 · Activación',['login','onboarding','environment','pairing','dashboard']],['02 · Captura y publicación',['dashboard','capture-setup','recording','review','editor','publish','manual']],['03 · Verificación',['manual','run-config','running','run-success']],['04 · Gestión de cambios',['running','incident','change-review','corrected-editor','corrected-run','resolved']],['05 · Recuperación',['pairing-error','paused','blocked-capture','run-cancelled','settings']]];flows.forEach(([name,ids],i)=>{let y=152+i*156;txt(b,'Flujo',name,48,y,1500,17,C.ink,'bold');ids.forEach((id,j)=>{let s=screens.find(x=>x.id===id),w=194,x=48+j*216;const q=frame(b,s.title,x,y+39,w,90,C.white,10,true);txt(q,'ID',id,12,10,w-24,10,C.primary,'semi');txt(q,'Pantalla',s.title,12,31,w-24,14,C.ink,'semi');if(j<ids.length-1)txt(b,'Secuencia','→',x+w+3,y+65,22,19,C.muted);});});txt(b,'Nota','Ramas alternativas: código expirado → pairing; pausa / origen bloqueado → recording o review; cancelación → run-config; fallo persistente → incident.',48,960,1500,14,C.muted);const ds=frame(guide,'Sistema de diseño',1640,0,1050,770,C.bg);txt(ds,'Título','Sistema de diseño / v0.1',40,35,970,32,C.ink,'bold');txt(ds,'Descripción','Identidad verde azulado según el plan maestro · Inter · cuadrícula 8 px',40,85,970,15,C.muted);Object.entries(C).filter(([k])=>!k.endsWith('Light')).forEach(([k,v],i)=>{let x=40+(i%5)*194,y=138+Math.floor(i/5)*120;frame(ds,k,x,y,170,65,v,8,true);txt(ds,'Token',k+'  '+v,x,y+72,180,12,C.ink,'semi');});txt(ds,'Componentes','Componentes base',40,420,940,22,C.ink,'bold');button(ds,'Acción principal',null,40,469,210);button(ds,'Acción secundaria',null,270,469,210,'secondary');['success','warning','danger','neutral'].forEach((t,i)=>pill(ds,['Verificado','Cambio sospechado','Bloqueado','Sin verificar'][i],t,40+i*230,540,206));txt(ds,'Principios','Estados explícitos, privacidad por defecto, evidencia vinculada a versión, validación humana y foco visible en implementación.',40,640,940,16,C.muted);await figma.setCurrentPageAsync(page);figma.viewport.scrollAndZoomIntoView([targets.get('dashboard')]);figma.closePlugin(`PasoVivo: ${screens.length} pantallas · ${count} conexiones · ${failed} conexiones no aplicadas.`);}
main().catch(e=>{figma.closePlugin('Error al generar: '+e.message);});
