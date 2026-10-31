'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import RequireAuth, { FullScreenLoader } from '@/components/RequireAuth';
import api from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import type { AuditLog, LocalPlace } from '@/lib/types';

interface Fare {
  id: string;
  nombre: string;
  tipo: string;
  tarifaBase: number;
  precioPorKm: number;
  precioPorMinuto: number;
  tarifaMinima: number;
  multiplicadorNocturno: number;
  multiplicadorDemanda: number;
  activa: boolean;
}

interface Zone {
  id: string;
  nombre: string;
  tipo: string;
  multiplicador: number;
  activa: boolean;
}

interface ExchangeRate {
  rate: number;
  source: string;
  updatedAt: string | null;
}

const CONFIG_FIELDS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'TASA_CAMBIO_BS', label: 'Tasa Bs/USD', hint: '0 = automática desde la fuente oficial' },
  { key: 'DESCUENTO_TARIFA', label: 'Descuento %', hint: 'Sobre el bruto, 0–100' },
  { key: 'REDONDEO_TARIFA', label: 'Redondeo USD', hint: '0.01, 0.05 o 0.10' },
  { key: 'TIEMPO_VIGENCIA_COTIZACION', label: 'Vigencia cotización (min)', hint: 'Minutos' },
];

function AdminContent() {
  const [fares, setFares] = useState<Fare[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [places, setPlaces] = useState<LocalPlace[]>([]);
  const [placeForm, setPlaceForm] = useState({
    nombre: '',
    categoria: 'COMERCIO',
    direccion: '',
    lat: '',
    lng: '',
  });
  const [placeSaving, setPlaceSaving] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get<{ fares: Fare[] }>('/api/fares'),
      api.get<{ configuracion: Record<string, string> }>('/api/admin/config'),
      api.get<{ zonas: Zone[] }>('/api/admin/zones'),
      api
        .get<{ rate: ExchangeRate }>('/api/rates/current')
        .then((response) => response.data.rate)
        .catch(() => null),
      api
        .get<{ logs: AuditLog[] }>('/api/admin/audit')
        .then((response) => response.data.logs ?? [])
        .catch(() => []),
      api
        .get<{ places: LocalPlace[] }>('/api/admin/places')
        .then((response) => response.data.places ?? [])
        .catch(() => []),
    ])
      .then(([faresResponse, configResponse, zonesResponse, currentRate, logs, placesData]) => {
        if (!active) return;
        setFares(faresResponse.data.fares ?? []);
        setConfig(configResponse.data.configuracion ?? {});
        setZones(zonesResponse.data.zonas ?? []);
        setRate(currentRate);
        setAuditLogs(logs);
        setPlaces(placesData);
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(getApiErrorMessage(error, 'No se pudo cargar la administración'));
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateConfigField = (key: string, value: string) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const configs: Record<string, string> = {};
      for (const field of CONFIG_FIELDS) {
        configs[field.key] = config[field.key] ?? '0';
      }
      await api.put('/api/admin/config', { configs });
      toast.success('Configuración guardada');
      const rateResponse = await api
        .get<{ rate: ExchangeRate }>('/api/rates/current')
        .catch(() => null);
      if (rateResponse) setRate(rateResponse.data.rate);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo guardar la configuración'));
    } finally {
      setSavingConfig(false);
    }
  };

  const updateFareField = (fareId: string, field: keyof Fare, value: string) => {
    setFares((current) =>
      current.map((fare) =>
        fare.id === fareId
          ? { ...fare, [field]: field === 'activa' ? value === 'true' : Number(value) }
          : fare
      )
    );
  };

  const saveFare = async (fare: Fare) => {
    try {
      await api.put(`/api/fares/${fare.id}`, {
        tarifaBase: fare.tarifaBase,
        precioPorKm: fare.precioPorKm,
        precioPorMinuto: fare.precioPorMinuto,
        tarifaMinima: fare.tarifaMinima,
        multiplicadorNocturno: fare.multiplicadorNocturno,
        multiplicadorDemanda: fare.multiplicadorDemanda,
        activa: fare.activa,
      });
      toast.success(`Tarifa ${fare.tipo} actualizada`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar la tarifa'));
    }
  };

  const updateZoneMultiplier = (zoneId: string, value: string) => {
    setZones((current) =>
      current.map((zone) => (zone.id === zoneId ? { ...zone, multiplicador: Number(value) } : zone))
    );
  };

  const saveZone = async (zone: Zone) => {
    try {
      await api.put(`/api/admin/zones/${zone.id}`, { multiplicador: zone.multiplicador });
      toast.success(`Zona ${zone.nombre} actualizada`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar la zona'));
    }
  };

  const updatePlaceField = (field: keyof typeof placeForm, value: string) => {
    setPlaceForm((current) => ({ ...current, [field]: value }));
  };

  const createPlace = async (event: React.FormEvent) => {
    event.preventDefault();
    setPlaceSaving(true);
    try {
      const { data } = await api.post<{ place: LocalPlace }>('/api/admin/places', {
        nombre: placeForm.nombre,
        categoria: placeForm.categoria,
        direccion: placeForm.direccion,
        lat: Number(placeForm.lat),
        lng: Number(placeForm.lng),
      });
      setPlaces((current) => [data.place, ...current]);
      setPlaceForm({ nombre: '', categoria: 'COMERCIO', direccion: '', lat: '', lng: '' });
      toast.success('Lugar agregado');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo agregar el lugar'));
    } finally {
      setPlaceSaving(false);
    }
  };

  const togglePlace = async (place: LocalPlace) => {
    try {
      const { data } = await api.put<{ place: LocalPlace }>(
        `/api/admin/places/${place.id}`,
        { activo: !place.activo }
      );
      setPlaces((current) =>
        current.map((item) => (item.id === place.id ? data.place : item))
      );
      toast.success(data.place.activo ? 'Lugar activado' : 'Lugar desactivado');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar el lugar'));
    }
  };

  const deletePlace = async (place: LocalPlace) => {
    try {
      await api.delete(`/api/admin/places/${place.id}`);
      setPlaces((current) =>
        current.map((item) =>
          item.id === place.id ? { ...item, activo: false } : item
        )
      );
      toast.success('Lugar desactivado');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo desactivar el lugar'));
    }
  };

  if (loading) return <FullScreenLoader label="Cargando administración…" />;

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <main id="contenido" className="mx-auto max-w-6xl px-4 py-8">
        <span className="brutal-label">Administración</span>
        <h1 className="mt-3 text-3xl font-black leading-none tracking-tight md:text-4xl">
          Tarifas y reglas
        </h1>
        <p className="mt-2 text-sm font-medium text-muted">
          Los cambios se aplican a las próximas cotizaciones. No se recalculan viajes ya
          creados.
        </p>

        {rate && (
          <div className="mt-4 inline-flex flex-wrap items-center gap-2 border border-line bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide shadow-card">
            <span className="bg-ink px-2 py-1 text-white">Tasa activa</span>
            <span>{rate.rate} Bs/USD</span>
            <span className="text-muted">· {rate.source}</span>
            {rate.updatedAt && (
              <span className="text-muted">
                · {new Date(rate.updatedAt).toLocaleDateString('es-VE')}
              </span>
            )}
          </div>
        )}

        <section className="card mt-8 p-5" aria-labelledby="config-title">
          <span className="brutal-label">Reglas</span>
          <h2 id="config-title" className="mt-3 text-xl font-black">
            Configuración general
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONFIG_FIELDS.map((field) => (
              <div key={field.key}>
                <label htmlFor={field.key} className="field-label">
                  {field.label}
                </label>
                <input
                  id={field.key}
                  type="number"
                  step="0.01"
                  min="0"
                  value={config[field.key] ?? ''}
                  onChange={(event) => updateConfigField(field.key, event.target.value)}
                  className="input-field"
                />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  {field.hint}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={saveConfig}
            disabled={savingConfig}
            className="btn-primary mt-4"
          >
            {savingConfig ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </section>

        <section className="mt-8" aria-labelledby="fares-title">
          <span className="brutal-label">Tarifas</span>
          <h2 id="fares-title" className="mt-3 text-xl font-black">
            Tabla de tarifas
          </h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {fares.map((fare) => (
              <div key={fare.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase">{fare.tipo}</h3>
                  <span className="border border-line px-2 py-1 text-[10px] font-black uppercase">
                    {fare.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{fare.nombre}</p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      ['tarifaBase', 'Base'],
                      ['precioPorKm', 'Por km'],
                      ['precioPorMinuto', 'Por min'],
                      ['tarifaMinima', 'Mínima'],
                      ['multiplicadorNocturno', 'Nocturno'],
                      ['multiplicadorDemanda', 'Demanda'],
                    ] as Array<[keyof Fare, string]>
                  ).map(([field, label]) => (
                    <div key={String(field)}>
                      <label htmlFor={`${fare.id}-${String(field)}`} className="field-label">
                        {label}
                      </label>
                      <input
                        id={`${fare.id}-${String(field)}`}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={Number(fare[field])}
                        onBlur={(event) =>
                          updateFareField(fare.id, field, event.target.value)
                        }
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => saveFare(fare)}
                  className="btn-primary mt-3 w-full"
                >
                  Guardar tarifa
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="zones-title">
          <span className="brutal-label">Zonas</span>
          <h2 id="zones-title" className="mt-3 text-xl font-black">
            Multiplicadores por zona
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {zones.map((zone) => (
              <div key={zone.id} className="card p-4">
                <h3 className="text-sm font-black uppercase">{zone.nombre}</h3>
                <p className="text-xs text-muted">
                  {zone.tipo} · {zone.activa ? 'Activa' : 'Inactiva'}
                </p>

                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <label htmlFor={`${zone.id}-mult`} className="field-label">
                      Multiplicador
                    </label>
                    <input
                      id={`${zone.id}-mult`}
                      type="number"
                      step="0.01"
                      min="1"
                      defaultValue={zone.multiplicador}
                      onBlur={(event) => updateZoneMultiplier(zone.id, event.target.value)}
                      className="input-field"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => saveZone(zone)}
                    className="btn-secondary"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="places-title">
          <span className="brutal-label">Lugares</span>
          <h2 id="places-title" className="mt-3 text-xl font-black">
            Catálogo de Quíbor
          </h2>

          <form onSubmit={createPlace} className="card mt-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label htmlFor="place-nombre" className="field-label">
                  Nombre
                </label>
                <input
                  id="place-nombre"
                  type="text"
                  value={placeForm.nombre}
                  onChange={(event) => updatePlaceField('nombre', event.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label htmlFor="place-categoria" className="field-label">
                  Categoría
                </label>
                <input
                  id="place-categoria"
                  type="text"
                  value={placeForm.categoria}
                  onChange={(event) => updatePlaceField('categoria', event.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="place-direccion" className="field-label">
                  Dirección
                </label>
                <input
                  id="place-direccion"
                  type="text"
                  value={placeForm.direccion}
                  onChange={(event) => updatePlaceField('direccion', event.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="place-lat" className="field-label">
                    Lat
                  </label>
                  <input
                    id="place-lat"
                    type="number"
                    step="0.000001"
                    value={placeForm.lat}
                    onChange={(event) => updatePlaceField('lat', event.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="place-lng" className="field-label">
                    Lng
                  </label>
                  <input
                    id="place-lng"
                    type="number"
                    step="0.000001"
                    value={placeForm.lng}
                    onChange={(event) => updatePlaceField('lng', event.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={placeSaving} className="btn-primary mt-3">
              {placeSaving ? 'Guardando…' : 'Agregar lugar'}
            </button>
          </form>

          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto border border-line bg-white p-2">
            {places.length === 0 ? (
              <p className="p-3 text-sm text-muted">No hay lugares registrados.</p>
            ) : (
              places.map((place) => (
                <div
                  key={place.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-line p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase">
                      {place.nombre}
                      <span className="ml-2 border border-ink px-1 text-[9px] font-black uppercase">
                        {place.categoria}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted">{place.direccion}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      {place.lat}, {place.lng} · {place.activo ? 'Activo' : 'Inactivo'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => togglePlace(place)}
                      className="btn-secondary min-h-0 px-2 py-2 text-[10px]"
                    >
                      {place.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePlace(place)}
                      className="border border-line bg-ink px-2 py-2 text-[10px] font-black uppercase text-white hover:bg-ruta-500 hover:text-ink"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="audit-title">
          <span className="brutal-label">Auditoría</span>
          <h2 id="audit-title" className="mt-3 text-xl font-black">
            Cambios recientes
          </h2>

          {auditLogs.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Sin cambios registrados todavía.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {auditLogs.slice(0, 20).map((log) => (
                <li key={log.id} className="border border-line bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase">
                      {log.action} · {log.entity}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                      {new Date(log.createdAt).toLocaleString('es-VE')}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {log.actor
                      ? `${log.actor.nombre} ${log.actor.apellido} (${log.actor.rol})`
                      : 'Sistema'}
                  </p>
                  {log.after && (
                    <p className="mt-1 break-all text-[10px] text-muted">
                      {JSON.stringify(log.after)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>
      <AdminContent />
    </RequireAuth>
  );
}
