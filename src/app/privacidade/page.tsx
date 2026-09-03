import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_CONFIG } from '@/config/app';
import { LEGAL_CONFIG } from '@/config/legal';
import { BrandMark } from '@/components/layout/brand-mark';
import { GMAIL_SCOPE } from '@/infra/adapters/gmail';

export const metadata: Metadata = {
  title: `Política de Privacidade — ${APP_CONFIG.name}`,
  description: 'Quais dados o MED Defense trata, para quê, por quanto tempo e com quem.',
};

/**
 * Política de Privacidade — página pública.
 *
 * Existe por duas razões, nesta ordem: a LGPD, e a exigência do Google para
 * publicar um app OAuth fora do modo de testes (a URL é pedida no Branding do
 * Google Auth Platform e precisa abrir **sem login** — por isso `/privacidade`
 * está na lista de rotas livres do middleware).
 *
 * O texto descreve o sistema como ele é, campo a campo, e não um modelo
 * genérico. O mesmo princípio que vale para a defesa vale aqui: nada de
 * afirmação sem lastro — o CNPJ, por exemplo, só aparece quando alguém informa
 * o verdadeiro em `config/legal.ts`.
 */

/** Data em que este texto foi escrito. Trocar ao alterar o conteúdo. */
const UPDATED_AT = '3 de setembro de 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 font-semibold text-foreground text-lg">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
  const { controllerName, controllerDocument, contactName, contactEmail } = LEGAL_CONFIG;

  return (
    <main className="mx-auto max-w-[75ch] px-6 py-12 text-foreground">
      <Link href="/" className="inline-block">
        <BrandMark />
      </Link>

      <h1 className="mt-8 font-semibold text-3xl tracking-tight">Política de Privacidade</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Última atualização: {UPDATED_AT}. Aplica-se ao {APP_CONFIG.name}, plataforma de automação
        de defesa de MED (Mecanismo Especial de Devolução do Pix).
      </p>

      <div className="mt-4 text-[15px] leading-relaxed">
        <Section title="1. Quem trata os dados">
          <p>
            O {APP_CONFIG.name} é operado por <strong>{controllerName}</strong>
            {controllerDocument ? `, CNPJ ${controllerDocument}` : null}, adiante “nós”.
          </p>
          <p>
            A plataforma é usada por lojistas para responder a contestações de Pix. Em relação aos
            dados dos compradores contidos em cada caso, o lojista é o{' '}
            <strong>controlador</strong> e nós somos <strong>operador</strong>, nos termos dos
            artigos 5º, VI e VII, da LGPD (Lei 13.709/2018): tratamos esses dados sob instrução do
            lojista e para a finalidade que ele determina.
          </p>
        </Section>

        <Section title="2. Que dados a plataforma trata">
          <p>
            Só o necessário para montar uma defesa verificável. Nada é coletado “por precaução”.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Da contestação:</strong> identificador do MED, identificadores da transação
              (end-to-end, Pix), valor, moeda, datas de transação, abertura e prazo de resposta,
              motivo alegado e instituição solicitante.
            </li>
            <li>
              <strong>Do comprador:</strong> nome, documento (CPF/CNPJ), e-mail, telefone, endereço,
              endereço IP e identificação do dispositivo — quando o lojista os fornece ou uma
              integração os traz.
            </li>
            <li>
              <strong>Do pedido e da entrega:</strong> itens, valores, código de rastreio, eventos
              logísticos, marcos datados de entrega e, em produto digital, o registro de envio do
              acesso.
            </li>
            <li>
              <strong>Documentos anexados pelo lojista:</strong> nota fiscal, comprovante de
              entrega, comprovante de transação, contrato, captura de tela, exportação de log.
            </li>
            <li>
              <strong>Registros de auditoria:</strong> qual ação foi feita, quando e por qual ator,
              para que toda alteração de um caso seja rastreável.
            </li>
          </ul>
          <p>
            Não usamos esses dados para publicidade, não os vendemos e não os utilizamos para treinar
            modelos de inteligência artificial.
          </p>
        </Section>

        <Section title="3. Dados obtidos do Google (Gmail)">
          <p>
            Quando o lojista conecta uma caixa do Gmail, a autorização pedida é exclusivamente{' '}
            <code className="break-all text-[13px]">{GMAIL_SCOPE}</code> — <strong>somente
            leitura</strong>. A plataforma não envia, não responde, não marca, não arquiva e não
            apaga mensagem alguma.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Para quê:</strong> localizar avisos de MED que chegam por e-mail e usar a
              mensagem original como evidência do caso, com o identificador da mensagem registrado
              como referência de origem.
            </li>
            <li>
              <strong>Quais mensagens:</strong> apenas as que casam com a busca configurada pelo
              próprio lojista (a mesma sintaxe da busca do Gmail). O restante da caixa não é lido.
            </li>
            <li>
              <strong>O que é guardado:</strong> o token de autorização, para manter a conexão
              ativa. Mensagens só são armazenadas quando o lojista as anexa a um caso — e aí o
              conteúdo guardado é o e-mail original, não um resumo.
            </li>
            <li>
              <strong>Compartilhamento:</strong> dados obtidos do Gmail não são compartilhados com
              terceiros, exceto a infraestrutura listada no item 5, e nunca são usados para
              publicidade nem para treinar modelos de IA.
            </li>
            <li>
              <strong>Como revogar:</strong> a qualquer momento em{' '}
              <a
                className="underline"
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
              >
                myaccount.google.com/permissions
              </a>
              . A revogação encerra o acesso imediatamente.
            </li>
          </ul>
          <p>
            O uso de informações recebidas das APIs do Google segue a{' '}
            <a
              className="underline"
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
            >
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado.
          </p>
        </Section>

        <Section title="4. Base legal">
          <p>
            O tratamento se apoia na execução de contrato com o lojista (art. 7º, V) e no exercício
            regular de direitos em processo de contestação (art. 7º, VI), além do legítimo interesse
            em prevenir fraude (art. 7º, IX), sempre limitado ao que a defesa exige.
          </p>
        </Section>

        <Section title="5. Com quem os dados são compartilhados">
          <p>Apenas com a infraestrutura necessária para o serviço funcionar:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Provedor de hospedagem e banco de dados</strong> — armazenamento e execução da
              aplicação.
            </li>
            <li>
              <strong>Provedor de modelo de linguagem</strong> — apenas quando o lojista ativa a
              reescrita do texto da defesa, e apenas com o conteúdo daquele caso. O texto devolvido
              passa por uma verificação que descarta qualquer fato que não estivesse no caso
              original.
            </li>
            <li>
              <strong>Instituição financeira ou adquirente</strong> — o destinatário da defesa, por
              determinação do lojista.
            </li>
          </ul>
          <p>Não há compartilhamento com anunciantes, corretores de dados ou parceiros comerciais.</p>
        </Section>

        <Section title="6. Por quanto tempo ficam guardados">
          <p>
            Enquanto o lojista mantiver a conta e pelo prazo em que a documentação da contestação
            possa ser exigida. Ao excluir um caso, seus dados e documentos são removidos; permanece
            o registro de auditoria da exclusão, sem o conteúdo apagado, porque a própria exclusão
            precisa ser auditável.
          </p>
        </Section>

        <Section title="7. Segurança">
          <p>
            O tráfego é cifrado em trânsito. O acesso é isolado por organização: toda consulta é
            filtrada pela organização de quem pergunta. Chaves de API aparecem na interface apenas
            com os últimos caracteres visíveis, e registros de log usam dados mascarados em vez de
            documento, e-mail, telefone ou IP completos.
          </p>
        </Section>

        <Section title="8. Direitos do titular">
          <p>
            A LGPD garante confirmação de tratamento, acesso, correção, anonimização, portabilidade,
            eliminação e revogação de consentimento (art. 18). Como somos operador, um comprador
            deve procurar o lojista com quem negociou; pedidos recebidos por nós são encaminhados a
            ele e atendidos conforme sua instrução.
          </p>
        </Section>

        <Section title="9. Contato">
          <p>
            Encarregado pelo tratamento de dados pessoais (LGPD, art. 41): {contactName} —{' '}
            <a className="underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
            .
          </p>
        </Section>

        <Section title="10. Alterações">
          <p>
            Mudanças nesta política são publicadas nesta mesma página, com a data de atualização no
            topo.
          </p>
        </Section>
      </div>
    </main>
  );
}
