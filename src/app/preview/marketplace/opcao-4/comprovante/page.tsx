import type { Metadata } from 'next';
import { Comprovante } from '@/components/previews/marketplace/opcao-4/comprovante';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Comprovante de envio · Opção 4',
  robots: { index: false, follow: false },
};

export default function Opcao4ComprovantePage() {
  return <Comprovante />;
}
