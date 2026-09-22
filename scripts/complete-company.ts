/**
 * Completa datos fiscales y comerciales de GRUPO EMPRENOR en producción.
 * Fuentes: CUIT AFIP 20-40154622-8, landing EMITIA, verificación WSFE previa.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cuit = '20401546228';

  const data = {
    // Nombre comercial / marca
    name: 'GRUPO EMPRENOR',
    // Razón social registrada en AFIP (titular del CUIT)
    legalName: 'GUERRERO SILVIO CARLOS FABIAN',
    cuit,
    condicionIva: 'responsable_inscripto',
    // IIBB: mismo CUIT cuando está inscripto en Convenio Multilateral (CM)
    iibb: '20401546228',
    actividadPrincipal: 'Servicios de gestión empresarial y consultoría',
    // Transición de Monotributo a RI: PV monotributo dados de baja el 12/11/2025 (AFIP WSFE)
    fechaInicioActividad: new Date('2025-11-12'),
    address: 'Vespucio',
    city: 'Salta',
    province: 'Salta',
    postalCode: '4400',
    phone: '+54 9 11 2758-6521',
    email: 'admin@emitia.com.ar',
    website: 'https://www.emitia.com.ar',
    currency: 'ARS',
    taxRate: 21,
    invoicePrefix: 'FAC',
    defaultPOS: 6,
    afipEnvironment: 'production',
    plan: 'empresa',
    status: 'active',
    maxUsers: 10,
    maxPOS: 5,
    paymentStatus: 'paid',
  };

  const company = await prisma.company.update({
    where: { cuit },
    data,
  });

  console.log('COMPANY_UPDATED', JSON.stringify({
    id: company.id,
    name: company.name,
    legalName: company.legalName,
    cuit: company.cuit,
    condicionIva: company.condicionIva,
    iibb: company.iibb,
    fechaInicioActividad: company.fechaInicioActividad?.toISOString().split('T')[0],
    city: company.city,
    province: company.province,
    phone: company.phone,
    email: company.email,
    website: company.website,
    defaultPOS: company.defaultPOS,
  }));
}

main()
  .catch((e) => {
    console.error('COMPLETE_COMPANY_ERROR', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
