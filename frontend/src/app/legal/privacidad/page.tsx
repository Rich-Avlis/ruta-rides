export const metadata = { title: 'Política de privacidad · RUTA RIDES' };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-2xl font-black tracking-tight">Política de privacidad</h1>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
        Última actualización: noviembre 2026
      </p>

      <h2 className="mt-6 text-lg font-black">1. Datos que recopilamos</h2>
      <p>
        Nombre, apellido, teléfono, correo, documentos del conductor, vehículo,
        foto de perfil, ubicación durante el viaje, historial de viajes, pagos y
        calificaciones.
      </p>

      <h2 className="mt-5 text-lg font-black">2. Para qué los usamos</h2>
      <p>
        Crear y verificar cuentas, calcular tarifas, asignar viajes, procesar
        pagos, prevenir fraude, dar soporte y cumplir obligaciones legales.
      </p>

      <h2 className="mt-5 text-lg font-black">3. Ubicación</h2>
      <p>
        La ubicación se usa para mostrar el mapa, calcular distancia y tiempo, y
        permitir el seguimiento del viaje. El conductor comparte ubicación solo
        mientras está en línea.
      </p>

      <h2 className="mt-5 text-lg font-black">4. Con quién se comparte</h2>
      <p>
        Con el conductor o pasajero del viaje, con proveedores de mapas y pagos
        necesarios para operar, y con autoridades cuando la ley lo exija. No
        vendemos datos personales.
      </p>

      <h2 className="mt-5 text-lg font-black">5. Conservación y seguridad</h2>
      <p>
        Conservamos los datos mientras la cuenta esté activa y por los plazos
        legales. Usamos conexiones cifradas, control de acceso y registros de
        auditoría. Ningún sistema es 100 % infalible.
      </p>

      <h2 className="mt-5 text-lg font-black">6. Tus derechos</h2>
      <p>
        Puedes solicitar acceso, corrección o eliminación de tus datos
        escribiendo a soporte@rutarides.com. Algunos datos deben conservarse por
        obligaciones legales o contables.
      </p>

      <h2 className="mt-5 text-lg font-black">7. Menores</h2>
      <p>
        La plataforma no está dirigida a menores de edad. Si detectamos una
        cuenta de menor, será suspendida.
      </p>

      <h2 className="mt-5 text-lg font-black">8. Cambios</h2>
      <p>
        Notificaremos cambios importantes en la app. El uso continuo implica
        aceptación de la versión vigente.
      </p>

      <p className="mt-6 rounded-xl bg-fog p-3 text-xs text-muted">
        Documento base. Debe revisarse con un abogado y adaptarse a la Ley de
        Protección de Datos Personales de Venezuela antes de publicarse.
      </p>
    </>
  );
}
