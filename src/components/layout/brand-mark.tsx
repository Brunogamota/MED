import Image from 'next/image';

import { cn } from '@/lib/cn';

/**
 * A marca do produto.
 *
 * Os arquivos sao JPEG, que nao tem transparencia: cada um traz o proprio
 * fundo. Por isso a marca e apresentada como um bloco arredondado — que e o
 * que o arquivo de fato e — em vez de um simbolo solto tentando se fundir com
 * a superficie atras, o que deixaria um quadrado visivel de cor errada.
 *
 * O par claro/escuro e resolvido em CSS, com as duas imagens no HTML e uma
 * escondida pela variante `dark:`. Ler o tema em JavaScript exigiria saber no
 * servidor algo que so o navegador sabe, e a hidratacao quebraria.
 */
export function BrandMark({
  size = 32,
  className,
}: {
  /** Lado do bloco, em pixels. */
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn('relative block shrink-0 overflow-hidden rounded-xl', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-light.jpg"
        alt="MED Defense"
        fill
        sizes={`${size}px`}
        className="object-cover dark:hidden"
        priority
      />
      <Image
        src="/logo-dark.jpg"
        alt=""
        aria-hidden
        fill
        sizes={`${size}px`}
        className="hidden object-cover dark:block"
        priority
      />
    </span>
  );
}

/**
 * A marca sobre superficie sempre escura — trilho e painel do console, que sao
 * pretos nos dois temas. Aqui o par claro/escuro nao se aplica: e sempre o
 * arquivo de fundo escuro.
 */
export function BrandMarkOnDark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('relative block shrink-0 overflow-hidden rounded-xl', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo-dark.jpg"
        alt="MED Defense"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </span>
  );
}
