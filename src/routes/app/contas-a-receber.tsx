import { createFileRoute } from '@tanstack/react-router'
import { LancamentosPage } from '@/components/Lancamentos'

export const Route = createFileRoute('/app/contas-a-receber')({
  component: () => <LancamentosPage natureza="receber" />,
})
