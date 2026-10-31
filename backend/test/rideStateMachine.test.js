const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canTransition,
  allowedNextStates
} = require('../src/services/rideStateMachine');

const passenger = { id: 'p1', rol: 'PASSENGER' };
const driver = { id: 'd1', rol: 'DRIVER' };
const otherDriver = { id: 'd2', rol: 'DRIVER' };
const admin = { id: 'a1', rol: 'ADMIN' };

const ride = (estado, extra = {}) => ({
  estado,
  pasajeroId: 'p1',
  conductorId: 'd1',
  ...extra
});

test('el pasajero no puede aceptar su propio viaje', () => {
  const result = canTransition({
    ride: ride('SEARCHING_DRIVER'),
    user: passenger,
    next: 'DRIVER_ASSIGNED'
  });
  assert.equal(result.ok, false);
});

test('el conductor asignado puede avanzar a en camino', () => {
  const result = canTransition({
    ride: ride('DRIVER_ASSIGNED'),
    user: driver,
    next: 'DRIVER_EN_ROUTE'
  });
  assert.equal(result.ok, true);
});

test('otro conductor no puede avanzar el viaje', () => {
  const result = canTransition({
    ride: ride('DRIVER_ASSIGNED'),
    user: otherDriver,
    next: 'DRIVER_EN_ROUTE'
  });
  assert.equal(result.ok, false);
});

test('el pasajero puede cancelar antes de iniciar', () => {
  const result = canTransition({
    ride: ride('DRIVER_ARRIVED'),
    user: passenger,
    next: 'CANCELLED'
  });
  assert.equal(result.ok, true);
});

test('no se puede completar desde en camino', () => {
  const result = canTransition({
    ride: ride('DRIVER_EN_ROUTE'),
    user: driver,
    next: 'TRIP_COMPLETED'
  });
  assert.equal(result.ok, false);
});

test('el conductor puede completar el viaje iniciado', () => {
  const result = canTransition({
    ride: ride('TRIP_STARTED'),
    user: driver,
    next: 'TRIP_COMPLETED'
  });
  assert.equal(result.ok, true);
});

test('el administrador puede cancelar cualquier viaje activo', () => {
  const result = canTransition({
    ride: ride('TRIP_STARTED'),
    user: admin,
    next: 'CANCELLED'
  });
  assert.equal(result.ok, true);
});

test('un viaje completado no tiene transiciones', () => {
  assert.deepEqual(allowedNextStates(ride('COMPLETED'), driver), []);
});

test('el pasajero no puede confirmar su propio pago', () => {
  const result = canTransition({
    ride: ride('PAYMENT_PENDING'),
    user: passenger,
    next: 'COMPLETED'
  });
  assert.equal(result.ok, false);
});

test('el conductor confirma el pago pendiente', () => {
  const result = canTransition({
    ride: ride('PAYMENT_PENDING'),
    user: driver,
    next: 'COMPLETED'
  });
  assert.equal(result.ok, true);
});
