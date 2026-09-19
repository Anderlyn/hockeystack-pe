# HockeyStack Technical Task
## Decision log

### What I assumed, and why
- The primary user is an authenticated analyst who wants a fast answer from
  the GA4 ecommerce sample dataset, not a general-purpose SQL console.
- Query safety and predictable cost matter as much as answer quality. I
  assumed the service should permit only bounded, read-only queries and should
  enforce limits on prompt size, conversation size, turns, prompts, scanned
  bytes, and model spend. Also, I wanted to deploy a live version, so this was important
  as well to me.
- Streaming is important for perceived responsiveness because a request can
  involve several model/tool steps. 
- A small, focused interface is enough for this iteration. My focus was in 
  demonstrating my understanding of agent loops, architectural designs, tooling
  and overall prioritization of what a solid MVP can be. 
- We wanted a platform ready to evaluate user behavior. Some level of observability, the
  evaluations and model env configuration. I for once think no AI product can exist without
  at least those pieces. 

### What I chose to cut or deprioritize
- I did not build arbitrary SQL editing, data mutation, table management, or
  export workflows. They increase risk and are outside the core "ask me" then "answer"
- I kept chart rendering intentionally narrow so we could get actually good rendering,
  instead of throwing a lot of complex rendering and breaking the app.
- I did not add persistent conversation history, as the objective for this tech task 
  was to get a usable product that demonstrates skills that I belive were well achieved
  within the time-bound result.
- I did not attempt exhaustive automated evaluation of every natural-language
  question. The prompt and tool contracts establish conservative behavior. Evals are
  enough for validating the agent loop which is the first step, and most important one
  of this task.

### Where I got stuck, and what I did about it
- The nested, repeated GA4 schema makes plausible looking queries easy to get
  wrong. I addressed this by requiring schema inspection when structure is
  uncertain. Self-correctness and healing is important to me in an agent loop. 
- Model-generated SQL can be unsafe or unexpectedly expensive, while also
  being an important vector for prompt injection, so I spend a some time here
  to make sure this was not a concern. 
- A multi-step response can fail after the request has already started
  streaming. I kept errors explicit in the event stream and added structured
  request to agent logging so failures are visible without exposing internal
  mechanics to the user.
- Chart requests can become detached from the query that produced them. I
  modeled query results with a result reference and require chart rendering to
  use that prior result instead of retyping data, cost concerns to me are important
  if we think of this as an MVP. 

### What I would build or improve with an additional 40 hours
1. **Evaluation and reliability:** Create a curated question set
   covering schema discovery, date ranges, metrics, filters, chart selection,
   refusals, and SQL repair.
2. **Observability and operations:** Add request traces (like langfuse), latency and
   token byte dashboards, per tool failure metrics, alerting, and a safer
   redaction policy for diagnostic logs.
3. **Conversation product features:** Persist conversations,
   support rename/delete, allow users to revisit a result, and make the
   current date range and assumptions easier to inspect and edit.
4. **Answer quality and UX:** Improve loading retry states, keyboard
   accessibility, responsive chart behavior, citations to the relevant
   result context, and clearer explanations when data cannot answer a
   question.
