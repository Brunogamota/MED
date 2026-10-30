import type { Metadata } from 'next';
import { MedConsole } from '@/components/previews/marketplace/opcao-4/med-console';
import { TopBar } from '@/components/previews/marketplace/opcao-4/top-bar';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Opção 4 · Suíço Amarelo — Marketplace Verificado',
  robots: { index: false, follow: false },
};

export default function Opcao4Page() {
  return (
    <>
      <TopBar />
      <main>
        <MedConsole />
      </main>
    </>
  );
}
