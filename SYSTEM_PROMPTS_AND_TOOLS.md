# System Prompts and Tools

This document describes all system prompts and tools available in Forge.

## System Prompts

System prompts are automatically generated based on the chat role. They are defined in `/lib/prompts/system-prompts.ts`.

### GoalPlanner System Prompt

Used when helping users break down goals into scheduled tasks.

**Context Required:**

- User's timezone
- Goal data (title, description, due date)

**Phases:**

1. **Detective Mode**: Ask questions to understand the goal requirements
2. **Draft Mode**: Propose concrete, scheduled tasks
3. **Decision Mode**: Get user confirmation and finalize

**Guidelines:**

- Keep tasks short and actionable (15-120 minutes each)
- Schedule during reasonable working hours
- Avoid calendar collisions
- Spread tasks across available days before due date
- Use fine-grained tools for small changes (modifySuggestedEvent)
- Use suggestEvents for major changes

### Assistant System Prompt

Default helpful assistant for general conversation.

**Context Required:**

- User's timezone

**Capabilities:**

- Answer questions about schedule and tasks
- Provide time management advice
- General assistance

### TaskHelper System Prompt

Focused assistant for completing a specific task (used in Zen Mode).

**Context Required:**

- User's timezone
- Event title (the task being worked on)

**Role:**

- Keep user focused on the current task
- Provide relevant tips and resources
- Encourage progress
- Be brief and actionable

## Base Tools

Available to all AI agents (Assistant, GoalPlanner, TaskHelper):

### Memory Tools

- **saveMemory**: Save user preferences, habits, and characteristics for future conversations

  - Parameters: `question` (key), `answer` (value)
  - Auto-updates existing memories with same question

- **readMemories**: Retrieve stored memories, optionally filtered by keyword

  - Parameters: `keyword` (optional)
  - Returns all matching memories with timestamps

- **listMemoryQuestions**: List all memory question keys without answers

  - No parameters
  - Quick overview of what's known about the user

- **searchMemoryAnswer**: Look up answer for a specific memory question
  - Parameters: `question` (exact match)
  - Returns the stored answer if found

### Chat Tools

- **setChatTitle**: Update the current chat session title

  - Parameters: `title` (1-100 characters)
  - Makes conversations easier to find later

- **searchOnline**: Search the web using Tavily API
  - Parameters: `query` (search terms), `num` (1-5 results)
  - Requires Tavily API key in settings
  - Returns title, URL, and content snippet for each result

## GoalPlanner-Specific Tools

Available only when role is "GoalPlanner":

### Event Management

- **listAllEvents**: List all events for the goal (confirmed and unconfirmed)

  - No parameters (uses goalId from context)
  - Shows completion status and confirmation state

- **listSuggestedEvents**: List only unconfirmed events

  - No parameters
  - Useful for seeing current proposals

- **suggestEvents**: Propose/replace all events for the goal

  - Parameters: `tasks` (array of {title, start, end})
  - Start/end must be ISO 8601 datetime strings
  - Replaces all previous suggested events
  - Should be called proactively after proposing tasks

- **modifySuggestedEvent**: Update a specific unconfirmed event

  - Parameters: `eventId`, `title` (optional), `start` (optional), `end` (optional)
  - Only works for unconfirmed events
  - Use for small adjustments ("move task 2 to 3pm")

- **deleteSuggestedEvent**: Remove a specific unconfirmed event
  - Parameters: `eventId`
  - Only works for unconfirmed events
  - Use when user wants to remove one task

## Tool Execution

### Client-Side (Current Implementation)

1. AI calls tool during conversation
2. `useChatClient` hook sends request to `/api/tools/execute`
3. Server-side executor (`/lib/tools/executor.ts`) runs the tool
4. Result returned to AI for continuation
5. Chat history auto-saved after completion

### Tool Guidelines

All tools follow these principles:

- **No silent execution**: Tools that don't produce visible UI must be accompanied by a text response
- **Memory tools**: Always include a natural text message incorporating what was learned
- **Event tools**: Call suggestEvents proactively, don't wait for explicit approval
- **Fine-grained vs bulk**: Use modifySuggestedEvent for small changes, suggestEvents for major rewrites

## Usage in Code

### ChatBox Component

The ChatBox automatically:

1. Detects the role from `extraParams.role`
2. Fetches user timezone
3. Fetches goal/event data if needed
4. Builds appropriate system prompt
5. Passes correct tools based on role

```tsx
<ChatboxComponent
  name="Goal Planning"
  chatHistoryId={chatId}
  extraParams={{
    role: "GoalPlanner",
    goalId: "goal-123",
  }}
/>
```

### Adding New Tools

1. Define schema in `/lib/tools/schemas.ts`
2. Add execution logic in `/lib/tools/executor.ts`
3. Add tool name to appropriate role in `getToolsForRole()`
4. Tool automatically available to AI agents with that role

## Important Notes

- **Timezone**: All datetime strings should use user's local timezone
- **Tool responses**: Always provide text feedback after tool calls
- **Memory persistence**: Memories persist across all chat sessions
- **Event confirmation**: Only unconfirmed events can be modified/deleted
- **Chat history**: Automatically saved after each AI response completes
