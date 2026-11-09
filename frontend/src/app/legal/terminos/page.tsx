export const metadata = { title: 'Términos y condiciones · RUTA RIDES' };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-2xl font-black tracking-tight">Términos y condiciones</h1>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
        Última actualización: noviembre 2026
      </p>

      <h2 className="mt-6 text-lg font-black">1. Qué es RUTA RIDES</h2>
      <p>
        RUTA RIDES es una plataforma tecnológica que conecta pasajeros con
        conductores independientes en Venezuela. No presta el servicio de
        transporte: lo intermedia.
      </p>

      <h2 className="mt-5 text-lg font-black">2. Cuenta y requisitos</h2>
      <p>
        Debes ser mayor de edad y dar datos reales. El conductor debe tener
        licencia vigente, vehículo en condiciones y documentación aprobada. Una
        cuenta puede suspenderse por fraude, suplantación o documentos falsos.
      </p>

      <h2 className="mt-5 text-lg font-black">3. Tarifas y comisión</h2>
      <p>
        El precio se calcula en el servidor según distancia, tiempo, vehículo,
        horario y modalidad. RUTA RIDES retiene una comisión del 25 % sobre cada
        viaje. En pagos en efectivo o pago móvil directo al conductor, la
        comisión se descuenta del saldo del conductor.
      </p>

      <h2 className="mt-5 text-lg font-black">4. Billetera y retiros</h2>
      <p>
        Las recargas se acreditan tras verificar el pago móvil. Los retiros son
        semanales, con mínimo de $5 y sujetos a revisión. El saldo no genera
        intereses y no es transferible entre cuentas.
      </p>

      <h2 className="mt-5 text-lg font-black">5. Viajes y cancelaciones</h2>
      <p>
        El pasajero debe estar en el punto indicado. Cancelaciones reiteradas o
        ausencias pueden generar cargos o suspensión. El conductor debe respetar
        la ruta y el trato digno al pasajero.
      </p>

      <h2 className="mt-5 text-lg font-black">6. Seguridad y ubicación</h2>
      <p>
        La app comparte ubicación durante el viaje para seguimiento y seguridad.
        En emergencias contacta a las autoridades locales. RUTA RIDES no
        sustituye servicios de emergencia.
      </p>

      <h2 className="mt-5 text-lg font-black">7. Responsabilidad</h2>
      <p>
        RUTA RIDES no responde por daños derivados del servicio de transporte,
        salvo lo exigido por la ley. El conductor responde por su vehículo,
        licencia y seguro.
      </p>

      <h2 className="mt-5 text-lg font-black">8. Cambios y contacto</h2>
      <p>
        Podemos actualizar estos términos y avisaremos en la app. Dudas:
        soporte@rutarides.com.
      </p>

      <p className="mt-6 rounded-xl bg-fog p-3 text-xs text-muted">
        Este documento es una base operativa y debe ser revisado por un abogado
        venezolano antes de su publicación definitiva.
      </p>
    </>
  );
}
