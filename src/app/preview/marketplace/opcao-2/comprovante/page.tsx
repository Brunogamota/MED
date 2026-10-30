import type { Metadata } from 'next';
import { Comprovante } from '@/components/previews/marketplace/opcao-2/comprovante';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Comprovante de envio · Opção 2 · Marketplace Verificado',
};

export default function OpcaoDoisComprovantePage() {
  return <Comprovante />;
}
