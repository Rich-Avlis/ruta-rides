const TRANSITIONS = {
  REQUESTED: {
    SEARCHING_DRIVER: ['ADMIN'],
    CANCELLED: ['PASSENGER', 'ADMIN']
  },
  SEARCHING_DRIVER: {
    DRIVER_ASSIGNED: ['DRIVER'],
    CANCELLED: ['PASSENGER', 'ADMIN']
  },
  DRIVER_ASSIGNED: {
    DRIVER_EN_ROUTE: ['DRIVER'],
    CANCELLED: ['PASSENGER', 'DRIVER', 'ADMIN']
  },
  DRIVER_EN_ROUTE: {
    DRIVER_ARRIVED: ['DRIVER'],
    CANCELLED: ['PASSENGER', 'DRIVER', 'ADMIN']
  },
  DRIVER_ARRIVED: {
    TRIP_STARTED: ['DRIVER'],
    CANCELLED: ['PASSENGER', 'DRIVER', 'ADMIN']
  },
  TRIP_STARTED: {
    TRIP_COMPLETED: ['DRIVER', 'ADMIN'],
    CANCELLED: ['ADMIN']
  },
  TRIP_COMPLETED: {
    PAYMENT_PENDING: ['DRIVER', 'ADMIN'],
    COMPLETED: ['DRIVER', 'ADMIN'],
    CANCELLED: ['ADMIN']
  },
  PAYMENT_PENDING: {
    COMPLETED: ['DRIVER', 'ADMIN'],
    CANCELLED: ['ADMIN']
  },
  COMPLETED: {},
  CANCELLED: {}
};

const ACTIVE_STATES = [
  'REQUESTED',
  'SEARCHING_DRIVER',
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_STARTED',
  'TRIP_COMPLETED',
  'PAYMENT_PENDING'
];

const normalizeRole = (user) => {
  if (!user) return null;
  if (user.rol === 'ADMIN' || user.rol === 'SUPER_ADMIN') return 'ADMIN';
  if (user.rol === 'DRIVER') return 'DRIVER';
  if (user.rol === 'PASSENGER') return 'PASSENGER';
  return null;
};

const canTransition = ({ ride, user, next }) => {
  const role = normalizeRole(user);

  if (!role) {
    return { ok: false, code: 'forbidden', message: 'Rol no autorizado' };
  }

  const allowedRoles = TRANSITIONS[ride.estado]?.[next];

  if (!allowedRoles) {
    return {
      ok: false,
      code: 'invalid_transition',
      message: `No se puede pasar de ${ride.estado} a ${next}`
    };
  }

  if (!allowedRoles.includes(role)) {
    return { ok: false, code: 'forbidden', message: 'Tu rol no puede ejecutar esta transición' };
  }

  if (role === 'DRIVER' && ride.conductorId !== user.id) {
    return { ok: false, code: 'forbidden', message: 'No eres el conductor de este viaje' };
  }

  if (role === 'PASSENGER' && ride.pasajeroId !== user.id) {
    return { ok: false, code: 'forbidden', message: 'No eres el pasajero de este viaje' };
  }

  return { ok: true };
};

const allowedNextStates = (ride, user) => {
  const transitions = TRANSITIONS[ride.estado] || {};
  return Object.keys(transitions).filter(
    (next) => canTransition({ ride, user, next }).ok
  );
};

module.exports = {
  TRANSITIONS,
  ACTIVE_STATES,
  normalizeRole,
  canTransition,
  allowedNextStates
};
