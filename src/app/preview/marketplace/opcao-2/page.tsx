import { Console } from '@/components/previews/marketplace/opcao-2/console';
import { Sidebar } from '@/components/previews/marketplace/opcao-2/sidebar';

export const dynamic = 'force-static';

export default function OpcaoDoisPage() {
  return (
    <div className="lg:flex">
      <Sidebar ativo="contestacoes" />
      <Console />
    </div>
  );
}
