# Forge — Project Vision

## One-sentence purpose

Forge is a goal-centric planning system where an AI collaborator helps users decide _what to do today_ by proposing context-aware tasks, rather than asking users to micromanage to-do lists.

## The problem

Most productivity tools:

- Treat tasks as the source of truth
- Require constant manual upkeep
- Encourage guilt, streaks, and nagging notifications
- Optimize for logging work, not deciding work

This increases cognitive overhead and often amplifies procrastination rather than reducing it.

## Core idea

Forge inverts the model:

- **Goals are long-lived and primary**
- **Tasks are temporary and suggested**
- **AI proposes, the user disposes**

The system exists to reduce activation energy, not to enforce discipline.

## What Forge is

- A thinking partner for planning
- A goal-aware system with memory
- A calendar-based execution surface
- A tool that respects user autonomy

## What Forge is not

- Not a habit tracker
- Not a streak-based accountability app
- Not a gamified productivity system
- Not a notification-driven nagging tool

## Design principles

1. **Goals over tasks**
   Tasks are derived, not authored as truth.

2. **Suggestion over obligation**
   AI outputs are always optional.

3. **Local clarity over global optimization**
   Help the user choose the _next right thing_, not the perfect plan.

4. **Minimal surfaces**
   Every new UI element must justify its existence.

5. **Human-interpretable reasoning**
   When possible, AI suggestions should be explainable.

## Long-term direction

- Full-stack architecture with a clean API boundary
- Persistent goal memory and summarization
- Planner services that reason about deadlines, energy, and context
- Optional integrations (calendar, notes), never required

## Current scope

- Frontend-first development
- Minimal calendar
- Mocked backend/API layer
- Explicit architectural seams for future expansion
