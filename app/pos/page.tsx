import { redirect } from 'next/navigation';

/** Redirige al PDV independiente (estilo Alegra) */
export default function PosRedirectPage() {
  redirect('/pdv');
}
