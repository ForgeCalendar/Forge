# Forge

[![Build and Push Docker Images](https://github.com/ForgeCalendar/Forge/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/ForgeCalendar/Forge/actions/workflows/docker-publish.yml)
[![Backend Tests](https://github.com/ForgeCalendar/Forge/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/ForgeCalendar/Forge/actions/workflows/backend-tests.yml)

A goal-centric planning system where an AI collaborator helps you decide **what to do today** by generating context-aware daily events from your long-term goals.

## Overview

Forge inverts the traditional productivity model:

- **Goals are long-lived and primary** - Define your high-level objectives with due dates and context
- **Tasks are temporary and AI-suggested** - The system proposes daily events based on your goals
- **Calendar as execution surface** - Schedule suggested tasks as time blocks on your calendar
- **AI proposes, you dispose** - All suggestions are optional; you maintain full autonomy

Instead of micromanaging todo lists, Forge helps you answer "what should I work on today?" by reasoning about your goals, deadlines, and available time.

## Architecture

### Frontend Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Chakra UI v3** - Component library with Ark UI primitives
- **Tailwind CSS v4** - Utility-first styling
- **FullCalendar** - Interactive calendar component with time grid view

### State Management

- **Zustand** - Lightweight state management for goals and calendar events
- Goal data structure includes:
  - Title, description, and due date
  - Events with completion status and time estimates
  - Custom info tags (owner, priority, etc.)

### AI Integration

- **@assistant-ui/react** - Chat interface components
- **Vercel AI SDK** - Multi-provider AI integration
- **Supported Providers** - Anthropic, OpenAI, Google AI, Mistral
- Custom system prompts for goal breakdown and scheduling
- Real-time streaming responses
- Per-goal chat history persistence

### Key Components

#### `App.tsx`

Main application layout coordinating:

- Header with theme toggle and settings
- Sidebar for goal management
- Calendar view for scheduling

#### `Sidebar.tsx`

Goal management interface featuring:

- Goal list with metadata display
- Add/edit/delete goal dialogs
- Integration with WorkDialog for task scheduling

#### `WorkDialog.tsx`

AI-powered work planning interface that:

- Opens a chat session for a specific goal
- Generates daily event suggestions based on goal context
- Helps decide what to work on today with reasoning

#### `Chatbox.tsx`

Reusable AI assistant component with:

- Configurable system and summary prompts
- Streaming message support
- Markdown rendering for rich responses

#### Calendar Integration

- FullCalendar with time grid plugin
- Drag-and-drop event editing
- Current time indicator
- Event categorization (tasks, meetings, etc.)

### API Layer

- `/api/chat/route.ts` - Streaming chat endpoint using Vercel AI SDK
- Multi-provider AI integration (Anthropic, OpenAI, Google, Mistral)
- `/api/goals/`, `/api/events/` - Full REST CRUD endpoints
- `/api/auth/` - Session-based authentication
- `/api/providers/` - AI provider management
- `/api/ics-subscriptions/` - External calendar subscription sync

### Styling

- Dark mode support via `next-themes`
- Responsive design with mobile-first approach
- Consistent color theming across light/dark modes
- Chakra UI color mode integration

## Getting Started

```bash
# install dependence
npm install
```

```bash
# Optional: enable Assistant web search tool (Tavily)
export TAVILY_API_KEY="your-tavily-api-key"
```

```bash
# Initialize database
npm run db:init
npm run db:seed
```

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Documentation

Detailed documentation lives in the [`wiki/`](wiki/) directory:

- [**API Documentation**](wiki/API_DOCUMENTATION.md) — REST API endpoint reference
- [**Auth Documentation**](wiki/AUTH_DOCUMENTATION.md) — Authentication flow, session management, and security
- [**Auth Summary**](wiki/AUTH_SUMMARY.md) — Authentication implementation overview
- [**Backend Summary**](wiki/BACKEND_SUMMARY.md) — Backend architecture and setup
- [**Testing**](wiki/TESTING.md) — Test structure, mocking strategy, and CI integration
- [**Vision**](wiki/VISION.md) — Project vision, principles, and long-term direction

## Project Structure

```
Forge/
├── app/                    # Next.js app router
│   ├── api/chat/          # AI chat API endpoint
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── assistant-ui/     # AI chat UI components
│   ├── ui/               # Shared UI primitives
│   ├── App.tsx           # Main app component
│   ├── Sidebar.tsx       # Goal management sidebar
│   ├── Chatbox.tsx       # AI chat interface
│   └── WorkDialog.tsx    # Task planning dialog
├── wiki/                  # Project documentation
│   ├── API_DOCUMENTATION.md
│   ├── AUTH_DOCUMENTATION.md
│   ├── AUTH_SUMMARY.md
│   ├── BACKEND_SUMMARY.md
│   ├── TESTING.md
│   └── VISION.md
├── states/               # State management
│   ├── goals.ts         # Goal data types and samples
│   ├── events.tsx       # Calendar event management
│   └── InfoTag.tsx      # Tag type definitions
├── lib/                 # Utility functions
├── prisma/              # Database schema and migrations
└── public/              # Static assets
```

## Key Features

- **Goal-Centric Planning**: Goals are the source of truth, not individual tasks
- **AI-Generated Events**: Daily task suggestions derived from your long-term goals
- **Context-Aware Suggestions**: AI reasons about deadlines, progress, and available time
- **Calendar-Based Execution**: Visual time blocking with drag-and-drop scheduling
- **Thinking Partner**: Chat with AI about your goals to decide what to work on
- **User Autonomy**: All AI suggestions are optional; you maintain full control
- **Theme Support**: Full light/dark mode support
- **Responsive Design**: Works on desktop and mobile devices

## Design Philosophy

Forge follows these core principles:

1. **Goals over tasks** - Tasks are derived, not authored as truth
2. **Suggestion over obligation** - AI outputs are always optional
3. **Local clarity over global optimization** - Help you choose the next right thing, not the perfect plan
4. **Minimal surfaces** - Every UI element justifies its existence
5. **Human-interpretable reasoning** - AI suggestions are explainable

Forge exists to reduce activation energy and help you decide what to do today, not to enforce discipline or create guilt.

## License

Private project
