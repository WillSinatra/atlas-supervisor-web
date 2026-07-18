// ============ USUARIOS Y AUTENTICACIÓN ============

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============ ÓRDENES DE TRABAJO ============

export type WorkOrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'REOPENED';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type WorkOrderType = 'INSTALLATION' | 'MAINTENANCE' | 'REPAIR' | 'REMOVAL' | 'UPGRADE' | 'OTHER';

export interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  description?: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  type: WorkOrderType;
  source?: string;
  estimatedTime?: number;
  totalTime?: number;
  scheduledDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  diagnosis?: string;
  resolution?: string;
  notes?: string;
  customerId: string;
  customer?: CustomerBrief;
  addressId?: string;
  address?: AddressBrief;
  assignedToId?: string;
  assignedTo?: UserBrief;
  createdById: string;
  createdBy?: UserBrief;
  crewId?: string;
  crew?: CrewBrief;
  slaId?: string;
  sla?: SLABrief;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderDetail extends WorkOrder {
  checklistItems: ChecklistItem[];
  materials: WorkOrderMaterial[];
  photos: Photo[];
  signature?: Signature;
  statusHistory: StatusHistory[];
  timeline: TimelineEntry[];
  auditLogs: AuditLog[];
}

export interface CustomerBrief {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AddressBrief {
  street: string;
  number?: string;
  city: string;
  neighborhood?: string;
}

export interface UserBrief {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface CrewBrief {
  id: string;
  name: string;
  code: string;
}

export interface SLABrief {
  name: string;
  responseTime: number;
  resolveTime: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  sortOrder: number;
}

export interface WorkOrderMaterial {
  id: string;
  materialId: string;
  material: Material;
  quantity: number;
  unitPrice?: number;
}

export interface Photo {
  id: string;
  url: string;
  thumbnail?: string;
  type?: string;
  label?: string;
  createdAt: string;
}

export interface Signature {
  id: string;
  url: string;
  name?: string;
  document?: string;
  documentNumber?: string;
}

export interface StatusHistory {
  id: string;
  fromStatus?: WorkOrderStatus;
  toStatus: WorkOrderStatus;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface TimelineEntry {
  id: string;
  type: string;
  title: string;
  description?: string;
  userId?: string;
  createdAt: string;
}

// ============ CUADRILLAS ============

export type CrewStatus = 'disponible' | 'en_viaje' | 'trabajando' | 'en_pausa' | 'fuera_de_servicio';
// TODO: no confirmado en Tomo II todavía si el técnico individual comparte este mismo enum
// de 5 estados o tiene el suyo propio — se deja el valor anterior hasta confirmar (ver aviso al usuario).
export type TechnicianStatus = 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFFLINE';
export type VehicleType = 'TRUCK' | 'VAN' | 'MOTORCYCLE' | 'BICYCLE' | 'OTHER';

export interface Crew {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: CrewStatus;
  specialty?: string;
  zone?: string;
  latitude?: number;
  longitude?: number;
  lastGpsUpdate?: string;
  isActive: boolean;
  technicians: Technician[];
  vehicle?: Vehicle;
  _count?: {
    workOrders: number;
    technicians: number;
  };
  createdAt: string;
}

export interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  status: TechnicianStatus;
  specialty?: string;
  latitude?: number;
  longitude?: number;
  lastGpsUpdate?: string;
  isActive: boolean;
  crewId: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plate: string;
  type: VehicleType;
  year?: number;
  color?: string;
}

export interface Inventory {
  id: string;
  material: Material;
  quantity: number;
  minQuantity: number;
}

export interface CrewDetail extends Crew {
  inventory: Inventory[];
  workOrders: WorkOrder[];
}

// ============ CLIENTES ============

export interface Customer {
  id: string;
  externalId?: string;
  documentType?: string;
  documentNumber?: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  email?: string;
  phone: string;
  phone2?: string;
  notes?: string;
  isActive: boolean;
  addresses: CustomerAddress[];
  equipments: Equipment[];
  _count?: {
    workOrders: number;
    addresses: number;
    equipments: number;
  };
  createdAt: string;
}

export interface CustomerAddress {
  id: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  isMain: boolean;
  label?: string;
}

export interface CustomerDetail extends Customer {
  workOrders: WorkOrder[];
}

export interface Equipment {
  id: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  macAddress?: string;
  status?: string;
  installedAt?: string;
  notes?: string;
}

// ============ MATERIALES ============

export interface Material {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  unitPrice?: number;
}

// ============ SLA ============

export interface SLA {
  id: string;
  name: string;
  description?: string;
  priority: WorkOrderPriority;
  type: WorkOrderType;
  responseTime: number;
  resolveTime: number;
}

// ============ NOTIFICACIONES ============

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message?: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  link?: string;
  createdAt: string;
}

// ============ AUDITORÍA ============

export interface AuditLog {
  id: string;
  userId?: string;
  user?: UserBrief;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// ============ DASHBOARD ============

export interface DashboardData {
  cards: {
    pendingOrders: number;
    inProgressOrders: number;
    completedToday: number;
    overdueOrders: number;
    availableCrews: number;
    busyCrews: number;
  };
  charts: {
    ordersByPriority: Array<{ priority: string; _count: number }>;
    ordersByStatus: Array<{ status: string; _count: number }>;
  };
  recentOrders: WorkOrder[];
  slaAlerts: WorkOrder[];
  activityTimeline: TimelineEntry[];
}

// ============ REPORTES ============

export interface OperationalKpi {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  completionRate: number;
  averageTimeMinutes: number;
}

export interface CrewProductivity {
  id: string;
  name: string;
  code: string;
  specialty?: string;
  completedOrders: number;
  averageTime: number;
}

export interface SlaCompliance {
  totalSlaOrders: number;
  withinSla: number;
  exceededSla: number;
  complianceRate: number;
}

export interface MaterialUsage {
  id: string;
  name: string;
  code: string;
  category?: string;
  totalUsed: number;
}

export interface CostBreakdownItem {
  id: string;
  name: string;
  total: number;
}

export interface CostsReport {
  totalPeriod: number;
  byCrew: CostBreakdownItem[];
  byMaterial: CostBreakdownItem[];
}

export interface SlaComplianceGroup {
  id: string;
  name: string;
  totalOrders: number;
  withinSla: number;
  complianceRate: number;
}

export interface SlaComplianceReport {
  byCrew: SlaComplianceGroup[];
  byCustomerType: SlaComplianceGroup[];
}

export interface RecurrenceEntry {
  addressId: string;
  customerName: string;
  addressLabel: string;
  claimsCount: number;
  lastClaimDate: string;
}

export type SatisfactionDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export interface SatisfactionReport {
  average: number;
  totalRatings: number;
  distribution: SatisfactionDistribution;
}

// ============ PAGINACIÓN ============

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============ API ============

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path: string;
}