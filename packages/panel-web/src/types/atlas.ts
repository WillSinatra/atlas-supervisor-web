// Atlas API - tipos del contrato (en español).
// Ubicación sugerida: src/types/atlas.ts

// ------------------------------------------------------------ enumerados ---

export type EstadoOrden =
  | "pendiente"
  | "asignada"
  | "aceptada"
  | "en_proceso"
  | "completada"
  | "cancelada";

export type PrioridadOrden = "baja" | "media" | "alta" | "critica";

export type EstadoCuadrilla = "disponible" | "ocupada" | "fuera_de_servicio";

export type RolUsuario =
  | "admin"
  | "planificador"
  | "despachador"
  | "tecnico"
  | "operador"
  // Quien atiende el pañol: administra materiales y emite remitos.
  | "panolero";

export type TipoArchivo =
  | "firma"
  | "foto"
  | "foto_antes"
  | "foto_despues"
  // Foto del vehículo en un mantenimiento, e imagen adjunta a un ticket.
  | "mantenimiento"
  | "ticket";

// Fecha ISO 8601 en UTC, p. ej. 2026-07-18T13:53:25Z
export type FechaIso = string;

export interface ReferenciaBasica {
  id: string;
  nombre: string;
}

// --------------------------------------------------------------- modelos ---

export interface Orden {
  id: string;
  // Número legible autogenerado: OT-000001
  numero: string;
  titulo: string | null;
  tipo: string;
  prioridad: PrioridadOrden;
  estado: EstadoOrden;
  cliente_id: string;
  domicilio_id: string;
  cuadrilla_id: string | null;
  falla: string | null;
  descripcion: string | null;
  ticket_externo_id: string | null;
  origen: string;
  sla_id: string | null;
  /**
   * Quién se hace cargo puertas adentro. Sale de la cuadrilla asignada: al
   * asignarla, la API pone al técnico de esa cuadrilla (si es uno solo), y el
   * área se deriva de él. La API ya los devolvía; faltaban acá.
   */
  area_id: string | null;
  empleado_id: string | null;
  fecha_programada: FechaIso | null;
  firma_cliente: string | null;
  foto_despues: string | null;
  motivo_cancelacion: string | null;
  ticket_externo_actualizado: boolean;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
  asignada_en: FechaIso | null;
  aceptada_en: FechaIso | null;
  llegada_en: FechaIso | null;
  completada_en: FechaIso | null;
  cancelada_en: FechaIso | null;
  tiene_oferta_activa?: boolean;
  linea_tiempo: EventoOrden[];
}

export interface CrearOrdenInput {
  tipo: string;
  prioridad: PrioridadOrden;
  cliente_id: string;
  domicilio_id: string;
  titulo?: string;
  descripcion?: string;
  falla?: string;
  sla_id?: string;
  fecha_programada?: FechaIso;
  /**
   * Si viene, la orden nace **asignada** a esa cuadrilla en vez de pendiente, y
   * el responsable se deriva de ella. Es lo que hace que al convertir un ticket
   * que ya tenía cuadrilla no haya que volver a asignarla a mano.
   */
  cuadrilla_id?: string;
  /** Se derivan de la cuadrilla al asignarla; no se mandan a mano. */
  area_id?: string;
  empleado_id?: string;
  /**
   * De qué ticket sale esta orden. No se guarda: la API lo usa para verificar
   * que N2 haya terminado su revisión previa, y responde 409 si quedó algo
   * pendiente.
   */
  ticket_beta_id?: string;
}

/** Resultado de arrancar la cascada de despacho. */
export interface ResultadoCascada {
  ofrecida: boolean;
  motivo: string;
  cuadrilla_id?: string;
  distancia_metros?: number;
}

export type EstadoOferta = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada';

/** Una oferta de la cascada: a quién se le pasó la orden y qué contestó. */
export interface OfertaDespacho {
  id: string;
  cuadrilla: ReferenciaBasica;
  modo: 'cascada' | 'abierta';
  secuencia: number;
  distancia_metros: number | null;
  estado: EstadoOferta;
  expira_en: FechaIso | null;
  respondida_en: FechaIso | null;
  creado_en: FechaIso;
}

export interface EditarOrdenInput {
  titulo?: string;
  descripcion?: string;
  prioridad?: PrioridadOrden;
  falla?: string;
  sla_id?: string;
  fecha_programada?: FechaIso;
  tipo?: string;
  /**
   * Corregir sobre qué cliente y domicilio está la orden. Van juntos: la API
   * valida que el domicilio sea de ese cliente, así que mandar uno solo puede
   * dar 400 si no coinciden.
   */
  cliente_id?: string;
  domicilio_id?: string;
  /** El responsable sale de la cuadrilla; se manda al elegir entre sus técnicos. */
  empleado_id?: string | null;
}

export interface EventoOrden {
  /** No siempre presente: la línea de tiempo de detalle de orden no la incluye. */
  id?: string;
  tipo_evento: string;
  descripcion: string | null;
  usuario_id: string | null;
  datos: Record<string, unknown> | null;
  creado_en: FechaIso;
}

export interface Domicilio {
  id: string;
  direccion: string;
  lat: number | null;
  lng: number | null;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
  // Presente en detalle y al crear
  domicilios?: Domicilio[];
}

export interface Cuadrilla {
  id: string;
  nombre: string;
  estado: EstadoCuadrilla;
  ubicacion: { lat: number; lng: number } | null;
  ubicacion_actualizada_en: FechaIso | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
  codigo?: string | null;
  especialidad?: string | null;
  zona?: string | null;
  // Presente en el detalle
  tecnicos?: Tecnico[];
  vehiculo?: Vehiculo | null;
  /**
   * Los trabajos que puede tomar: la unión de las áreas de sus técnicos. Una
   * hace soportes, instalaciones y retiros; otra solo instalaciones. No se
   * carga a mano — sale de la gente que tiene adentro.
   *
   * undefined = la API todavía no lo calcula (falta la migración del Pedido 11).
   */
  areas?: ReferenciaBasica[];
}

export type EstadoTecnico = "activo" | "inactivo";

export interface Tecnico {
  id: string;
  cuadrilla_id: string;
  nombre: string;
  telefono: string | null;
  estado: EstadoTecnico;
  /** Empleado del padrón del que sale este técnico. null en las cargas viejas a mano. */
  empleado_id?: string | null;
  /** Área y puesto del empleado; los resuelve el backend al traer la cuadrilla. */
  area?: string | null;
  puesto?: string | null;
  /** Todo lo que esta persona sabe hacer, no solo su área principal. */
  areas?: ReferenciaBasica[];
}

/**
 * Vehículo tal como lo reporta el GPS externo, ya normalizado por la API.
 * El proveedor no maneja alias: el "nombre" de la unidad es su patente.
 */
export interface VehiculoGps {
  patente: string;
  unidad: string;
  lat: number;
  lng: number;
  reportado_en: FechaIso | null;
  velocidad: number | null;
  encendido: boolean | null;
  /** Cuadrilla cuya patente coincide con la de esta unidad. */
  cuadrilla: { id: string; nombre: string; estado: EstadoCuadrilla } | null;
  minutos_desde_reporte: number | null;
}

export interface FlotaGps {
  vehiculos: VehiculoGps[];
  total: number;
  con_cuadrilla: number;
  obtenido_en: FechaIso;
  /** cache_vencida = el proveedor no respondió y se sirve la última copia. */
  fuente: 'remoto' | 'cache' | 'cache_vencida';
}

export interface Vehiculo {
  id: string;
  cuadrilla_id: string;
  marca: string | null;
  modelo: string | null;
  patente: string | null;
  anio: number | null;
  color: string | null;
}

/** Un servicio/reparación registrado por un técnico al vehículo de una cuadrilla. */
export interface MantenimientoVehiculo {
  id: string;
  tecnico_id: string;
  tecnico_nombre: string;
  cuadrilla_id: string;
  cuadrilla_nombre: string;
  /** Fecha sin hora: YYYY-MM-DD. */
  fecha: string;
  tipo: string;
  detalle: string | null;
  /** Ruta relativa de la API (/v1/archivos/{id}) o null si no se adjuntó foto. */
  foto_url: string | null;
  /**
   * NO existe en la API v1 documentada (confirmado 2026-08-11): un mantenimiento
   * tiene una sola foto (foto_url) — POST /v1/mantenimientos/{id}/foto solo acepta
   * un archivo por vez y no hay endpoint que devuelva un array. "Hasta 5 fotos" es
   * un pedido pendiente a backend, no algo que el front pueda armar hoy.
   * Se deja el campo opcional para no romper nada si backend lo agrega; mientras
   * tanto siempre viene undefined y el front cae a foto_url.
   */
  foto_urls?: string[];
  origen_local_id: string | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  cuadrilla_id: string | null;
  activo: boolean;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
}

/** Los datos del padrón de quien está logueado, para la pantalla de Configuración. */
export interface PerfilEmpleado {
  id: string;
  nombre: string;
  telefono: string | null;
  puesto: string | null;
  legajo: string | null;
  area: string | null;
}

/**
 * "Mi cuenta" — lo que devuelve GET /v1/usuarios/me.
 *
 * `empleado` es null cuando la cuenta no cuelga de nadie del padrón (una cuenta
 * de sistema, como el admin inicial): en ese caso no hay teléfono que editar.
 */
export interface Perfil extends Usuario {
  empleado: PerfilEmpleado | null;
  acceso_panel?: boolean;
  acceso_app?: boolean;
}

// ------------------------------------------------- áreas y empleados ---

/**
 * Área de trabajo (Ventas, Soporte, Administración, Instalaciones…).
 *
 * Catálogo dinámico: se administra desde la pantalla de Empleados, así que
 * sumar un área nueva no requiere tocar código. Es lo que después filtra a
 * quién se le puede asignar un ticket o una orden.
 */
export interface Area {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
  /** Lo manda el backend si lo calcula; el panel también sabe contarlo solo. */
  empleados_count?: number;
}

export interface CrearAreaInput {
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

export type EditarAreaInput = Partial<CrearAreaInput>;

export type EstadoEmpleado = "activo" | "inactivo";

/**
 * Empleado: el padrón de personal de la empresa, más amplio que Tecnico.
 *
 * Tecnico es el operario de campo que pertenece a una cuadrilla; Empleado
 * incluye además a ventas, soporte, administración, etc. Son entidades
 * distintas y conviven: acá no se toca a los técnicos existentes.
 */
export interface Empleado {
  id: string;
  nombre: string;
  legajo: string | null;
  documento: string | null;
  puesto: string | null;
  /** El área principal: el sector al que pertenece. Siempre está. */
  area_id: string;
  /** Puede venir embebido desde el backend; si no, se resuelve con el listado de áreas. */
  area?: ReferenciaBasica | null;
  /**
   * Todas las áreas en las que trabaja, incluida la principal (Pedido 11). Una
   * cuadrilla puede hacer soportes, instalaciones y retiros porque su gente
   * está en esas áreas.
   *
   * undefined = la API maneja una sola área (falta correr la migración).
   */
  areas?: ReferenciaBasica[];
  email: string | null;
  telefono: string | null;
  estado: EstadoEmpleado;
  /** Fecha sin hora: YYYY-MM-DD. */
  fecha_ingreso: string | null;
  notas: string | null;
  /**
   * Cuenta con la que esta persona inicia sesión (Pedido 9).
   *
   * null = está en el padrón pero no tiene acceso.
   * undefined = la API todavía no sabe de accesos (falta correr la migración).
   * No es lo mismo: por eso el panel esconde la sección en vez de ofrecer algo
   * que no tendría dónde guardarse.
   */
  acceso?: AccesoEmpleado | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
}

export interface CrearEmpleadoInput {
  nombre: string;
  area_id: string;
  /**
   * Las demás áreas en las que trabaja. La principal se agrega sola, así que
   * no hace falta repetirla. Si no se manda, la lista queda como estaba.
   */
  area_ids?: string[];
  legajo?: string | null;
  documento?: string | null;
  puesto?: string | null;
  email?: string | null;
  telefono?: string | null;
  estado?: EstadoEmpleado;
  fecha_ingreso?: string | null;
  notas?: string | null;
}

export type EditarEmpleadoInput = Partial<CrearEmpleadoInput>;

export const etiquetasEstadoEmpleado: Record<EstadoEmpleado, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

export const etiquetasRolAcceso: Record<RolUsuario, string> = {
  admin: "Administrador",
  planificador: "Planificador",
  despachador: "Despachador",
  tecnico: "Técnico",
  operador: "Operador",
  panolero: "Pañolero",
};

/**
 * Acceso al sistema de un empleado (Pedido 9) — el empleado ES el usuario.
 *
 * No se dan de alta "usuarios" por separado: se le habilita el ingreso a
 * alguien que ya está en el padrón y se elige a qué entra. `panel` y `app` son
 * dos sistemas distintos: el panel web y la app móvil del técnico.
 */
export interface AccesoEmpleado {
  usuario_id: string;
  /** Con este email inicia sesión; arranca copiando el del padrón. */
  email: string;
  rol: RolUsuario;
  /** Para el rol técnico sale sola: es la cuadrilla en la que ya es técnico. */
  cuadrilla_id: string | null;
  panel: boolean;
  app: boolean;
  /** false = cuenta suspendida: existe, pero no puede entrar. */
  activo: boolean;
}

export interface GuardarAccesoInput {
  email?: string;
  rol: RolUsuario;
  acceso_panel: boolean;
  acceso_app: boolean;
  cuadrilla_id?: string | null;
  activo?: boolean;
  /** Una de las dos: una contraseña elegida, o que la genere el sistema. */
  password?: string;
  generar?: boolean;
}

export interface AccesoGuardado extends AccesoEmpleado {
  empleado_id: string;
  /** Solo si se pidió generarla: se muestra una vez y no vuelve a estar. */
  password_generada?: string;
}

// --------------------------------------------- tareas internas (Pedido 10) ---

export type EstadoTarea = "pendiente" | "en_curso" | "hecha" | "cancelada";
export type PrioridadTarea = "baja" | "media" | "alta";
export type Recurrencia = "diaria" | "semanal" | "mensual";

/**
 * Qué pide cada ítem de la tarea.
 *
 * `tilde` se marca y listo. `texto` y `numero` piden un dato: es lo que hace que
 * una tarea recurrente sirva como parte diario (cuántos afectados hay, qué se
 * revisó), porque la respuesta de cada día queda guardada.
 */
export type TipoItemTarea = "tilde" | "texto" | "numero";

export const etiquetasEstadoTarea: Record<EstadoTarea, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  hecha: "Hecha",
  cancelada: "Cancelada",
};

export const etiquetasPrioridadTarea: Record<PrioridadTarea, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const etiquetasTipoItem: Record<TipoItemTarea, string> = {
  tilde: "Solo tildar",
  texto: "Pide un texto",
  numero: "Pide un número",
};

export const etiquetasRecurrencia: Record<Recurrencia, string> = {
  diaria: "Todos los días",
  semanal: "Ciertos días de la semana",
  mensual: "Una vez al mes",
};

/** Días ISO: 1 = lunes … 7 = domingo. */
export const diasDeLaSemana: Array<{ valor: number; corto: string; largo: string }> = [
  { valor: 1, corto: "Lu", largo: "Lunes" },
  { valor: 2, corto: "Ma", largo: "Martes" },
  { valor: 3, corto: "Mi", largo: "Miércoles" },
  { valor: 4, corto: "Ju", largo: "Jueves" },
  { valor: 5, corto: "Vi", largo: "Viernes" },
  { valor: 6, corto: "Sá", largo: "Sábado" },
  { valor: 7, corto: "Do", largo: "Domingo" },
];

export interface TareaItem {
  id: string;
  texto: string;
  tipo: TipoItemTarea;
  obligatorio: boolean;
  hecho: boolean;
  /** La respuesta cargada, cuando el ítem pide un dato. */
  respuesta: string | null;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  vence_el: FechaIso | null;
  completada_en: FechaIso | null;
  /**
   * El responsable. null cuando la tarea es de un área y todavía no la tomó
   * nadie: en ese caso la puede hacer cualquiera del sector.
   */
  empleado: ReferenciaBasica | null;
  /**
   * El área a la que va dirigida (Pedido 11). null si es de una persona sola.
   * undefined con la API sin migrar.
   */
  area?: ReferenciaBasica | null;
  /** Quién la pidió. null si esa persona ya no está en el padrón. */
  creado_por: ReferenciaBasica | null;
  /** De qué plantilla salió, y a qué día corresponde. */
  plantilla_id: string | null;
  fecha_objetivo: string | null;
  items: TareaItem[];
  items_total: number;
  items_hechos: number;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
}

export interface ItemInput {
  texto: string;
  tipo?: TipoItemTarea;
  obligatorio?: boolean;
}

/** Al menos uno de los dos destinos: una persona o un área. */
export interface CrearTareaInput {
  titulo: string;
  empleado_id?: string;
  area_id?: string;
  descripcion?: string | null;
  prioridad?: PrioridadTarea;
  vence_el?: string | null;
  items?: ItemInput[];
}

export interface EditarTareaInput {
  titulo?: string;
  descripcion?: string | null;
  /** null suelta la tarea: vuelve a ser del área. */
  empleado_id?: string | null;
  area_id?: string | null;
  estado?: EstadoTarea;
  prioridad?: PrioridadTarea;
  vence_el?: string | null;
}

export interface PlantillaItem {
  id: string;
  texto: string;
  tipo: TipoItemTarea;
  obligatorio: boolean;
}

/** La tarea que se repite sola: el cron la materializa cada día que toca. */
export interface TareaPlantilla {
  id: string;
  titulo: string;
  descripcion: string | null;
  /** null cuando la plantilla es de un área entera. */
  empleado: ReferenciaBasica | null;
  area?: ReferenciaBasica | null;
  creado_por: ReferenciaBasica | null;
  prioridad: PrioridadTarea;
  recurrencia: Recurrencia;
  /** Solo para 'semanal'. */
  dias_semana: number[];
  /** Solo para 'mensual'. */
  dia_mes: number | null;
  /** HH:MM — a qué hora vence la tarea generada. */
  hora: string;
  activo: boolean;
  items: PlantillaItem[];
  creado_en: FechaIso;
  actualizado_en: FechaIso;
}

export interface CrearPlantillaInput {
  titulo: string;
  /** Al menos uno de los dos, igual que en la tarea suelta. */
  empleado_id?: string | null;
  area_id?: string | null;
  recurrencia: Recurrencia;
  descripcion?: string | null;
  prioridad?: PrioridadTarea;
  dias_semana?: number[];
  dia_mes?: number | null;
  hora?: string;
  activo?: boolean;
  items?: ItemInput[];
}

export type TipoNotificacion = "info" | "success" | "warning" | "error";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string | null;
  /** Ruta del panel a la que lleva al tocarla. */
  link: string | null;
  entidad: string | null;
  entidad_id: string | null;
  leida: boolean;
  creado_en: FechaIso;
}

export interface Archivo {
  id: string;
  orden_id?: string;
  tipo: TipoArchivo;
  nombre_original?: string | null;
  mime: string;
  tamano: number;
  // Ruta relativa de la API: /v1/archivos/{id}
  url: string;
  creado_en: FechaIso;
}

export interface Sla {
  id: string;
  nombre: string;
  descripcion: string | null;
  // Minutos
  tiempo_resolucion: number;
  tiempo_respuesta: number | null;
  prioridad: PrioridadOrden | null;
  activo: boolean;
}

// ------------------------------------------------- materiales y stock ---

/** Material del depósito. El stock se lleva por cantidad, no por unidad física. */
export interface Material {
  id: string;
  codigo: string | null;
  /** Código de barras del PRODUCTO (no el número de serie del equipo). */
  codigo_barras: string | null;
  nombre: string;
  detalle: string | null;
  categoria: string | null;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  /** Lo calcula la API: stock_minimo > 0 y stock_actual por debajo o igual. */
  bajo_stock: boolean;
  precio_unitario: number;
  activo: boolean;
  /** Modems, ONTs: al entregarlos hay que registrar una serie por unidad. */
  requiere_serie: boolean;
  id_externo: number | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso | null;
}

export interface CrearMaterialInput {
  nombre: string;
  codigo?: string | null;
  codigo_barras?: string | null;
  categoria?: string | null;
  unidad?: string;
  detalle?: string | null;
  stock_actual?: number;
  stock_minimo?: number;
  precio_unitario?: number;
  activo?: boolean;
  requiere_serie?: boolean;
  /**
   * Solo en el alta: que el backend le arme un código de barras propio. Sirve
   * para lo que se compra suelto, que no viene con código de fábrica.
   */
  generar_codigo_barras?: boolean;
}

export type EditarMaterialInput = Partial<CrearMaterialInput>;

/** Recuento: fija el stock en ese valor (no es un delta). */
export interface AjusteStock {
  material_id: string;
  stock_actual: number;
}

export type TipoRemito = "entrega" | "devolucion";
export type DestinoRemito = "cuadrilla" | "empleado" | "externo";

export interface ItemRemitoInput {
  material_id: string;
  cantidad: number;
  /** Una serie por unidad en los materiales marcados con requiere_serie. */
  series: string[];
}

export interface RemitoItem extends ItemRemitoInput {
  id?: string;
  nombre?: string;
  codigo?: string | null;
  unidad?: string;
  requiere_serie?: boolean;
}

export interface Remito {
  id: string;
  numero: string;
  tipo: TipoRemito;
  destino_tipo: DestinoRemito;
  cuadrilla_id: string | null;
  cuadrilla_nombre: string | null;
  empleado_id: string | null;
  empleado_nombre: string | null;
  persona_nombre: string | null;
  persona_documento: string | null;
  /** Texto ya resuelto del destino, listo para mostrar. */
  destino: string;
  observaciones: string | null;
  estado: "confirmado" | "anulado";
  usuario_nombre: string | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
  items_count?: number;
  unidades?: number;
  /** Solo en el detalle. */
  items?: RemitoItem[];
}

export interface CrearRemitoInput {
  tipo: TipoRemito;
  destino_tipo: DestinoRemito;
  cuadrilla_id?: string;
  empleado_id?: string;
  persona_nombre?: string;
  persona_documento?: string;
  observaciones?: string;
  items: ItemRemitoInput[];
}

/** Lo que una cuadrilla tiene arriba del vehículo. */
export interface StockCuadrillaItem {
  material_id: string;
  nombre: string;
  codigo: string | null;
  categoria: string | null;
  unidad: string;
  cantidad: number;
  requiere_serie: boolean;
  actualizado_en: FechaIso;
}

/** Material consumido en una orden; descuenta del stock de la cuadrilla. */
export interface ConsumoOrden {
  id: string;
  material_id: string;
  nombre: string;
  /** Null en los materiales cargados antes de que existiera el campo. */
  codigo: string | null;
  categoria: string | null;
  unidad: string;
  cantidad: number;
  series: string[];
  cuadrilla_id: string | null;
  creado_en: FechaIso;
}

// --------------------------------------------------------- presupuestos ---

export type EstadoPresupuesto = "borrador" | "despachado" | "anulado";

export interface ItemPresupuestoInput {
  material_id: string;
  cantidad: number;
  /** Si no viene, la API toma el precio del catálogo. */
  precio_unitario?: number;
  series: string[];
}

export interface PresupuestoItem extends ItemPresupuestoInput {
  id?: string;
  nombre?: string;
  codigo?: string | null;
  unidad?: string;
  requiere_serie?: boolean;
  precio_unitario: number;
  /** cantidad × precio_unitario, calculado por la API. */
  subtotal?: number;
}

/**
 * Cotización con precios. No mueve stock: el descuento del depósito ocurre
 * cuando se despacha.
 */
export interface Presupuesto {
  id: string;
  numero: string;
  destinatario: string;
  documento: string | null;
  contacto: string | null;
  observaciones: string | null;
  estado: EstadoPresupuesto;
  despachado_en: FechaIso | null;
  usuario_nombre: string | null;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
  items_count?: number;
  unidades?: number;
  total?: number;
  /** Solo en el detalle. */
  items?: PresupuestoItem[];
}

export interface CrearPresupuestoInput {
  destinatario: string;
  documento?: string;
  contacto?: string;
  observaciones?: string;
  items: ItemPresupuestoInput[];
}

// ------------------------------------------------------------------ beta ---

// Ticket beta - pestaña "Datos" del modal Crear Ticket.
// Va a POST /v1/tickets-beta. Endpoint todavía no publicado por backend.
/**
 * Ticket beta — captura rápida, tal como la devuelve la API.
 *
 * Los nombres son los del backend: `cliente_telefono` y `hora_visita`. Este
 * tipo declaraba `telefono` y `hora`, que eran los que mandaba el panel y que
 * la API nunca entendió; de ahí que el alta fallara siempre con 400.
 *
 * El cliente y la dirección son texto libre, no `cliente_id`: un ticket puede
 * ser de alguien que no está en el padrón.
 */
export interface TicketBeta {
  id: string;
  cliente: string | null;
  cliente_telefono: string | null;
  direccion: string | null;
  zona: string | null;
  posicion: string | null;
  tipo: string;
  cuadrilla_id: string | null;
  /**
   * Vínculo con el padrón, cuando el ticket se cargó eligiendo un cliente del
   * sistema. null si es de alguien que no está en el padrón (o si el ticket es
   * anterior a la migración que agregó estas columnas).
   */
  cliente_id: string | null;
  domicilio_id: string | null;
  // Área responsable y empleado; se derivan de la cuadrilla.
  area_id: string | null;
  empleado_id: string | null;
  prioridad: PrioridadOrden;
  estado: string;
  fecha_visita: string | null;
  /** HH:MM:SS */
  hora_visita: string | null;
  caja: string | null;
  precinto: string | null;
  sn: string | null;
  url_mapa: string | null;
  descripcion: string | null;
  /**
   * Por qué reclama el cliente. Junto con el `tipo` decide qué verificación de
   * N2 le toca al ticket: una reparación por "sin señal" se revisa distinto que
   * una por "velocidad baja".
   *
   * null en los tickets anteriores al Pedido 15 y en los que entran por API sin
   * indicarlo.
   */
  motivo: string | null;
  /**
   * Estado de la verificación de N2, calculado por la API para todo el listado
   * de una sola vez. `verificacion_total = 0` significa que ese tipo no tiene
   * plantilla de verificación: no hay nada que completar y el ticket se puede
   * convertir en OT sin trabas.
   */
  verificacion_total?: number;
  verificacion_pendiente?: number;
  verificacion_completa?: boolean;
  /**
   * Cuántas imágenes tiene adjuntas. Viene en el listado para poder ver desde
   * la bandeja que el reclamo trae una foto, sin abrir cada ticket.
   *
   * undefined si la migración del Pedido 17 todavía no corrió.
   */
  fotos_total?: number;
  creado_en: FechaIso;
  actualizado_en?: FechaIso;
}

/**
 * Motivos de reclamo. Son los mismos que las órdenes usan en `falla`, para que
 * al convertir el ticket en OT el dato viaje sin traducción.
 */
export const MOTIVOS_TICKET = [
  'sin_senal',
  'intermitencia',
  'velocidad_baja',
  'dano_fisico_equipo',
  'otro',
] as const;

export type MotivoTicket = (typeof MOTIVOS_TICKET)[number];

export const etiquetasMotivoTicket: Record<MotivoTicket, string> = {
  sin_senal: 'Sin señal',
  intermitencia: 'Intermitencia',
  velocidad_baja: 'Velocidad baja',
  dano_fisico_equipo: 'Daño físico del equipo',
  otro: 'Otro',
};

/** Un ítem de la verificación que hace N2 sobre el ticket. */
export interface ItemChecklistTicket {
  id: string;
  ticket_id: string | null;
  clave: string;
  texto: string;
  tipo: TipoItemChecklist;
  /** Sin responder impide convertir el ticket en orden de trabajo. */
  obligatorio: boolean;
  orden: number;
  hecho: boolean;
  respuesta: string | null;
  completado_en: FechaIso | null;
  usuario_id: string | null;
}

export interface VerificacionTicket {
  ticket_id: string;
  data: ItemChecklistTicket[];
  completo: boolean;
  faltantes: { clave: string; texto: string }[];
  ignoradas?: string[];
}

// ------------------------------------------------------------- dashboard ---

export interface DashboardTarjetas {
  ordenes_pendientes: number;
  ordenes_en_proceso: number;
  // asignada + aceptada
  ordenes_asignadas: number;
  completadas_hoy: number;
  // Abiertas cuya fecha_programada ya pasó
  ordenes_vencidas: number;
  cuadrillas_disponibles: number;
  cuadrillas_ocupadas: number;
  cuadrillas_fuera_servicio: number;
}

export interface ConteoPorPrioridad {
  prioridad: PrioridadOrden;
  cantidad: number;
}

export interface ConteoPorEstado {
  estado: EstadoOrden;
  cantidad: number;
}

export interface DashboardGraficos {
  // Siempre las 4 prioridades, incluso en cero. Solo OT abiertas.
  ordenes_por_prioridad: ConteoPorPrioridad[];
  // Siempre los 6 estados, incluso en cero. Todas las OT.
  ordenes_por_estado: ConteoPorEstado[];
}

export interface OrdenReciente {
  id: string;
  numero: string;
  titulo: string | null;
  tipo: string;
  estado: EstadoOrden;
  prioridad: PrioridadOrden;
  creado_en: FechaIso;
  fecha_programada: FechaIso | null;
  cliente: ReferenciaBasica;
  // null cuando todavía no tiene cuadrilla asignada
  cuadrilla: ReferenciaBasica | null;
}

export interface SlaResumen {
  id: string;
  nombre: string;
  tiempo_resolucion: number;
}

export interface AlertaSla {
  id: string;
  numero: string;
  titulo: string | null;
  estado: EstadoOrden;
  prioridad: PrioridadOrden;
  fecha_programada: FechaIso;
  // Negativo si el compromiso ya venció
  minutos_restantes: number;
  vencida: boolean;
  /** null cuando la orden no tiene SLA asignado: igual alerta por fecha_programada. */
  sla: SlaResumen | null;
  cliente: ReferenciaBasica;
  cuadrilla_nombre: string | null;
}

export interface EventoActividad {
  id: string;
  orden_id: string;
  orden_numero: string;
  orden_titulo: string | null;
  tipo_evento: string;
  descripcion: string | null;
  usuario_nombre: string | null;
  creado_en: FechaIso;
}

export interface DashboardData {
  tarjetas: DashboardTarjetas;
  graficos: DashboardGraficos;
  ordenes_recientes: OrdenReciente[];
  alertas_sla: AlertaSla[];
  actividad: EventoActividad[];
  generado_en: FechaIso;
}

// ------------------------------------------------------ presentación UI ---

export const coloresEstado: Record<EstadoOrden, string> = {
  pendiente: "bg-slate-400",
  asignada: "bg-blue-500",
  aceptada: "bg-indigo-500",
  en_proceso: "bg-amber-500",
  completada: "bg-emerald-500",
  cancelada: "bg-red-500",
};

export const etiquetasEstado: Record<EstadoOrden, string> = {
  pendiente: "Pendiente",
  asignada: "Asignada",
  aceptada: "Aceptada",
  en_proceso: "En proceso",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const etiquetasPrioridad: Record<PrioridadOrden, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

// ------------------------------------------------------------- checklist ---

/**
 * Checklist de la OT (Pedido 12): lo que el técnico releva en el sitio.
 *
 * Los ítems salen de una plantilla por tipo de orden y se copian a la OT al
 * crearla, con su texto: corregir la plantilla después no reescribe lo ya
 * relevado. La `clave` es estable y es con la que la app móvil manda las
 * respuestas sin conocer los uuid.
 */
export type TipoItemChecklist = "tilde" | "texto" | "numero";

export interface ItemChecklistOrden {
  id: string;
  orden_id: string;
  clave: string;
  texto: string;
  tipo: TipoItemChecklist;
  /** Sin completar impide cerrar la orden. */
  obligatorio: boolean;
  orden: number;
  hecho: boolean;
  /** Lo respondido cuando el ítem pide un dato. En los `tilde` es null. */
  respuesta: string | null;
  completado_en: FechaIso | null;
  usuario_id: string | null;
}

export interface ChecklistOrden {
  orden_id: string;
  data: ItemChecklistOrden[];
  completo: boolean;
  /** Lo que bloquea el cierre, listo para mostrar. */
  faltantes: { clave: string; texto: string }[];
  /** Claves que la orden no tiene; solo vuelve en el PATCH. */
  ignoradas?: string[];
}

export interface ItemPlantillaChecklist {
  id: string;
  clave: string;
  texto: string;
  tipo: TipoItemChecklist;
  obligatorio: boolean;
  orden: number;
}

export interface PlantillaChecklist {
  id: string;
  tipo_orden: string;
  nombre: string;
  activo: boolean;
  items: ItemPlantillaChecklist[];
  items_count: number;
  creado_en: FechaIso;
  actualizado_en: FechaIso;
}

/** Lo que se manda al guardar una plantilla; sin `clave` se deriva del texto. */
export interface ItemPlantillaInput {
  clave?: string;
  texto: string;
  tipo: TipoItemChecklist;
  obligatorio: boolean;
}

export const etiquetasTipoItemChecklist: Record<TipoItemChecklist, string> = {
  tilde: "Tilde",
  texto: "Texto",
  numero: "Número",
};

// Convierte los minutos que devuelve la alerta de SLA en un texto legible.
// Negativo = ya venció.
export function textoVencimiento(minutos: number): string {
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;
  const lapso = horas > 0 ? horas + " h " + resto + " min" : resto + " min";
  return minutos < 0 ? "Vencida hace " + lapso : "Vence en " + lapso;
}
