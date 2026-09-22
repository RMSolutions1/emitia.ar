import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Política de Privacidad | EMITIA',
  description: 'Cómo EMITIA recopila, usa y protege tus datos personales y fiscales.',
};

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de Privacidad" updated="31 de mayo de 2026">
      <h2>1. Responsable</h2>
      <p>
        EMITIA (CUIT 20-40154622-8), con domicilio en Buenos Aires, Argentina, es responsable del
        tratamiento de los datos personales que usted proporciona al utilizar la plataforma.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, email, teléfono y credenciales de acceso.</li>
        <li>Datos fiscales y comerciales: CUIT, razón social, domicilio, condición frente al IVA.</li>
        <li>Datos operativos: clientes, productos, ventas, facturas, movimientos de stock y tesorería.</li>
        <li>Datos técnicos: dirección IP, navegador, registros de acceso y cookies de sesión.</li>
      </ul>

      <h2>3. Finalidad del tratamiento</h2>
      <p>Utilizamos sus datos para:</p>
      <ul>
        <li>Prestar el servicio de facturación electrónica e integración con ARCA/AFIP.</li>
        <li>Gestionar inventario, ventas, reportes y funciones del ERP.</li>
        <li>Brindar soporte, seguridad, auditoría y cumplimiento legal.</li>
        <li>Enviar comunicaciones operativas relacionadas con su cuenta.</li>
      </ul>

      <h2>4. Datos fiscales y ARCA</h2>
      <p>
        Los comprobantes electrónicos se transmiten a los WebServices de AFIP/ARCA según la normativa
        vigente. Los certificados digitales y claves sensibles se almacenan cifrados (AES-256).
        Usted es titular de la información fiscal de su empresa; EMITIA actúa como proveedor tecnológico.
      </p>

      <h2>5. Conservación y seguridad</h2>
      <p>
        Aplicamos cifrado en tránsito (HTTPS/TLS), control de acceso por roles, respaldos periódicos
        y aislamiento de datos entre empresas (multi-tenant). Conservamos los datos mientras mantenga
        una cuenta activa y el plazo adicional exigido por normativa fiscal o comercial aplicable.
      </p>

      <h2>6. Cesión a terceros</h2>
      <p>
        Podemos compartir datos con proveedores de infraestructura, procesamiento de pagos (MercadoPago)
        y servicios de IA cuando usted utilice esas funciones, siempre bajo acuerdos de confidencialidad.
        No vendemos datos personales.
      </p>

      <h2>7. Sus derechos</h2>
      <p>
        Puede solicitar acceso, rectificación, actualización o eliminación de sus datos escribiendo a{' '}
        <a href="mailto:soporte@emitia.com.ar">soporte@emitia.com.ar</a>, sujeto a obligaciones legales
        de conservación de comprobantes fiscales.
      </p>

      <h2>8. Contacto</h2>
      <p>
        Consultas sobre privacidad: <a href="mailto:soporte@emitia.com.ar">soporte@emitia.com.ar</a>
      </p>
    </LegalPage>
  );
}
