/**
 * WSAA - Web Service de Autenticación y Autorización de AFIP
 * Maneja la autenticación CMS/PKCS#7 contra AFIP
 */
import * as forge from 'node-forge';

const WSAA_URLS = {
  testing: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL',
  production: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
};

interface TicketAcceso {
  token: string;
  sign: string;
  expirationTime: string;
  generationTime: string;
}

// Cache de tickets para evitar autenticaciones repetidas
const ticketCache: Map<string, TicketAcceso> = new Map();

// Persistent file-based cache to survive server restarts
const fs = require('fs');
const path = require('path');
const CACHE_DIR = path.join(process.cwd(), '.afip-cache');

function loadCachedTicket(cacheKey: string): TicketAcceso | null {
  try {
    if (!fs.existsSync(CACHE_DIR)) return null;
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data as TicketAcceso;
  } catch {
    return null;
  }
}

function saveCachedTicket(cacheKey: string, ticket: TicketAcceso): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify(ticket), 'utf8');
  } catch (e) {
    console.warn('[WSAA] Error saving ticket to file cache:', e);
  }
}

/**
 * Genera el TRA (Ticket Request Access) XML
 */
function generateTRA(service: string): string {
  // AFIP requiere que generationTime y expirationTime estén en zona horaria Argentina (UTC-3)
  // y que la diferencia no supere las 24 horas
  const now = new Date();
  
  // Restar 10 minutos al generationTime para evitar problemas de sincronización de reloj
  const generationTime = new Date(now.getTime() - 10 * 60 * 1000);
  // Expiration: 12 horas (bien dentro del límite de 24h de AFIP)
  const expirationTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  
  // Formatear en ISO 8601 con timezone Argentina (-03:00)
  const formatDate = (d: Date) => {
    const offset = -3; // Argentina UTC-3
    const local = new Date(d.getTime() + offset * 60 * 60 * 1000);
    const iso = local.toISOString().replace('Z', '');
    // Remove milliseconds and add timezone
    return iso.replace(/\.\d{3}$/, '') + '-03:00';
  };
  
  const uniqueId = Math.floor(Date.now() / 1000);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${formatDate(generationTime)}</generationTime>
    <expirationTime>${formatDate(expirationTime)}</expirationTime>
  </header>
  <service>${service}</service>
</loginTicketRequest>`;
}

/**
 * Firma el TRA con CMS/PKCS#7 usando el certificado y clave privada
 */
function signTRA(traXml: string, certPem: string, keyPem: string): string {
  // Parse certificate and key
  const cert = forge.pki.certificateFromPem(certPem);
  const privateKey = forge.pki.privateKeyFromPem(keyPem);
  
  // Create PKCS#7 signed data
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, 'utf8');
  
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date() as any,
      },
    ],
  });
  
  p7.sign();
  
  // Convert to DER then Base64
  const asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(asn1);
  return forge.util.encode64(der.getBytes());
}

/**
 * Llama al WSAA para obtener el Ticket de Acceso
 */
async function callWSAA(cms: string, environment: 'testing' | 'production'): Promise<TicketAcceso> {
  const soap = require('soap');
  const xml2js = require('xml2js');
  
  const wsdlUrl = WSAA_URLS[environment];
  
  const client = await soap.createClientAsync(wsdlUrl, {
    wsdl_options: { timeout: 30000 },
  });
  
  const [result] = await client.loginCmsAsync({ in0: cms });
  
  // Parse the response XML
  const loginTicketResponse = result.loginCmsReturn;
  
  const parser = new xml2js.Parser({ explicitArray: false });
  const parsed = await parser.parseStringPromise(loginTicketResponse);
  
  const credentials = parsed.loginTicketResponse.credentials;
  const header = parsed.loginTicketResponse.header;
  
  return {
    token: credentials.token,
    sign: credentials.sign,
    expirationTime: header.expirationTime,
    generationTime: header.generationTime,
  };
}

/**
 * Obtiene un Ticket de Acceso para el servicio especificado
 * Usa cache para evitar autenticaciones innecesarias
 */
export async function getTicketAcceso(
  service: string,
  certPem: string,
  keyPem: string,
  environment: 'testing' | 'production' = 'testing'
): Promise<TicketAcceso> {
  const cacheKey = `${service}_${environment}`;
  
  // Check memory cache first
  const cached = ticketCache.get(cacheKey);
  if (cached) {
    const expiration = new Date(cached.expirationTime);
    const now = new Date();
    if (expiration.getTime() - now.getTime() > 5 * 60 * 1000) {
      console.log(`[WSAA] Usando ticket de memoria para ${service}`);
      return cached;
    }
  }
  
  // Check file-based persistent cache (survives server restarts)
  const fileCached = loadCachedTicket(cacheKey);
  if (fileCached) {
    const expiration = new Date(fileCached.expirationTime);
    const now = new Date();
    if (expiration.getTime() - now.getTime() > 5 * 60 * 1000) {
      console.log(`[WSAA] Usando ticket de archivo para ${service}`);
      ticketCache.set(cacheKey, fileCached);
      return fileCached;
    }
  }
  
  console.log(`[WSAA] Solicitando nuevo ticket para ${service} en ${environment}`);
  
  // Generate TRA
  const tra = generateTRA(service);
  console.log(`[WSAA] TRA generado para servicio: ${service}`);
  
  // Sign with CMS
  const cms = signTRA(tra, certPem, keyPem);
  console.log(`[WSAA] TRA firmado con CMS/PKCS#7`);
  
  try {
    // Call WSAA
    const ticket = await callWSAA(cms, environment);
    console.log(`[WSAA] Ticket obtenido. Expira: ${ticket.expirationTime}`);
    
    // Cache in memory and file
    ticketCache.set(cacheKey, ticket);
    saveCachedTicket(cacheKey, ticket);
    
    return ticket;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    
    // Handle "already authenticated" error from AFIP
    if (errorMsg.includes('alreadyAuthenticated') || errorMsg.includes('ya posee un TA')) {
      console.warn(`[WSAA] AFIP dice que ya hay un TA válido. Verificando cache de archivo...`);
      
      // If we have a file-cached ticket (even if close to expiry), use it
      if (fileCached) {
        console.log(`[WSAA] Reutilizando ticket de archivo (puede estar cerca de expirar)`);
        ticketCache.set(cacheKey, fileCached);
        return fileCached;
      }
      
      // No cached ticket available - tell user to wait
      throw new Error(
        'AFIP indica que ya existe un Ticket de Acceso válido pero no se encontró en cache. ' +
        'Esto puede pasar al reiniciar el servidor. Esperá unos minutos e intentá nuevamente.'
      );
    }
    
    throw error;
  };
}

/**
 * Limpia el cache de tickets
 */
export function clearTicketCache(): void {
  ticketCache.clear();
}

/**
 * Obtiene las credenciales AFIP desde variables de entorno
 */
export function getAFIPCredentials(): { certPem: string; keyPem: string; cuit: string; environment: 'testing' | 'production' } {
  const certB64 = process.env.AFIP_CERT;
  const keyB64 = process.env.AFIP_KEY;
  const cuit = process.env.AFIP_CUIT;
  const environment = (process.env.AFIP_ENVIRONMENT || 'testing') as 'testing' | 'production';
  
  if (!certB64 || !keyB64 || !cuit) {
    throw new Error('Credenciales AFIP no configuradas. Configure AFIP_CERT, AFIP_KEY y AFIP_CUIT en .env');
  }
  
  const certPem = Buffer.from(certB64, 'base64').toString('utf-8');
  const keyPem = Buffer.from(keyB64, 'base64').toString('utf-8');
  
  return { certPem, keyPem, cuit, environment };
}
