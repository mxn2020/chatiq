# ChatIQ

[![CI](https://github.com/mxn2020/chatiq/actions/workflows/ci.yml/badge.svg)](https://github.com/mxn2020/chatiq/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-yellow.svg)](https://opensource.org/licenses/Apache-2.0)

AI-powered smart chat with multiple AI models and conversation management.

## Features

- **Multi-Model Chat** — Switch between 20+ AI models (Meta Llama, Mistral, DeepSeek, Google Gemma, NVIDIA Nemotron, and more)
- **Custom Bot Personas** — Create chatbot personas with simple prompts, advanced configs, or multi-step workflows
- **Vision & Audio** — Multimodal support for image understanding and speech recognition
- **Conversation Management** — Organize, search, and manage chat history
- **Subscription Billing** — Stripe-powered Pro and Enterprise plans
- **Internationalization** — English and German out of the box, with auto-detection
- **Dark Theme** — Premium dark design system with custom CSS

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vite + React 19 + TypeScript |
| **Styling** | Vanilla CSS (dark theme design system) |
| **UI Library** | @geenius-ui/react-css |
| **Backend** | Convex (serverless) |
| **Auth** | Convex Auth (email/password) |
| **Payments** | Stripe (subscriptions) |
| **AI** | NVIDIA NIMs |
| **Analytics** | Vercel Analytics |
| **i18n** | i18next + react-i18next |

## Quick Start

```bash
# 1. Install dependencies
cd web
pnpm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your Convex URL

# 3. Start Convex backend
npx convex dev

# 4. Start dev server (in a separate terminal)
pnpm run dev
```

## Environment Variables

See [.env.example](web/.env.example) for all required variables:

| Variable | Description |
|----------|-------------|
| `VITE_CONVEX_URL` | Your Convex deployment URL |
| `NVIDIA_API_KEY` | NVIDIA AI API key (set via `npx convex env set`) |
| `STRIPE_SECRET_KEY` | Stripe restricted API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

## Project Structure

```
chatiq/
├── web/                    # Frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities & model registry
│   │   ├── i18n/           # Internationalization
│   │   └── test/           # Test setup
│   ├── convex/             # Backend functions & schema
│   └── public/             # Static assets
├── PROJECT.yaml            # Project metadata
├── ACCOUNT.yaml            # Service credentials config
├── CHANGELOG.md            # Release history
├── LICENSE                 # Apache-2.0 License
├── CONTRIBUTING.md         # Contribution guide
├── SECURITY.md             # Security policy
├── CODE_OF_CONDUCT.md      # Community guidelines
└── SUPPORT.md              # Support channels
```

## Scripts

```bash
pnpm dev          # Start Vite dev server
pnpm build        # Production build
pnpm test         # Run tests (watch mode)
pnpm test:run     # Run tests once
pnpm lint         # Lint with ESLint
pnpm stop         # Stop running dev processes
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache-2.0 — see [LICENSE](LICENSE) for details.

---

> **License note:** As of 2026-10-23 this project is licensed under the Apache License 2.0 (previously MIT). Versions released before this change remain available under MIT to those who received them.
