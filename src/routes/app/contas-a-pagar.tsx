import { createFileRoute } from '@tanstack/react-router'
import { LancamentosPage } from '@/components/Lancamentos'

export const Route = createFileRoute('/app/contas-a-pagar')({
  component: () => <LancamentosPage natureza="pagar" />,
})
