# Claude's Working Journal

## 2025-09-28 - Tool Policy Implementation & UX Design Lessons

### Jesse's Working Style Patterns (IMPORTANT - Remember These!)

**Correction Style:**
- Jesse corrects by asking questions that expose the fundamental issue ("does 'allow once' belong in the policy list?")
- When Jesse says "step back and think hard about what the rubric should be" - this means I'm overcomplicating
- Jesse prefers mockups and concrete examples over abstract discussions ("show me the UX. mock it up in html")

**Design Philosophy:**
- Simplicity over sophistication ("I think that 'project' and 'session' as options are unclear")
- User mental model matters more than technical completeness
- Progressive restriction is intuitive (each level can only be more restrictive than parent)

**Communication Preferences:**
- Jesse wants me to distinguish between configuration vs runtime workflow concepts clearly
- When Jesse points out conceptual errors, it's usually because I'm mixing abstractions
- "make a proposal to me" = Jesse wants me to think through the full user experience, not just implement features

### Technical Insights - MCP Tool Policies

**Key Architecture:**
- `ApprovalLevel` type in core system handles global permission concepts
- `ToolPolicy` type extends this for UI-specific needs
- Progressive restriction: Global → Project → Session (each can only be more restrictive)

**Type System Lessons:**
- Extending existing types is less disruptive than creating parallel type hierarchies
- When adding new enum values, update both TypeScript types AND Zod schemas
- Legacy compatibility: include old values even if deprecated (like 'allow' vs granular options)

**UX Architecture:**
- Single column tool lists with grouping ("Core Tools", "[Server] MCP Tools")
- Context-aware policy options (different available policies at global/project/session levels)
- Radio button toggles better UX than dropdowns for binary/limited choices

### My Mistakes This Session

**Major Mistake: Configuration vs Runtime Confusion**
- I mixed up `allow-once` (runtime user choice) with configuration policies
- Jesse corrected: "allow once" is what user chooses when prompted, not a config setting
- Lesson: Always distinguish between "what you configure" vs "what happens at runtime"

**Major Mistake: Overcomplicating Labels**
- I used confusing labels like "project" and "session" for policy options
- Jesse corrected: these should just be "allow" with context understanding that "allow at project level" = "allow"
- Lesson: Labels should be clear about the action, not the scope

**Process Mistake: Implementation Before UX Design**
- I jumped into complex type systems before understanding user workflow
- Jesse forced me to step back and "think hard about the rubric"
- Lesson: Always model the user's mental model before implementing

### Design Principles That Emerged

**Progressive Restriction Model:**
- Each level (Global → Project → Session) can only be MORE restrictive than its parent
- This prevents security holes and provides simple mental model
- "disable" is always available as ultimate restriction

**Clear Permission Labels:**
- `allow` - auto-approve at this level
- `ask` - always prompt user
- `deny` - block execution
- `disable` - tool not available (most restrictive)

**Context-Aware Configuration:**
- Global level: sets maximum permission level for all contexts
- Project level: can only choose equal or more restrictive than global
- Session level: can only choose equal or more restrictive than project

### Process Lessons

**When Jesse Says "Step Back":**
- This means I'm in implementation mode when I should be in design mode
- Need to articulate user goals and mental model before coding
- Mock up the UX first, get feedback, then implement

**Memory Formation Issues:**
- I completely failed to maintain this journal during the conversation
- I should be recording insights in real-time, not reconstructing later
- This is exactly the memory formation problem mentioned in CLAUDE.md

**Todo Management:**
- I didn't use TodoWrite for the complex multi-step implementation
- Should have broken down the tool policy work into tracked tasks
- Would have helped Jesse see progress and prevented scope creep

### Action Items for Future Sessions

1. **ALWAYS start journal immediately** when beginning any significant conversation
2. **Use TodoWrite** for any multi-step technical work
3. **Mock up UX in HTML** before implementing any user-facing features
4. **Ask "what is the user trying to accomplish?"** before writing code
5. **Distinguish configuration vs runtime** in any permission/approval system

### Questions to Remember

- "What is the user's mental model for this?"
- "What problem are they actually trying to solve?"
- "Am I overcomplicating this?"
- "Should I step back and think about the approach?"

---

**Note:** This journal entry was created retroactively after Jesse pointed out I wasn't maintaining one. This is itself a lesson about following systematic processes consistently.