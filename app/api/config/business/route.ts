import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

// GET - Obtener configuración del negocio (datos de la empresa del usuario)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;

    // Si es superadmin y no tiene empresa, retornar config vacía
    if (userRole === 'superadmin' && !userCompanyId) {
      return NextResponse.json({
        id: null,
        businessName: 'Sistema ERP',
        legalName: 'Sistema de Gestión Empresarial',
        cuit: null,
        address: null,
        city: null,
        province: null,
        postalCode: null,
        phone: null,
        email: null,
        website: null,
        logo: null,
        currency: 'ARS',
        taxRate: 21,
        invoicePrefix: 'FAC',
        defaultPOS: 1,
        condicionIva: 'responsable_inscripto',
        iibb: null
      });
    }

    if (!userCompanyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: userCompanyId }
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Mapear campos de Company a formato de BusinessConfig para compatibilidad
    return NextResponse.json({
      id: company.id,
      businessName: company.name,
      legalName: company.legalName,
      cuit: company.cuit,
      address: company.address,
      city: company.city,
      province: company.province,
      postalCode: company.postalCode,
      phone: company.phone,
      email: company.email,
      website: company.website,
      logo: company.logo,
      currency: company.currency,
      taxRate: company.taxRate,
      invoicePrefix: company.invoicePrefix,
      defaultPOS: company.defaultPOS,
      condicionIva: company.condicionIva,
      iibb: company.iibb,
      inicioActividades: company.fechaInicioActividad ? company.fechaInicioActividad.toISOString().split('T')[0] : null,
      actividadPrincipal: company.actividadPrincipal,
      nextInvoiceNum: company.nextInvoiceNum,
      nextTicketNum: company.nextTicketNum,
      // Campos AFIP
      afipEnvironment: company.afipEnvironment,
      afipCertificate: company.afipCertificate ? '***configurado***' : null,
      afipPrivateKey: company.afipPrivateKey ? '***configurado***' : null
    });
  } catch (error) {
    console.error('Error fetching business config:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

// PUT - Actualizar configuración del negocio
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userCompanyId = (session.user as any)?.companyId;

    // Solo company_admin y superadmin pueden editar
    if (userRole !== 'company_admin' && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 });
    }

    if (!userCompanyId && userRole !== 'superadmin') {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 403 });
    }

    const body = await req.json();
    const {
      businessName,
      legalName,
      cuit,
      address,
      city,
      province,
      postalCode,
      phone,
      email,
      website,
      logo,
      currency,
      taxRate,
      invoicePrefix,
      defaultPOS,
      condicionIva,
      iibb,
      inicioActividades,
      actividadPrincipal,
      afipCertificate,
      afipPrivateKey,
      afipEnvironment,
      // Para superadmin que quiere editar otra empresa
      companyId
    } = body;

    const targetCompanyId = userRole === 'superadmin' && companyId ? companyId : userCompanyId;

    if (!targetCompanyId) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 });
    }

    // Construir objeto de actualización
    const updateData: any = {};
    if (businessName !== undefined) updateData.name = businessName;
    if (legalName !== undefined) updateData.legalName = legalName;
    if (cuit !== undefined) updateData.cuit = cuit;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (logo !== undefined) updateData.logo = logo;
    if (currency !== undefined) updateData.currency = currency;
    if (taxRate !== undefined) updateData.taxRate = parseFloat(taxRate);
    if (invoicePrefix !== undefined) updateData.invoicePrefix = invoicePrefix;
    if (defaultPOS !== undefined) updateData.defaultPOS = parseInt(defaultPOS);
    if (condicionIva !== undefined) updateData.condicionIva = condicionIva;
    if (iibb !== undefined) updateData.iibb = iibb;
    if (inicioActividades !== undefined) updateData.fechaInicioActividad = inicioActividades ? new Date(inicioActividades) : null;
    if (actividadPrincipal !== undefined) updateData.actividadPrincipal = actividadPrincipal;
    if (afipCertificate !== undefined) updateData.afipCertificate = afipCertificate;
    if (afipPrivateKey !== undefined) updateData.afipPrivateKey = afipPrivateKey;
    if (afipEnvironment !== undefined) updateData.afipEnvironment = afipEnvironment;

    const company = await prisma.company.update({
      where: { id: targetCompanyId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      config: {
        id: company.id,
        businessName: company.name,
        legalName: company.legalName,
        cuit: company.cuit,
        address: company.address,
        city: company.city,
        province: company.province,
        postalCode: company.postalCode,
        phone: company.phone,
        email: company.email,
        website: company.website,
        logo: company.logo,
        currency: company.currency,
        taxRate: company.taxRate,
        invoicePrefix: company.invoicePrefix,
        defaultPOS: company.defaultPOS,
        condicionIva: company.condicionIva,
        iibb: company.iibb,
        afipEnvironment: company.afipEnvironment
      }
    });
  } catch (error) {
    console.error('Error updating business config:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}
