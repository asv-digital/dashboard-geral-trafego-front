# Dashboard Geral Tráfego — Frontend

Frontend do agente de tráfego multi-produto.

## Stack

- Next.js 16 (webpack build) + React 19 + TypeScript
- UI: `@base-ui/react` + shadcn (`components.json`) + Tailwind 4
- TanStack Query para data fetching
- react-hook-form + zod
- Recharts pra gráficos

## Comandos

```bash
npm run dev
npm run build         # next build --webpack
npm run lint
```

## Convenções

- Backend correspondente: `../dashboard-geral-trafego-back`. Tipos do contrato API devem espelhar o backend.
- Build com webpack (não turbopack) — verificado no `package.json`.
- Componentes shadcn em `src/components/ui/`. Não duplicar — reusar.
