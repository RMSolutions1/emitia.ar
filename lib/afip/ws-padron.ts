/**
 * WS_SR_PADRON_A13 - Web Service de Consulta de Padrón AFIP (Alcance 13)
 * Permite consultar datos de contribuyentes por CUIT
 * Incluye datos de quiebras y APOC además de los datos estándar
 */
import { getTicketAcceso, getAFIPCredentials } from './wsaa';

const WS_PADRON_URLS = {
  testing: 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA13?WSDL',
  production: 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA13?WSDL',
};

export interface AFIPPersonaData {
  idPersona: number;
  tipoPersona: string; // 'FISICA' | 'JURIDICA'
  tipoClave: string;
  estadoClave: string;
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  domicilioFiscal?: {
    direccion?: string;
    localidad?: string;
    codPostal?: string;
    idProvincia?: number;
    descripcionProvincia?: string;
    tipoDomicilio?: string;
  };
  impuestos?: number[];
  actividades?: Array<{
    idActividad: number;
    descripcionActividad: string;
    periodo: number;
  }>;
}

const PROVINCIAS_MAP: Record<number, string> = {
  0: 'Ciudad Autónoma de Buenos Aires',
  1: 'Buenos Aires',
  2: 'Catamarca',
  3: 'Córdoba',
  4: 'Corrientes',
  5: 'Entre Ríos',
  6: 'Jujuy',
  7: 'Mendoza',
  8: 'La Rioja',
  9: 'Salta',
  10: 'San Juan',
  11: 'San Luis',
  12: 'Santa Fe',
  13: 'Santiago del Estero',
  14: 'Tucumán',
  16: 'Chaco',
  17: 'Chubut',
  18: 'Formosa',
  19: 'Misiones',
  20: 'Neuquén',
  21: 'La Pampa',
  22: 'Río Negro',
  23: 'Santa Cruz',
  24: 'Tierra del Fuego',
};

/**
 * Consulta datos de un contribuyente por CUIT usando ws_sr_padron_a13
 */
/**
 * @param companyCuit - CUIT de la empresa que consulta (modelo delegación).
 *                      Si no se pasa, usa AFIP_CUIT del certificado.
 */
export async function getPersona(cuitConsulta: string, companyCuit?: string): Promise<AFIPPersonaData | null> {
  try {
    const { certPem, keyPem, cuit, environment } = getAFIPCredentials();
    
    // Get WSAA ticket for ws_sr_padron_a13
    const ticket = await getTicketAcceso('ws_sr_padron_a13', certPem, keyPem, environment);
    
    const soap = require('soap');
    const wsdlUrl = WS_PADRON_URLS[environment];
    
    // En modelo delegación: companyCuit es el CUIT del cliente que delegó,
    // se usa como cuitRepresentada
    const representadaCuit = companyCuit || cuit;
    
    console.log(`[WS_PADRON_A13] Consultando CUIT ${cuitConsulta} representando ${representadaCuit} en ${environment}`);
    
    const client = await soap.createClientAsync(wsdlUrl, {
      wsdl_options: { timeout: 15000 },
    });
    
    // Call getPersona method (A13 uses getPersona, not getPersona_v2)
    const args = {
      token: ticket.token,
      sign: ticket.sign,
      cuitRepresentada: parseInt(representadaCuit),
      idPersona: parseInt(cuitConsulta),
    };
    
    const [result] = await client.getPersonaAsync(args);
    
    if (!result || !result.personaReturn) {
      console.log(`[WS_PADRON_A13] No se encontró persona para CUIT ${cuitConsulta}`);
      return null;
    }
    
    const personaReturn = result.personaReturn;
    // A13 response structure: personaReturn.persona contains datosGenerales
    const persona = personaReturn.persona || personaReturn;
    const datosGenerales = persona.datosGenerales;
    
    if (!datosGenerales) {
      console.log(`[WS_PADRON_A13] Sin datosGenerales para CUIT ${cuitConsulta}`);
      return null;
    }
    
    // Extract domicilio fiscal
    // A13 may return domicilio as array or single object
    let domicilioFiscal: AFIPPersonaData['domicilioFiscal'] = undefined;
    const domicilios = datosGenerales.domicilio || datosGenerales.domicilioFiscal;
    if (domicilios) {
      // A13 returns domicilio as array, find FISCAL type
      const domList = Array.isArray(domicilios) ? domicilios : [domicilios];
      const domFiscal = domList.find((d: any) => d.tipoDomicilio === 'FISCAL') || domList[0];
      if (domFiscal) {
        const provId = parseInt(domFiscal.idProvincia || '0');
        domicilioFiscal = {
          direccion: domFiscal.direccion || domFiscal.calle || '',
          localidad: domFiscal.localidad || domFiscal.descripcionProvincia || '',
          codPostal: domFiscal.codPostal || '',
          idProvincia: provId,
          descripcionProvincia: domFiscal.descripcionProvincia || PROVINCIAS_MAP[provId] || '',
          tipoDomicilio: domFiscal.tipoDomicilio || 'FISCAL',
        };
      }
    }
    
    // Extract impuestos (tax registrations)
    let impuestos: number[] = [];
    const datosRegimenGeneral = persona.datosRegimenGeneral;
    const datosMonotributo = persona.datosMonotributo;
    
    if (datosRegimenGeneral?.impuesto) {
      const impList = Array.isArray(datosRegimenGeneral.impuesto) 
        ? datosRegimenGeneral.impuesto 
        : [datosRegimenGeneral.impuesto];
      impuestos = impList.map((imp: any) => parseInt(imp.idImpuesto || imp)).filter((n: number) => !isNaN(n));
    }
    
    if (datosMonotributo) {
      impuestos.push(20); // Monotributo
    }
    
    // Extract actividades
    let actividades: AFIPPersonaData['actividades'] = [];
    if (datosRegimenGeneral?.actividad) {
      const actList = Array.isArray(datosRegimenGeneral.actividad) 
        ? datosRegimenGeneral.actividad 
        : [datosRegimenGeneral.actividad];
      actividades = actList.map((act: any) => ({
        idActividad: parseInt(act.idActividad || '0'),
        descripcionActividad: act.descripcionActividad || '',
        periodo: parseInt(act.periodo || '0'),
      }));
    }
    
    // Build result
    const personaData: AFIPPersonaData = {
      idPersona: parseInt(cuitConsulta),
      tipoPersona: datosGenerales.tipoPersona || 'FISICA',
      tipoClave: datosGenerales.tipoClave || 'CUIT',
      estadoClave: datosGenerales.estadoClave || 'ACTIVO',
      domicilioFiscal,
      impuestos,
      actividades,
    };
    
    // Set name based on person type
    if (datosGenerales.tipoPersona === 'JURIDICA') {
      personaData.razonSocial = datosGenerales.razonSocial || '';
    } else {
      personaData.nombre = datosGenerales.nombre || '';
      personaData.apellido = datosGenerales.apellido || '';
      personaData.razonSocial = datosGenerales.razonSocial || '';
    }
    
    console.log(`[WS_PADRON_A13] Persona encontrada: ${personaData.razonSocial || personaData.apellido + ' ' + personaData.nombre} (${personaData.tipoPersona})`);
    
    return personaData;
    
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.error(`[WS_PADRON_A13] Error consultando CUIT ${cuitConsulta}:`, errMsg);
    
    // Handle common errors
    if (errMsg.includes('No existe persona') || errMsg.includes('not found')) {
      return null;
    }
    
    throw error;
  }
}

/**
 * Determine tax condition from AFIP impuestos array (with fallbacks by persona type / CUIT)
 */
export function determineTaxCondition(
  impuestos?: number[],
  tipoPersona?: string,
  cuit?: string,
): string {
  if (impuestos && impuestos.length > 0) {
    if (impuestos.includes(30)) return 'responsable_inscripto'; // IVA
    if (impuestos.includes(32)) return 'exento'; // IVA Exento
    if (impuestos.includes(20)) return 'monotributista'; // Monotributo
  }

  if (tipoPersona === 'JURIDICA') return 'responsable_inscripto';

  const prefix = (cuit || '').replace(/\D/g, '').substring(0, 2);
  if (['30', '33', '34'].includes(prefix)) return 'responsable_inscripto';

  return 'consumidor_final';
}

/**
 * Build display name from AFIP persona data
 */
export function buildPersonaName(persona: AFIPPersonaData): string {
  if (persona.tipoPersona === 'JURIDICA') {
    return persona.razonSocial || `CUIT ${persona.idPersona}`;
  }
  const parts = [persona.apellido, persona.nombre].filter(Boolean);
  return parts.join(' ') || persona.razonSocial || `CUIT ${persona.idPersona}`;
}

/**
 * Fallback: Scrape cuitonline.com for basic CUIT data
 * Used when AFIP SOAP services are not authorized
 */
export async function getPersonaFallback(cuitConsulta: string): Promise<AFIPPersonaData | null> {
  try {
    console.log(`[WS_PADRON] Fallback: consultando cuitonline.com para CUIT ${cuitConsulta}`);
    
    const res = await fetch(
      `https://www.cuitonline.com/search.php?q=${cuitConsulta}`,
      {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; EMITIA-ERP/1.0)',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) return null;
    let html = await res.text();
    
    // Normalize HTML entities for easier regex matching
    html = html.replace(/&nbsp;/g, ' ').replace(/&#8226;/g, '•');

    // Extract denomination/name from h2.denominacion
    const nameMatch = html.match(/<h2[^>]*class="denominacion"[^>]*>([^<]+)<\/h2>/i);
    if (!nameMatch) return null;
    const rawName = nameMatch[1].trim();

    // Detect persona type
    const isJuridica = /Persona\s+Jur[ií]dica/i.test(html);
    const tipoPersona = isJuridica ? 'JURIDICA' : 'FISICA';

    // Detect IVA condition from the doc-facets section
    let impuestos: number[] = [];
    if (/IVA:\s*Iva\s+Inscripto/i.test(html) || /IVA:\s*IVA\s+Responsable\s+Inscripto/i.test(html) || /IVA:\s*Responsable\s+Inscripto/i.test(html)) {
      impuestos.push(30); // IVA Responsable Inscripto
    }
    if (/IVA:\s*Iva\s+Exento/i.test(html) || /IVA:\s*Exento/i.test(html)) {
      impuestos.push(32); // IVA Exento
    }
    if (/Monotributo/i.test(html) && !impuestos.includes(30)) {
      impuestos.push(20); // Monotributo (only if not already RI)
    }
    if (/Ganancias/i.test(html)) {
      impuestos.push(10); // Ganancias
    }
    if (/Empleador/i.test(html)) {
      impuestos.push(301); // Empleador
    }

    const persona: AFIPPersonaData = {
      idPersona: parseInt(cuitConsulta),
      tipoPersona,
      tipoClave: 'CUIT',
      estadoClave: 'ACTIVO',
      impuestos,
    };

    if (isJuridica) {
      persona.razonSocial = rawName;
    } else {
      // Try to split name: "APELLIDO NOMBRE" format
      const parts = rawName.split(' ');
      if (parts.length >= 2) {
        persona.apellido = parts[0];
        persona.nombre = parts.slice(1).join(' ');
      } else {
        persona.razonSocial = rawName;
      }
    }

    // Fetch detail page for domicilio fiscal (localidad/provincia)
    const detailMatch = html.match(/\/?detalle\/(\d+\/[^")\s]+\.html)/i);
    if (detailMatch) {
      try {
        const detailRes = await fetch(
          `https://www.cuitonline.com/detalle/${detailMatch[1]}`,
          {
            headers: {
              Accept: 'text/html',
              'User-Agent': 'Mozilla/5.0 (compatible; EMITIA-ERP/1.0)',
            },
            signal: AbortSignal.timeout(10000),
          },
        );
        if (detailRes.ok) {
          const detailHtml = (await detailRes.text()).replace(/&nbsp;/g, ' ');
          const titleMatch = detailHtml.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) {
            const locMatch = titleMatch[1].match(/,\s*([^,(]+)\s*\(([^)]+)\)\s*-/);
            if (locMatch) {
              persona.domicilioFiscal = {
                localidad: locMatch[1].trim(),
                descripcionProvincia: locMatch[2].trim(),
              };
            }
          }
          const domMatch =
            detailHtml.match(/Domicilio[^:]*:\s*<\/[^>]+>\s*([^<]+)/i) ||
            detailHtml.match(/Domicilio fiscal[^<]*<[^>]+>([^<]+)/i);
          if (domMatch?.[1]?.trim()) {
            persona.domicilioFiscal = {
              ...persona.domicilioFiscal,
              direccion: domMatch[1].trim(),
            };
          }
        }
      } catch (detailErr: any) {
        console.log('[WS_PADRON] Detail page:', (detailErr?.message || '').substring(0, 80));
      }
    }

    console.log(`[WS_PADRON] Fallback encontró: ${rawName} (${tipoPersona})`);
    return persona;

  } catch (error: any) {
    console.error(`[WS_PADRON] Fallback error:`, error.message);
    return null;
  }
}

export { PROVINCIAS_MAP };
