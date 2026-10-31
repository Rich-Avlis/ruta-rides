export type UserRole =
  | 'PASSENGER'
  | 'DRIVER'
  | 'ADMIN'
  | 'SUPPORT'
  | 'DOCUMENT_VERIFIER'
  | 'SUPER_ADMIN';

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  rol: UserRole;
  foto: string | null;
  activo?: boolean;
  verificado?: boolean;
}

export interface DriverProfile {
  id: string;
  userId: string;
  calificacion: number;
  cantidadViajes: number;
  nivel: string;
  enLinea: boolean;
  ubicacionLat: number | null;
  ubicacionLng: number | null;
  tipoVehiculo: string;
  marcaVehiculo: string | null;
  modeloVehiculo: string | null;
  colorVehiculo: string | null;
  placaVehiculo: string | null;
}

export interface PassengerProfile {
  id: string;
  userId: string;
  codigoReferido?: string | null;
}

export type Profile = DriverProfile | PassengerProfile;

export interface ProfileResponse {
  user: User;
  profile: Profile | null;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  password: string;
  rol: Extract<UserRole, 'PASSENGER' | 'DRIVER'>;
  tipoVehiculo?: string;
  marcaVehiculo?: string;
  modeloVehiculo?: string;
  colorVehiculo?: string;
  placaVehiculo?: string;
}

export interface Ride {
  id: string;
  pasajeroId: string;
  conductorId: string | null;
  estado: string;
  origenLat: number;
  origenLng: number;
  destinoLat: number;
  destinoLng: number;
  origenDireccion: string | null;
  destinoDireccion: string | null;
  distancia: number | null;
  tiempoEstimado: number | null;
  tarifaBase: number | null;
  tarifaFinal: number | null;
  metodoPago: string | null;
  modalidad?: RideModality;
  moneda?: string;
  totalBs?: number | null;
  tasaCambio?: number | null;
  canceladoPor?: 'PASAJERO' | 'CONDUCTOR' | 'SISTEMA' | null;
  motivoCancelacion?: string | null;
  distanciaRecogida?: number | null;
  createdAt: string;
  pasajero?: PublicUser;
  conductor?: PublicUser | null;
  stops?: RideStop[];
  eventos?: RideEvent[];
  negociaciones?: Negotiation[];
  pago?: Payment | null;
  calificacionPasajero?: number | null;
  calificacionConductor?: number | null;
  comentariosPasajero?: string | null;
  comentariosConductor?: string | null;
}

export interface Negotiation {
  id: string;
  rideId: string;
  usuarioId: string;
  monto: number;
  tipo: 'OFERTA' | 'CONTRAOFERTA';
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'COUNTERED' | 'EXPIRADA';
  expiraEn?: string | null;
  createdAt: string;
  usuario?: { id: string; nombre: string; apellido: string; rol: string } | null;
}

export interface Payment {
  id: string;
  monto: number;
  metodo: string;
  estado: string;
  referencia: string | null;
  comprobante?: string | null;
  fechaPago: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  motivo: string | null;
  createdAt: string;
  actor?: { id: string; nombre: string; apellido: string; rol: string } | null;
}

export interface LocalPlace {
  id: string;
  nombre: string;
  categoria: string;
  direccion: string | null;
  lat: number;
  lng: number;
  activo: boolean;
}

export interface NotificationItem {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  datos?: Record<string, unknown> | null;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  nombre: string;
  apellido: string;
  foto?: string | null;
  telefono?: string | null;
  driverProfile?: DriverProfile | null;
}

export interface RideStop {
  id: string;
  orden: number;
  tipo: string;
  nombre: string | null;
  direccion: string | null;
  lat: number;
  lng: number;
}

export interface RideEvent {
  id: string;
  estado: string;
  actorRol: string | null;
  motivo: string | null;
  createdAt: string;
  actor?: { id: string; nombre: string; apellido: string; rol: string } | null;
}


export interface Place {
  id?: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  tipo?: string | null;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: Array<[number, number]>;
}

export interface RoutePreview {
  distanceKm: number;
  durationMin: number;
  geometry: RouteGeometry | null;
  provider: string;
}

export interface FareBreakdown {
  base: number;
  distanciaKm: number;
  distancia: number;
  duracionMin: number;
  tiempo: number;
  subtotal: number;
  recargo: number;
  descuento: number;
  multiplicadorZona: number;
  multiplicadorDemanda: number;
  multiplicadorNocturno: number;
  multiplicadorTotal: number;
  horarioNocturno: boolean;
  porcentajeDescuento: number;
  totalBs: number | null;
  tasaCambio: number | null;
  monedaBs: string;
}

export interface Quote {
  id: string;
  modalidad: RideModality;
  origenLat: number;
  origenLng: number;
  origenDireccion: string | null;
  destinoLat: number;
  destinoLng: number;
  destinoDireccion: string | null;
  stops: Array<{ lat: number; lng: number; nombre?: string | null; direccion?: string | null }>;
  distanciaKm: number;
  duracionMin: number;
  geometry: RouteGeometry | null;
  desglose: FareBreakdown;
  multiplicadores: { zona: number; demanda: number; nocturno: number };
  subtotal: number;
  descuento: number;
  minimoAplicado: boolean;
  total: number;
  moneda: string;
  fareId: string;
  expiraEn: string;
  createdAt?: string;
}

export interface QuoteResponse {
  quote: Quote;
  route: RoutePreview;
}


export type RideModality = 'SOLO_IDA' | 'IDA_VUELTA' | 'MULTIPARADA';

export type FavoriteLabel = 'CASA' | 'TRABAJO' | 'OTRO';

export interface FavoritePlace {
  id: string;
  label: FavoriteLabel;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  createdAt?: string;
}


