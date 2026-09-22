import { getPersonaFallback } from '../lib/afip/ws-padron';

const cuit = process.argv[2] || '20401546228';

getPersonaFallback(cuit)
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
  })
  .catch((e) => {
    console.error('LOOKUP_ERROR', e.message);
    process.exit(1);
  });
