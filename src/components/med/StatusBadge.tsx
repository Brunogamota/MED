import {
  AnimatedBadge,
  type AnimatedBadgeSize,
  type AnimatedBadgeStatus,
} from '@/components/ui/animated-badge';
import { MED_STATUS_LABEL, MED_STATUS_TONE } from '@/lib/labels';
import type { MedStatus } from '@/domain/types';

/**
 * Status do MED como selo.
 *
 * O tom vem de `MED_STATUS_TONE`, unico lugar que decide a gravidade de cada
 * status — a tela so traduz esse tom em variante do selo.
 *
 * Nenhum status usa o tom `loading`: o giro do spinner promete processo em
 * andamento, e "Coletando dados" espera o operador, nao uma rotina rodando.
 */
const TONE_STATUS: Record<(typeof MED_STATUS_TONE)[MedStatus], AnimatedBadgeStatus> = {
  neutral: 'neutral',
  info: 'info',
  accent: 'success',
  warning: 'warning',
  danger: 'danger',
};

export function StatusBadge({
  status,
  size = 'sm',
  className,
}: {
  status: MedStatus;
  size?: AnimatedBadgeSize;
  className?: string;
}) {
  return (
    <AnimatedBadge
      status={TONE_STATUS[MED_STATUS_TONE[status]]}
      size={size}
      contentKey={status}
      className={className}
    >
      {MED_STATUS_LABEL[status]}
    </AnimatedBadge>
  );
}
