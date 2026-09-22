import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | EMITIA',
  description: 'Condiciones de uso del servicio EMITIA de facturación electrónica y gestión empresarial.',
};

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y Condiciones" updated="31 de mayo de 2026">
      <h2>1. Aceptación</h2>
      <p>
        Al registrarse o utilizar EMITIA, usted acepta estos términos. Si no está de acuerdo, no utilice
        el servicio.
      </p>

      <h2>2. Descripción del servicio</h2>
      <p>
        EMITIA es una plataforma en la nube de facturación electrónica integrada con ARCA/AFIP y
        herramientas de gestión empresarial (inventario, clientes, POS, reportes, entre otras).
        Algunas funciones pueden requerir delegación de servicios en ARCA y configuración fiscal previa.
      </p>

      <h2>3. Cuenta y responsabilidades</h2>
      <ul>
        <li>Usted es responsable de la veracidad de los datos fiscales y comerciales cargados.</li>
        <li>Debe custodiar sus credenciales de acceso y notificar usos no autorizados.</li>
        <li>Es responsable del cumplimiento de sus obligaciones tributarias ante AFIP/ARCA.</li>
      </ul>

      <h2>4. Planes y facturación</h2>
      <p>
        Los planes, precios y límites se informan en la web al momento de contratar. El plan gratuito
        incluye facturación electrónica con límites de usuarios y puntos de venta según lo publicado.
        Los planes pagos se facturan según la periodicidad acordada e incluyen IVA cuando corresponda.
      </p>

      <h2>5. Disponibilidad</h2>
      <p>
        Procuramos mantener el servicio disponible, pero pueden existir interrupciones por mantenimiento,
        fallas de terceros (incluido ARCA/AFIP) o fuerza mayor. No garantizamos disponibilidad ininterrumpida
        salvo acuerdo SLA específico en plan Empresa.
      </p>

      <h2>6. Propiedad intelectual</h2>
      <p>
        El software, diseño y marca EMITIA son propiedad de sus titulares. Usted conserva la propiedad
        de los datos comerciales y fiscales que carga en la plataforma.
      </p>

      <h2>7. Limitación de responsabilidad</h2>
      <p>
        EMITIA no se responsabiliza por errores derivados de datos incorrectos ingresados por el usuario,
        indisponibilidad de servicios de AFIP/ARCA, ni por decisiones impositivas tomadas sin asesoramiento
        profesional. Recomendamos validar configuraciones fiscales con su contador.
      </p>

      <h2>8. Cancelación</h2>
      <p>
        Puede cancelar su cuenta en cualquier momento contactando a soporte. La baja no exime de
        obligaciones fiscales sobre comprobantes ya emitidos. Exporte sus datos antes de solicitar
        la eliminación definitiva cuando la normativa lo permita.
      </p>

      <h2>9. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia será
        sometida a los tribunales competentes de la Ciudad Autónoma de Buenos Aires.
      </p>

      <h2>10. Contacto</h2>
      <p>
        <a href="mailto:soporte@emitia.com.ar">soporte@emitia.com.ar</a>
      </p>
    </LegalPage>
  );
}
