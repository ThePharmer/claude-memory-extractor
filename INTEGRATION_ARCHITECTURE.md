# Integration Architecture
## Claude Memory Extractor + Kintsugi-Agent

**Status:** Recommended architecture for local development workflow
**Last Updated:** 2025-11-15

---

## TL;DR Recommendation

**❌ Don't use GitHub template approach** (duplicates everything per-project)

**✅ Use centralized extraction + user-level memory injection**

---

## Understanding the Landscape

### What You Have

**Kintsugi-Agent:**
- Python-based Claude Code hooks (using UV ✅)
- Per-project hooks in `.claude/hooks/`
- User-level agents in `~/.claude/agents/` (global)
- Transcript extraction (current session only)
- Meta-agent capabilities

**Key limitation from kintsugi README:**
> "The chat.json file contains only the most recent Claude Code conversation. **It does not preserve conversations from previous sessions.**"

This is exactly where memory extractor fits!

### What You Need

1. **Cross-project memory** - Lessons from Project A help Project B
2. **Long-term retention** - Learn from sessions weeks/months ago
3. **Automatic injection** - Relevant memories loaded into each session
4. **Centralized storage** - Single source of truth

---

## Recommended Architecture

```
~/.claude/
├── projects/                    # Auto-created by Claude Code
│   ├── project-typescript-app/
│   │   └── sessions.jsonl       # All sessions for this project
│   ├── project-python-api/
│   │   └── sessions.jsonl
│   └── project-react-ui/
│       └── sessions.jsonl
│
├── memories/                    # Memory extractor output
│   ├── extracted/               # Raw extracted memories
│   │   ├── 2025-01-15T10-00-00-typescript-app-pattern-abc123-000.md
│   │   ├── 2025-01-15T14-30-00-python-api-failure-def456-000.md
│   │   └── 2025-01-16T09-00-00-react-ui-discovery-ghi789-000.md
│   └── index/                   # Vector embeddings (future)
│       └── faiss.index
│
└── agents/                      # User-level (global) agents
    ├── memory_injector.py       # ⭐ SessionStart hook (global)
    └── utils/
        └── memory_retrieval.py

~/dev/kintsugi-agent/            # Your development repo
├── .claude/
│   └── hooks/                   # Example hooks (for demos)
│       ├── user_prompt_submit.py
│       ├── session_start.py     # Example, not used globally
│       └── ...
│
└── memory-extractor/            # ⭐ Memory extraction tool
    ├── claude_memory/           # Python package (UV-based)
    │   ├── cli.py
    │   ├── extraction/
    │   └── models/
    └── pyproject.toml           # UV dependencies

~/dev/some-typescript-project/   # Regular project
├── .claude/                     # Project-specific hooks (optional)
│   └── hooks/
│       └── user_prompt_submit.py  # Only if project needs custom validation
└── src/
```

---

## How It Works

### 1. Memory Extraction (Batch Process)

**Frequency:** Nightly cron job or manual trigger

```bash
# Run from anywhere
cd ~/dev/kintsugi-agent/memory-extractor
uv run claude-memory extract --since="2025-01-15T00:00:00"

# Or set up cron (once daily at 2am)
0 2 * * * cd ~/dev/kintsugi-agent/memory-extractor && uv run claude-memory extract
```

**What it does:**
1. Scans `~/.claude/projects/*/sessions.jsonl`
2. Filters sessions since last run (or --since date)
3. Chunks conversations
4. Extracts lessons using Anthropic API
5. Writes to `~/.claude/memories/extracted/`

**Output:** Markdown files with YAML frontmatter
```markdown
---
id: "mem-2025-01-15T10-00-00-abc123"
created: "2025-01-15T10:00:00Z"
confidence: 4.5
tags: ["python", "async", "debugging"]
source:
  session: "typescript-app-session-123"
  project: "typescript-app"
---

# Lesson: Always validate async context before await

When debugging async functions, check if you're in an async context...
[Root Cause Analysis]
[Psychological Driver]
[Prevention Strategy]
```

### 2. Memory Injection (Per Session)

**Trigger:** Every Claude Code session start (automatic)

**File:** `~/.claude/agents/memory_injector.py`

```python
#!/usr/bin/env -S uv run --quiet --script
# /// script
# dependencies = ["anthropic", "faiss-cpu", "numpy"]
# ///

"""
SessionStart hook: Inject relevant memories into Claude's context.
This runs GLOBALLY for all Claude Code sessions.
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timedelta


def load_recent_memories(limit: int = 10) -> list[dict]:
    """Load recent high-confidence memories."""
    memories_dir = Path.home() / ".claude" / "memories" / "extracted"

    if not memories_dir.exists():
        return []

    # Get recent memory files (last 30 days)
    cutoff = datetime.now() - timedelta(days=30)
    recent_files = [
        f for f in memories_dir.glob("*.md")
        if datetime.fromtimestamp(f.stat().st_mtime) > cutoff
    ]

    # Sort by modification time, take most recent
    recent_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    memories = []
    for file_path in recent_files[:limit]:
        content = file_path.read_text()
        # Parse YAML frontmatter
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                # TODO: Parse YAML properly
                memories.append({
                    "file": file_path.name,
                    "content": parts[2].strip()
                })

    return memories


def inject_memories_prompt(user_prompt: str) -> str:
    """Inject memories into user's prompt."""
    memories = load_recent_memories(limit=5)

    if not memories:
        return user_prompt

    memory_context = "\n\n".join([
        f"### Past Lesson {i+1}\n{m['content'][:500]}..."
        for i, m in enumerate(memories)
    ])

    enhanced_prompt = f"""<previous_learnings>
{memory_context}
</previous_learnings>

<current_request>
{user_prompt}
</current_request>

Note: Review previous learnings above before proceeding. Apply relevant lessons to this request."""

    return enhanced_prompt


def main():
    """SessionStart hook entry point."""
    # Read hook input from stdin
    hook_input = json.loads(sys.stdin.read())

    # For SessionStart, we can return additional context
    # that gets injected into Claude's system prompt

    memories = load_recent_memories(limit=10)

    if memories:
        memory_summary = "\n".join([
            f"- {m['file']}: {m['content'][:200]}..."
            for m in memories[:5]
        ])

        # Return additional system context
        print(json.dumps({
            "additionalContext": f"""
## Relevant Past Learnings

You have access to lessons learned from previous sessions:

{memory_summary}

Apply these insights when relevant to the current task.
"""
        }))
    else:
        # No memories, just pass through
        print(json.dumps({}))


if __name__ == "__main__":
    main()
```

**Enable globally:**
```bash
# Copy to user-level agents directory
mkdir -p ~/.claude/agents
cp memory_injector.py ~/.claude/agents/

# Configure in ~/.claude/settings.json
# (Claude Code will auto-detect agents in ~/.claude/agents/)
```

### 3. User Workflow

**Developer's daily experience:**

```bash
# Morning: Check what was learned overnight
cd ~/dev/kintsugi-agent/memory-extractor
uv run claude-memory info
# Shows: "Last extraction: 2025-01-15 02:00:00"
#        "Memories extracted: 47"
#        "Latest: async debugging pattern from typescript-app"

# Start working on ANY project
cd ~/dev/some-python-project
claude

# Claude Code starts
# SessionStart hook automatically runs
# Loads relevant memories into context
# You get better suggestions based on past learnings!

# End of day: Manually trigger extraction if you want
cd ~/dev/kintsugi-agent/memory-extractor
uv run claude-memory extract --since="2025-01-15T09:00:00"
```

---

## Why NOT GitHub Template?

### ❌ Template Approach (Don't Do This)

```
~/dev/project-a/
├── .claude/
│   └── hooks/
│       └── memory_extractor.py   # Duplicated
└── memory-extractor/             # Duplicated
    └── claude_memory/

~/dev/project-b/
├── .claude/
│   └── hooks/
│       └── memory_extractor.py   # Duplicated
└── memory-extractor/             # Duplicated
    └── claude_memory/

~/dev/project-c/
├── .claude/
│   └── hooks/
│       └── memory_extractor.py   # Duplicated
└── memory-extractor/             # Duplicated
    └── claude_memory/
```

**Problems:**
1. ❌ **Siloed memories** - Project A can't learn from Project B
2. ❌ **Duplication** - Same extraction code in 20 projects
3. ❌ **Update hell** - Bug fix requires updating 20 repos
4. ❌ **Wasted storage** - Each project stores redundant memories
5. ❌ **Maintenance nightmare** - Which version is canonical?

### ✅ Centralized Approach (Recommended)

```
~/.claude/memories/extracted/     # One memory store for ALL projects
~/dev/kintsugi-agent/
└── memory-extractor/             # One extraction tool
    └── claude_memory/            # One codebase to maintain
```

**Benefits:**
1. ✅ **Cross-project learning** - Async lesson from Python project helps TypeScript project
2. ✅ **Single source of truth** - One codebase, one memory store
3. ✅ **Easy updates** - Fix once, benefits all projects
4. ✅ **Efficient storage** - No duplication
5. ✅ **Better insights** - Patterns across projects visible

---

## Installation & Setup

### One-Time Setup

```bash
# 1. Install UV (if not already)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Clone/develop memory extractor
cd ~/dev/kintsugi-agent
git clone <memory-extractor-repo> memory-extractor
cd memory-extractor

# 3. Install as UV tool (makes 'claude-memory' available globally)
uv tool install .

# 4. Create directories
mkdir -p ~/.claude/memories/extracted
mkdir -p ~/.claude/agents

# 5. Copy memory injector to global agents
cp scripts/memory_injector.py ~/.claude/agents/

# 6. Set up environment
echo "ANTHROPIC_API_KEY=your-key" > ~/.env

# 7. Test extraction
claude-memory extract --since="2025-01-01T00:00:00"

# 8. Set up cron (optional - automatic nightly extraction)
(crontab -l 2>/dev/null; echo "0 2 * * * claude-memory extract") | crontab -
```

**Done!** Every Claude Code session now has access to all past learnings.

---

## Integration with Kintsugi Meta-Agent

### Extending Kintsugi's Meta-Agent

**File:** `~/dev/kintsugi-agent/.claude/hooks/meta_agent.py`

```python
#!/usr/bin/env -S uv run --quiet --script
# /// script
# dependencies = ["anthropic", "pydantic"]
# ///

"""
Meta-agent that can spawn sub-agents with memory context.
"""

from pathlib import Path
from anthropic import Anthropic

class MemoryAwareMetaAgent:
    """Meta-agent that uses memory system."""

    def __init__(self):
        self.client = Anthropic()
        self.memories_dir = Path.home() / ".claude" / "memories" / "extracted"

    def load_relevant_memories(self, task_description: str, limit: int = 5):
        """Load memories relevant to a task (semantic search in future)."""
        # For now, just load recent high-confidence memories
        # TODO: Implement vector search
        memories = []
        for file in sorted(self.memories_dir.glob("*.md"), reverse=True)[:limit]:
            content = file.read_text()
            memories.append(content)
        return memories

    def spawn_subagent(self, task: str):
        """Spawn a sub-agent with memory context."""
        relevant_memories = self.load_relevant_memories(task)

        system_prompt = f"""You are a specialized sub-agent.

Relevant past learnings:
{chr(10).join(relevant_memories)}

Your task: {task}

Apply lessons learned from past experiences."""

        response = self.client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": task}]
        )

        return response.content[0].text
```

**Usage in hooks:**
```python
# In any kintsugi hook
from meta_agent import MemoryAwareMetaAgent

agent = MemoryAwareMetaAgent()
result = agent.spawn_subagent("Refactor this API to use async/await")
# Sub-agent has access to all past learnings about async patterns!
```

---

## Advantages for Local Development

Since you mentioned **running locally** (not AWS), you avoid all the Python disadvantages that matter for distribution:

### ✅ Advantages You Get

1. **No installation complexity** - You install once, it's yours forever
2. **No startup time concerns** - Batch processing runs overnight
3. **No memory limitations** - Your laptop has plenty of RAM
4. **Full control** - Can debug, modify, extend anytime
5. **Fast iteration** - UV makes dependency changes instant
6. **Native meta-agent integration** - Python ecosystem perfect for this

### ❌ Disadvantages That Don't Matter

1. ~~Distribution complexity~~ - You're not distributing to others
2. ~~Python version conflicts~~ - Your machine, your Python, no conflicts
3. ~~Startup time~~ - Extraction runs in background, doesn't block
4. ~~Memory usage~~ - 380MB vs 300MB? Irrelevant on modern laptop
5. ~~Type safety~~ - Use mypy in pre-commit, you'll catch errors

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Extract memories from all projects
- ✅ Store in centralized location
- ✅ Inject recent memories into sessions

### Phase 2 (Next)
- [ ] **Semantic search** - Use embeddings to find relevant memories
  ```python
  from sentence_transformers import SentenceTransformer
  model = SentenceTransformer('all-MiniLM-L6-v2')

  # Embed memories on extraction
  # Search by similarity at session start
  ```

- [ ] **Memory consolidation** - Merge duplicate/conflicting memories
- [ ] **Confidence decay** - Reduce confidence of old, unreinforced memories
- [ ] **Manual feedback** - Tag memories as helpful/unhelpful

### Phase 3 (Future)
- [ ] **Multi-user support** - Team memory sharing
- [ ] **Memory visualization** - UI to browse/search memories
- [ ] **Active learning** - Prompt for feedback during sessions
- [ ] **Memory graph** - Connect related memories

---

## Recommended File Structure

```
~/dev/kintsugi-agent/
├── README.md
├── .claude/
│   └── hooks/                    # Project hooks (for kintsugi development)
│       ├── user_prompt_submit.py
│       ├── pre_tool_use.py
│       ├── session_start.py      # Example, not used globally
│       └── ...
│
├── memory-extractor/             # Memory extraction tool (subdir or submodule)
│   ├── pyproject.toml            # UV project config
│   ├── README.md
│   ├── claude_memory/
│   │   ├── __init__.py
│   │   ├── cli.py
│   │   ├── extraction/
│   │   │   ├── parser.py
│   │   │   ├── chunker.py
│   │   │   └── agent_extractor.py
│   │   ├── models/
│   │   │   ├── session.py
│   │   │   └── memory.py
│   │   └── meta_agent/
│   │       ├── integration.py
│   │       └── protocols.py
│   │
│   ├── agents/
│   │   └── multi-dimensional-extractor.md
│   │
│   ├── scripts/
│   │   ├── memory_injector.py    # Copy to ~/.claude/agents/
│   │   └── setup.sh              # One-time setup script
│   │
│   └── tests/
│       └── ...
│
└── docs/
    └── memory-system-integration.md
```

---

## Next Steps

1. **Port memory extractor to Python** (following PYTHON_PORTING_GUIDE.md)
2. **Integrate with kintsugi-agent repo** (as subdirectory or git submodule)
3. **Create `memory_injector.py`** for SessionStart hook
4. **Write `setup.sh`** for one-time installation
5. **Test extraction** across your existing projects
6. **Document in kintsugi README** how memory system enhances the meta-agent

---

## Questions to Consider

1. **Git submodule vs subdirectory?**
   - Submodule: Separate versioning, can develop independently
   - Subdirectory: Simpler, single repo

2. **Extraction frequency?**
   - Nightly cron: Automatic, might miss today's lessons
   - On-demand: Manual control, might forget to run
   - Session end hook: Immediate, but adds latency

3. **Memory privacy?**
   - All projects share one memory store
   - Might want to filter sensitive projects
   - Add `--exclude-projects` flag?

4. **Vector search now or later?**
   - Start simple (recent memories)
   - Add semantic search when needed
   - FAISS or ChromaDB integration

Want me to help with any of these next steps?
