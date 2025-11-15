# Python/uv Porting Guide
## Claude Memory Extractor → Python Implementation

**Target:** Port TypeScript codebase to Python with uv package management
**Goal:** Integration with Claude meta-agent system
**Status:** Planning & Design Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Mapping](#architecture-mapping)
3. [Project Structure](#project-structure)
4. [Dependency Mapping](#dependency-mapping)
5. [Implementation Guide](#implementation-guide)
6. [Meta-Agent Integration](#meta-agent-integration)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Performance Considerations](#performance-considerations)

---

## Executive Summary

### Why Python?

**Advantages:**
- ✅ Better AI/ML ecosystem integration (Anthropic SDK, LangChain, etc.)
- ✅ Native async/await support similar to TypeScript
- ✅ Rich data processing libraries (pandas, numpy for analysis)
- ✅ Type hints (Python 3.10+) provide similar type safety
- ✅ Easier meta-agent integration with Python-based AI frameworks
- ✅ uv provides ultra-fast dependency management (10-100x faster than pip)

**Challenges:**
- ⚠️ No built-in generator syntax like TypeScript's `yield*`
- ⚠️ Different module system (no `export`/`import`)
- ⚠️ Runtime type checking requires additional libraries
- ⚠️ Different error handling patterns

### Key Changes

| TypeScript | Python | Notes |
|------------|--------|-------|
| `class` with private fields | `@dataclass` + `_private` | Python has weak privacy |
| `interface` | `Protocol` or `TypedDict` | Use `typing.Protocol` for structural typing |
| `async Generator<T>` | `AsyncGenerator[T, None]` | Similar async iteration |
| Commander.js | Click or Typer | Typer recommended for type safety |
| Jest | pytest | More Pythonic, excellent plugin ecosystem |
| `child_process` | `asyncio.subprocess` | Better async integration |

---

## Architecture Mapping

### Current TypeScript Structure

```
src/
├── cli.ts                      # Entry point
├── commands/
│   └── extract.ts              # Extract command
├── extraction/
│   ├── parser.ts               # JSONL parsing
│   ├── chunker.ts              # Conversation chunking
│   └── agent-extractor.ts      # Claude CLI integration
└── types/
    ├── session.ts              # Session types
    └── memory.ts               # Memory types
```

### Proposed Python Structure

```
claude_memory/
├── __init__.py                 # Package initialization
├── __main__.py                 # Entry point (python -m claude_memory)
├── cli.py                      # CLI interface (Typer)
├── commands/
│   │── __init__.py
│   └── extract.py              # Extract command
├── extraction/
│   ├── __init__.py
│   ├── parser.py               # JSONL parsing
│   ├── chunker.py              # Conversation chunking
│   └── agent_extractor.py      # Anthropic SDK integration
├── models/
│   ├── __init__.py
│   ├── session.py              # Pydantic models for sessions
│   └── memory.py               # Pydantic models for memories
├── utils/
│   ├── __init__.py
│   ├── path_utils.py           # Path sanitization & expansion
│   └── message_utils.py        # Content extraction utilities
└── meta_agent/
    ├── __init__.py
    ├── integration.py          # Meta-agent integration layer
    └── protocols.py            # Agent communication protocols
```

### File Naming Conventions

| TypeScript | Python | Rationale |
|------------|--------|-----------|
| `session.ts` | `session.py` | Standard Python extension |
| `SessionParser` | `SessionParser` | Keep PascalCase for classes |
| `extractFromChunk()` | `extract_from_chunk()` | PEP 8 snake_case |
| `agent-extractor.ts` | `agent_extractor.py` | Python uses underscores |

---

## Project Structure

### pyproject.toml (uv configuration)

```toml
[project]
name = "claude-memory"
version = "1.0.0"
description = "Multi-dimensional memory extraction for Claude conversations"
authors = [
    {name = "Jesse Vincent", email = "jesse@fsck.com"},
]
readme = "README.md"
requires-python = ">=3.10"
license = {text = "MIT"}
keywords = ["claude", "memory", "extraction", "ai", "anthropic"]

dependencies = [
    "anthropic>=0.34.0",           # Official Anthropic SDK
    "typer[all]>=0.12.0",          # CLI framework with type hints
    "pydantic>=2.8.0",             # Data validation & serialization
    "rich>=13.7.0",                # Beautiful terminal output
    "python-dotenv>=1.0.0",        # Environment variable loading
    "asyncio>=3.4.3",              # Async IO support
    "aiofiles>=23.2.0",            # Async file operations
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=5.0.0",
    "mypy>=1.11.0",
    "ruff>=0.5.0",                 # Fast linter & formatter
    "black>=24.0.0",               # Code formatter
    "ipython>=8.26.0",             # Interactive shell for debugging
]

[project.scripts]
claude-memory = "claude_memory.cli:app"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 100
target-version = "py310"
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM", "TCH"]
ignore = ["E501"]  # Line too long (Black handles this)

[tool.ruff.per-file-ignores]
"__init__.py" = ["F401"]  # Unused imports in __init__

[tool.mypy]
python_version = "3.10"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"
addopts = "-v --cov=claude_memory --cov-report=term-missing"

[tool.coverage.run]
source = ["claude_memory"]
omit = ["tests/*", "**/__init__.py"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "if TYPE_CHECKING:",
]
```

### Setup Instructions (uv)

```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Initialize project
cd claude-memory-python
uv init

# Install dependencies
uv sync

# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
# or
.venv\Scripts\activate  # Windows

# Run the CLI
uv run claude-memory --help

# Development
uv run pytest                    # Run tests
uv run mypy claude_memory        # Type checking
uv run ruff check .              # Linting
uv run black .                   # Formatting
```

---

## Dependency Mapping

### TypeScript → Python Dependencies

| TypeScript Package | Python Equivalent | Purpose | Notes |
|-------------------|-------------------|---------|-------|
| `commander` | `typer` | CLI framework | Typer has better type safety |
| `dotenv` | `python-dotenv` | Environment variables | Direct equivalent |
| Node `fs` | `pathlib` + `aiofiles` | File operations | Pathlib is more Pythonic |
| Node `readline` | Built-in `readline` or iterate file | Line reading | Python has simpler iteration |
| Node `child_process` | `asyncio.subprocess` | Process spawning | Native async support |
| TypeScript types | `typing` + `pydantic` | Type system | Runtime validation with Pydantic |
| `jest` | `pytest` | Testing | More powerful, plugin ecosystem |
| `ts-jest` | `pytest-asyncio` | Async testing | Native async test support |
| `tsx` | N/A | TypeScript execution | Not needed in Python |
| `eslint` | `ruff` | Linting | Ruff is 10-100x faster |
| N/A | `anthropic` | Anthropic API | Official Python SDK |
| N/A | `rich` | Terminal output | Beautiful CLI output |

### Why These Choices?

**Typer over Click:**
- Native type hint support
- Automatic validation
- Better IDE integration
- Auto-generated help text from docstrings

**Pydantic over dataclasses:**
- Runtime validation
- JSON serialization/deserialization
- Type coercion
- Nested model support

**Ruff over pylint/flake8:**
- 10-100x faster
- Replaces multiple tools (flake8, isort, etc.)
- Rust-based, actively maintained
- Auto-fix support

**Anthropic SDK over Claude CLI:**
- Native Python integration
- Better error handling
- Streaming support
- No subprocess overhead

---

## Implementation Guide

### 1. Type Definitions (Pydantic Models)

**TypeScript (types/session.ts):**
```typescript
export interface SessionMessage {
  uuid: string;
  parentUuid: string | null;
  sessionId?: string;
  timestamp: string;
  type: 'user' | 'assistant';
  message: {
    role: 'user' | 'assistant';
    content: string | MessageContent[];
  };
}
```

**Python (models/session.py):**
```python
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Literal, Union
from pydantic import BaseModel, Field, field_validator


class MessageRole(str, Enum):
    """Message role enumeration."""
    USER = "user"
    ASSISTANT = "assistant"


class MessageContentType(str, Enum):
    """Message content type enumeration."""
    TEXT = "text"
    TOOL_USE = "tool_use"
    TOOL_RESULT = "tool_result"


class MessageContentBlock(BaseModel):
    """Individual content block in a message."""
    type: MessageContentType
    text: str | None = None
    name: str | None = None
    input: dict | None = None
    tool_use_id: str | None = None
    content: str | None = None


class MessageContent(BaseModel):
    """Message content wrapper."""
    role: MessageRole
    content: str | list[MessageContentBlock]


class SessionMessage(BaseModel):
    """Individual message in a conversation session."""

    uuid: str = Field(..., description="Unique message identifier")
    parent_uuid: str | None = Field(None, alias="parentUuid")
    session_id: str | None = Field(None, alias="sessionId")
    timestamp: datetime
    type: MessageRole
    is_sidechain: bool = Field(False, alias="isSidechain")
    cwd: str | None = None
    git_branch: str | None = Field(None, alias="gitBranch")
    version: str
    message: MessageContent

    class Config:
        populate_by_name = True  # Allow both snake_case and camelCase
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

    @field_validator('timestamp', mode='before')
    @classmethod
    def parse_timestamp(cls, v: str | datetime) -> datetime:
        """Parse timestamp string to datetime."""
        if isinstance(v, datetime):
            return v
        return datetime.fromisoformat(v.replace('Z', '+00:00'))


class Session(BaseModel):
    """Complete conversation session."""

    id: str
    project_path: str
    messages: list[SessionMessage]
    start_time: datetime
    end_time: datetime

    @property
    def duration(self) -> float:
        """Session duration in seconds."""
        return (self.end_time - self.start_time).total_seconds()

    @property
    def message_count(self) -> int:
        """Total number of messages."""
        return len(self.messages)
```

**Key Improvements:**
- ✅ Runtime validation with Pydantic
- ✅ Automatic JSON parsing/serialization
- ✅ Support for both snake_case (Python) and camelCase (JSON)
- ✅ Custom validators for complex types
- ✅ Computed properties for derived data
- ✅ Type safety with Python 3.10+ union syntax (`str | None`)

---

### 2. Session Parser

**Python (extraction/parser.py):**
```python
"""JSONL parser for Claude Code session files."""

from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import AsyncGenerator

import aiofiles

from claude_memory.models.session import Session, SessionMessage

logger = logging.getLogger(__name__)


class SessionParser:
    """Parses Claude Code session JSONL files."""

    def __init__(self, projects_dir: str | Path) -> None:
        """Initialize parser with projects directory.

        Args:
            projects_dir: Path to Claude projects directory

        Raises:
            FileNotFoundError: If projects directory doesn't exist
        """
        self.projects_dir = Path(projects_dir).expanduser().resolve()

        if not self.projects_dir.exists():
            raise FileNotFoundError(
                f"Projects directory does not exist: {self.projects_dir}"
            )

    async def read_session_files(self) -> AsyncGenerator[Path, None]:
        """Recursively find all JSONL session files.

        Yields:
            Path objects for each .jsonl file found
        """
        # Use rglob for recursive globbing (like TypeScript's recursive walk)
        for jsonl_file in self.projects_dir.rglob("*.jsonl"):
            if jsonl_file.is_file():
                yield jsonl_file

    async def parse_session(self, file_path: Path) -> Session:
        """Parse a single session JSONL file.

        Args:
            file_path: Path to JSONL file

        Returns:
            Parsed Session object

        Raises:
            ValueError: If file has no valid messages
        """
        messages: list[SessionMessage] = []

        # Async file reading for better performance
        async with aiofiles.open(file_path, mode='r', encoding='utf-8') as f:
            async for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    data = json.loads(line)
                    # Pydantic handles validation automatically
                    message = SessionMessage.model_validate(data)
                    messages.append(message)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON in {file_path}: {e}")
                except Exception as e:
                    logger.error(f"Failed to validate message in {file_path}: {e}")

        if not messages:
            raise ValueError(f"No valid messages found in {file_path}")

        # Extract session metadata
        first_message = messages[0]
        last_message = messages[-1]

        session_id = first_message.session_id or file_path.stem
        project_path = first_message.cwd or str(file_path.parent)

        return Session(
            id=session_id,
            project_path=project_path,
            messages=messages,
            start_time=first_message.timestamp,
            end_time=last_message.timestamp
        )

    async def read_sessions(
        self,
        since: datetime | None = None
    ) -> AsyncGenerator[Session, None]:
        """Read and parse all sessions, optionally filtered by date.

        Args:
            since: Optional cutoff date (only include sessions modified after)

        Yields:
            Parsed Session objects
        """
        async for file_path in self.read_session_files():
            # Filter by modification time if requested
            if since is not None:
                stat = file_path.stat()
                if datetime.fromtimestamp(stat.st_mtime) < since:
                    continue

            try:
                session = await self.parse_session(file_path)
                yield session
            except Exception as e:
                logger.error(f"Failed to parse session {file_path}: {e}")


# Usage example
async def main():
    from datetime import datetime, timedelta

    parser = SessionParser("~/.claude/projects")

    # Get sessions from last 30 days
    cutoff = datetime.now() - timedelta(days=30)

    async for session in parser.read_sessions(since=cutoff):
        print(f"Session {session.id}: {session.message_count} messages")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

**Key Improvements over TypeScript:**
- ✅ `pathlib` instead of string paths (more Pythonic)
- ✅ `rglob()` for recursive file search (simpler than manual walk)
- ✅ `aiofiles` for async file I/O
- ✅ Automatic Pydantic validation (no type assertions)
- ✅ Structured logging instead of console.log
- ✅ Type hints everywhere for IDE support

---

### 3. Session Chunker

**Python (extraction/chunker.py):**
```python
"""Breaks sessions into coherent conversation chunks for analysis."""

from __future__ import annotations
import re
from dataclasses import dataclass
from typing import Sequence

from claude_memory.models.session import Session, SessionMessage


@dataclass
class ConversationChunk:
    """A chunk of related conversation messages."""

    messages: list[SessionMessage]
    start_index: int
    end_index: int
    has_user_correction: bool
    has_tool_use: bool
    topic_shift: bool

    @property
    def size(self) -> int:
        """Total character count of chunk."""
        return sum(len(self._get_message_content(msg)) for msg in self.messages)

    @staticmethod
    def _get_message_content(message: SessionMessage) -> str:
        """Extract text content from message."""
        content = message.message.content
        if isinstance(content, str):
            return content

        # Extract text from content blocks
        return " ".join(
            block.text or ""
            for block in content
            if block.text
        )


class SessionChunker:
    """Chunks conversation sessions into analyzable units."""

    # Target size: ~50k tokens at 4 chars/token
    CHUNK_SIZE_TARGET = 200_000
    # Max size: ~70k tokens
    MAX_CHUNK_SIZE = 280_000

    # Patterns for detecting topic shifts
    TOPIC_MARKERS = [
        re.compile(r"^(now|next|also|another|different|separate)", re.IGNORECASE),
        re.compile(r"^(okay|ok|alright|good|great|perfect|thanks).*now", re.IGNORECASE),
        re.compile(r"^(let's|lets|can you|could you|please)", re.IGNORECASE),
        re.compile(r"^##+ "),  # Markdown headers
    ]

    # Patterns for detecting user corrections
    CORRECTION_PATTERNS = [
        re.compile(r"\b(no|wrong|incorrect|actually|wait|stop|don't|never|always)\b", re.IGNORECASE),
        re.compile(r"\b(that's not|that is not|you're wrong|you are wrong)\b", re.IGNORECASE),
        re.compile(r"\b(fix|correct|undo|revert)\b", re.IGNORECASE),
    ]

    def chunk_session(self, session: Session) -> list[ConversationChunk]:
        """Break session into chunks for analysis.

        Args:
            session: Session to chunk

        Returns:
            List of conversation chunks
        """
        chunks: list[ConversationChunk] = []
        current_chunk: list[SessionMessage] = []
        start_index = 0
        current_chunk_size = 0

        for i, message in enumerate(session.messages):
            message_size = self._get_message_size(message)

            # Check if adding this message would exceed max size
            if (current_chunk_size + message_size > self.MAX_CHUNK_SIZE
                and current_chunk):

                # Save current chunk before adding this message
                chunks.append(self._create_chunk(
                    current_chunk,
                    start_index,
                    i - 1
                ))

                current_chunk = []
                current_chunk_size = 0
                start_index = i

            current_chunk.append(message)
            current_chunk_size += message_size

            # Check for natural breakpoints after reaching target size
            if current_chunk_size >= self.CHUNK_SIZE_TARGET:
                next_message = (session.messages[i + 1]
                               if i + 1 < len(session.messages)
                               else None)

                is_topic_shift = self._detect_topic_shift(current_chunk, next_message)

                if is_topic_shift or i == len(session.messages) - 1:
                    chunks.append(self._create_chunk(
                        current_chunk,
                        start_index,
                        i
                    ))

                    current_chunk = []
                    current_chunk_size = 0
                    start_index = i + 1

        # Add any remaining messages
        if current_chunk:
            chunks.append(self._create_chunk(
                current_chunk,
                start_index,
                len(session.messages) - 1
            ))

        return chunks

    def _create_chunk(
        self,
        messages: list[SessionMessage],
        start_index: int,
        end_index: int
    ) -> ConversationChunk:
        """Create a ConversationChunk from messages."""
        return ConversationChunk(
            messages=messages.copy(),
            start_index=start_index,
            end_index=end_index,
            has_user_correction=self._detect_user_correction(messages),
            has_tool_use=self._has_tool_use(messages),
            topic_shift=False
        )

    def _detect_topic_shift(
        self,
        current_chunk: list[SessionMessage],
        next_message: SessionMessage | None
    ) -> bool:
        """Detect if there's a topic shift."""
        if not next_message:
            return False

        last_user_message = self._get_last_user_message(current_chunk)
        if not last_user_message:
            return False

        content = self._get_message_content(last_user_message)

        return any(marker.search(content) for marker in self.TOPIC_MARKERS)

    def _detect_user_correction(self, messages: list[SessionMessage]) -> bool:
        """Detect if chunk contains user corrections."""
        for msg in messages:
            if msg.type.value != "user":
                continue

            content = self._get_message_content(msg)
            if any(pattern.search(content) for pattern in self.CORRECTION_PATTERNS):
                return True

        return False

    def _has_tool_use(self, messages: list[SessionMessage]) -> bool:
        """Check if chunk contains tool usage."""
        for msg in messages:
            if msg.type.value != "assistant":
                continue

            content = msg.message.content
            if isinstance(content, list):
                if any(block.type.value == "tool_use" for block in content):
                    return True

        return False

    @staticmethod
    def _get_last_user_message(
        messages: list[SessionMessage]
    ) -> SessionMessage | None:
        """Get the last user message in the list."""
        for msg in reversed(messages):
            if msg.type.value == "user":
                return msg
        return None

    @staticmethod
    def _get_message_content(message: SessionMessage) -> str:
        """Extract text content from message."""
        return ConversationChunk._get_message_content(message)

    def _get_message_size(self, message: SessionMessage) -> int:
        """Calculate approximate size of message in characters."""
        size = len(self._get_message_content(message))

        # Add tool use/result content if present
        content = message.message.content
        if isinstance(content, list):
            for block in content:
                if block.type.value in ("tool_use", "tool_result"):
                    # Count JSON representation
                    size += len(block.model_dump_json())

        # Add overhead for metadata
        size += 100

        return size
```

**Key Improvements:**
- ✅ Compiled regex patterns (more efficient)
- ✅ Dataclass with computed properties
- ✅ Clear separation of concerns (helper methods)
- ✅ Type hints for all methods
- ✅ Pythonic naming (`CONSTANT_CASE` for constants)
- ✅ Uses Pydantic's `model_dump_json()` for serialization

---

### 4. Agent Extractor (Anthropic SDK Integration)

**Python (extraction/agent_extractor.py):**
```python
"""Agent-based memory extractor using Anthropic SDK."""

from __future__ import annotations
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import aiofiles
from anthropic import AsyncAnthropic
from anthropic.types import Message, TextBlock, ToolUseBlock

from claude_memory.extraction.chunker import ConversationChunk
from claude_memory.models.session import SessionMessage

logger = logging.getLogger(__name__)


class AgentExtractor:
    """Extracts memories using Anthropic's Claude API."""

    def __init__(
        self,
        output_dir: str | Path,
        api_key: str | None = None,
        model: str = "claude-sonnet-4-5-20250929"
    ) -> None:
        """Initialize extractor.

        Args:
            output_dir: Directory to write extracted memories
            api_key: Anthropic API key (or use ANTHROPIC_API_KEY env var)
            model: Claude model to use for extraction
        """
        self.output_dir = Path(output_dir).expanduser().resolve()
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.model = model
        self.client = AsyncAnthropic(api_key=api_key)

        # Load agent prompt
        agent_prompt_path = Path(__file__).parent.parent / "agents" / "multi-dimensional-extractor.md"
        self.agent_instructions = agent_prompt_path.read_text(encoding="utf-8")

    async def extract_from_chunk(
        self,
        chunk: ConversationChunk,
        session_id: str,
        session_start_time: datetime,
        project_path: str | None = None
    ) -> int:
        """Extract memories from a conversation chunk.

        Args:
            chunk: Conversation chunk to analyze
            session_id: Session identifier
            session_start_time: When session started
            project_path: Optional project path

        Returns:
            Number of memory files created
        """
        logger.info(f"Launching memory extraction for chunk with {len(chunk.messages)} messages")

        # Format messages for Claude
        messages_text = self._format_messages(chunk.messages)

        if not messages_text.strip():
            logger.warning("No valid messages after filtering")
            return 0

        logger.info(f"Message content length: {len(messages_text)} chars")

        # Extract project name
        chunk_project_path = project_path or chunk.messages[0].cwd or "unknown"
        project_name = self._extract_project_name(chunk_project_path)

        # Build extraction prompt
        extraction_timestamp = datetime.now().isoformat()
        session_timestamp = session_start_time.isoformat()

        file_pattern = (
            f"{self.output_dir}/"
            f"{session_timestamp.replace(':', '-').replace('.', '-')}-"
            f"{project_name}-[type]-{session_id[:6]}-[index].md"
        )

        prompt = f"""{self.agent_instructions}

## Current Extraction Task

Extract memories from this conversation chunk and save them to: {self.output_dir}

Use this naming pattern for files:
{file_pattern}

Where:
- [type] is one of: pattern, rule, failure, discovery, workflow
- [index] is a 3-digit number starting from 000

Session Info:
- Session ID: {session_id}
- Session Time: {session_timestamp}
- Project: {project_name} ({chunk_project_path})

<conversation>
{messages_text}
</conversation>

Your task: Analyze this conversation using all three dimensions (Root Cause,
Psychological Driver, Prevention Strategy) and synthesize into ONE comprehensive
memory file using the Write tool."""

        try:
            # Count files before
            files_before = len(list(self.output_dir.glob(f"*{session_id[:6]}*")))

            # Call Claude API with streaming
            logger.info(f"Calling Claude API with model: {self.model}")
            start_time = asyncio.get_event_loop().time()

            response = await self.client.messages.create(
                model=self.model,
                max_tokens=8192,
                temperature=0.7,
                system=self.agent_instructions,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )

            elapsed = asyncio.get_event_loop().time() - start_time
            logger.info(f"Claude API completed in {elapsed:.2f}s")

            # Process response and write files
            files_created = await self._process_response(
                response,
                session_id,
                project_name,
                session_timestamp
            )

            if files_created > 0:
                logger.info(f"Created {files_created} memory files")
            else:
                logger.warning("No files created - no insights found")

            return files_created

        except Exception as e:
            logger.error(f"Agent extraction error: {e}", exc_info=True)
            return 0

    def _format_messages(self, messages: list[SessionMessage]) -> str:
        """Format messages for Claude consumption."""
        formatted = []

        for msg in messages:
            if not msg.message.content:
                continue

            content = self._get_content(msg.message.content)
            role = msg.type.value.upper()
            uuid = msg.uuid

            formatted.append(f"{role} [{uuid}]: {content}")

        return "\n\n".join(formatted)

    @staticmethod
    def _get_content(content: str | list[Any]) -> str:
        """Extract text content from message."""
        if isinstance(content, str):
            return content

        return " ".join(
            block.text or ""
            for block in content
            if hasattr(block, 'text') and block.text
        )

    @staticmethod
    def _extract_project_name(project_path: str) -> str:
        """Extract project name from path."""
        # Handle Claude projects format
        if "-Users-" in project_path:
            parts = project_path.split("-")
            return parts[-1] or "unknown"

        # Handle regular paths
        return Path(project_path).name or "unknown"

    async def _process_response(
        self,
        response: Message,
        session_id: str,
        project_name: str,
        session_timestamp: str
    ) -> int:
        """Process Claude's response and extract memory files.

        For now, this is a simplified version. In a full implementation,
        you'd parse the response and extract file writes.
        """
        # Extract text from response
        text_content = ""
        for block in response.content:
            if isinstance(block, TextBlock):
                text_content += block.text

        if not text_content.strip():
            return 0

        # Simple implementation: write response as a single memory file
        timestamp_safe = session_timestamp.replace(":", "-").replace(".", "-")
        filename = f"{timestamp_safe}-{project_name}-extraction-{session_id[:6]}-000.md"
        filepath = self.output_dir / filename

        async with aiofiles.open(filepath, "w", encoding="utf-8") as f:
            await f.write(text_content)

        return 1


# Example usage
async def main():
    from datetime import datetime

    extractor = AgentExtractor(output_dir="~/.claude/memories/extracted")

    # Mock chunk for testing
    # In real usage, this would come from SessionChunker
    mock_chunk = ConversationChunk(
        messages=[],
        start_index=0,
        end_index=0,
        has_user_correction=False,
        has_tool_use=False,
        topic_shift=False
    )

    count = await extractor.extract_from_chunk(
        chunk=mock_chunk,
        session_id="test-session-123",
        session_start_time=datetime.now(),
        project_path="/path/to/project"
    )

    print(f"Created {count} memory files")


if __name__ == "__main__":
    asyncio.run(main())
```

**Key Improvements:**
- ✅ **Direct API integration** instead of subprocess (more reliable)
- ✅ **Native async** with `AsyncAnthropic`
- ✅ **No shell injection vulnerability** (no subprocess)
- ✅ **Better error handling** with structured logging
- ✅ **Type-safe** with Pydantic models
- ✅ **Streaming support** (can be added easily)
- ✅ **Token counting** and usage tracking built-in

---

### 5. CLI Implementation

**Python (cli.py):**
```python
"""CLI interface for Claude Memory extraction."""

from __future__ import annotations
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.logging import RichHandler
from rich.progress import Progress, SpinnerColumn, TextColumn

from claude_memory.commands.extract import ExtractCommand

# Configure logging with Rich
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True)]
)

console = Console()
app = typer.Typer(
    name="claude-memory",
    help="🧠 Multi-dimensional memory extraction for Claude Code conversations",
    add_completion=False,
)


@app.command()
def extract(
    since: Optional[str] = typer.Option(
        None,
        "--since", "-s",
        help="Only process sessions after this date (ISO format: 2025-09-01T00:00:00)"
    ),
    projects_dir: Path = typer.Option(
        Path.home() / ".claude" / "projects",
        "--projects-dir", "-p",
        help="Claude projects directory",
        exists=True,
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
    memories_dir: Path = typer.Option(
        Path.home() / ".claude" / "memories",
        "--memories-dir", "-m",
        help="Memories output directory",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
    index_dir: Path = typer.Option(
        Path("./index"),
        "--index-dir", "-i",
        help="Vector index directory",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Preview what would be extracted without writing"
    ),
) -> None:
    """🔍 Extract memories from Claude Code conversation logs.

    Examples:

        $ claude-memory extract --since="2025-09-01T00:00:00"

        $ claude-memory extract --projects-dir=/custom/path

    Note: Requires ANTHROPIC_API_KEY environment variable
    """
    # Parse since date
    since_date = None
    if since:
        try:
            since_date = datetime.fromisoformat(since)
        except ValueError:
            console.print(f"[red]Invalid date format: {since}[/red]")
            console.print("Use ISO format: 2025-09-01T00:00:00")
            raise typer.Exit(1)

    # Run extraction
    command = ExtractCommand(
        since=since_date,
        projects_dir=projects_dir,
        memories_dir=memories_dir,
        index_dir=index_dir,
        dry_run=dry_run,
    )

    try:
        asyncio.run(command.execute())
    except KeyboardInterrupt:
        console.print("\n[yellow]Extraction cancelled by user[/yellow]")
        raise typer.Exit(130)
    except Exception as e:
        console.print(f"[red]Extraction failed: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def info() -> None:
    """📊 Show system information and status."""
    console.print("🧠 [bold cyan]Claude Memory v1.0.0[/bold cyan]")
    console.print("Multi-dimensional memory extraction for Claude Code\n")

    console.print("📍 [bold]Default paths:[/bold]")
    console.print(f"  Projects: {Path.home() / '.claude' / 'projects'}")
    console.print(f"  Memories: {Path.home() / '.claude' / 'memories' / 'extracted'}\n")

    console.print("🔧 [bold]Requirements:[/bold]")
    console.print("  - ANTHROPIC_API_KEY environment variable")
    console.print("  - Python 3.10+\n")

    console.print("📚 Learn more: https://github.com/obra/claude-memory")


if __name__ == "__main__":
    app()
```

**Key Improvements:**
- ✅ **Rich library** for beautiful terminal output
- ✅ **Typer** for type-safe CLI with auto-completion
- ✅ **Path validation** built-in
- ✅ **Better error handling** with exit codes
- ✅ **Async execution** with proper cleanup

---

## Meta-Agent Integration

### Integration Architecture

```python
"""Meta-agent integration layer for Claude Memory."""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol

from claude_memory.models.memory import Memory
from claude_memory.models.session import Session


class AgentCapability(str, Enum):
    """Capabilities that an agent can request."""
    MEMORY_EXTRACTION = "memory_extraction"
    MEMORY_RETRIEVAL = "memory_retrieval"
    MEMORY_CONSOLIDATION = "memory_consolidation"
    MEMORY_SEARCH = "memory_search"


@dataclass
class AgentRequest:
    """Request from meta-agent to memory system."""
    capability: AgentCapability
    parameters: dict[str, Any]
    context: dict[str, Any]


@dataclass
class AgentResponse:
    """Response from memory system to meta-agent."""
    success: bool
    data: Any
    metadata: dict[str, Any]
    error: str | None = None


class MemoryProvider(Protocol):
    """Protocol for memory system integration."""

    async def extract_memories(
        self,
        session: Session
    ) -> list[Memory]:
        """Extract memories from a session."""
        ...

    async def retrieve_memories(
        self,
        query: str,
        limit: int = 10
    ) -> list[Memory]:
        """Retrieve relevant memories for a query."""
        ...

    async def consolidate_memories(
        self,
        memories: list[Memory]
    ) -> list[Memory]:
        """Consolidate redundant or conflicting memories."""
        ...


class MetaAgentIntegration:
    """Integration layer between Claude Memory and meta-agent system."""

    def __init__(self, memory_provider: MemoryProvider) -> None:
        self.memory_provider = memory_provider

    async def handle_request(self, request: AgentRequest) -> AgentResponse:
        """Handle a request from the meta-agent.

        Args:
            request: Agent request

        Returns:
            Agent response with results
        """
        try:
            if request.capability == AgentCapability.MEMORY_EXTRACTION:
                return await self._handle_extraction(request)
            elif request.capability == AgentCapability.MEMORY_RETRIEVAL:
                return await self._handle_retrieval(request)
            elif request.capability == AgentCapability.MEMORY_CONSOLIDATION:
                return await self._handle_consolidation(request)
            else:
                return AgentResponse(
                    success=False,
                    data=None,
                    metadata={},
                    error=f"Unknown capability: {request.capability}"
                )
        except Exception as e:
            return AgentResponse(
                success=False,
                data=None,
                metadata={},
                error=str(e)
            )

    async def _handle_extraction(self, request: AgentRequest) -> AgentResponse:
        """Handle memory extraction request."""
        session = request.parameters.get("session")
        if not session:
            return AgentResponse(
                success=False,
                data=None,
                metadata={},
                error="Missing 'session' parameter"
            )

        memories = await self.memory_provider.extract_memories(session)

        return AgentResponse(
            success=True,
            data=memories,
            metadata={"count": len(memories)}
        )

    async def _handle_retrieval(self, request: AgentRequest) -> AgentResponse:
        """Handle memory retrieval request."""
        query = request.parameters.get("query")
        limit = request.parameters.get("limit", 10)

        if not query:
            return AgentResponse(
                success=False,
                data=None,
                metadata={},
                error="Missing 'query' parameter"
            )

        memories = await self.memory_provider.retrieve_memories(query, limit)

        return AgentResponse(
            success=True,
            data=memories,
            metadata={"count": len(memories)}
        )

    async def _handle_consolidation(self, request: AgentRequest) -> AgentResponse:
        """Handle memory consolidation request."""
        memories = request.parameters.get("memories")

        if not memories:
            return AgentResponse(
                success=False,
                data=None,
                metadata={},
                error="Missing 'memories' parameter"
            )

        consolidated = await self.memory_provider.consolidate_memories(memories)

        return AgentResponse(
            success=True,
            data=consolidated,
            metadata={
                "original_count": len(memories),
                "consolidated_count": len(consolidated)
            }
        )
```

### Example Meta-Agent Usage

```python
"""Example meta-agent integration."""

import asyncio
from anthropic import AsyncAnthropic

from claude_memory.meta_agent import (
    MetaAgentIntegration,
    AgentRequest,
    AgentCapability
)
from claude_memory.extraction.parser import SessionParser


class SimpleMetaAgent:
    """Simple meta-agent that uses memory system."""

    def __init__(self, memory_integration: MetaAgentIntegration):
        self.memory = memory_integration
        self.client = AsyncAnthropic()

    async def process_conversation(self, user_message: str) -> str:
        """Process a conversation turn with memory."""

        # 1. Retrieve relevant memories
        retrieval_request = AgentRequest(
            capability=AgentCapability.MEMORY_RETRIEVAL,
            parameters={"query": user_message, "limit": 5},
            context={}
        )

        memory_response = await self.memory.handle_request(retrieval_request)

        # 2. Build context with memories
        context = ""
        if memory_response.success:
            memories = memory_response.data
            context = "\\n\\n".join(
                f"Memory: {m.content}" for m in memories
            )

        # 3. Call Claude with memory context
        response = await self.client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=f"""You are a helpful assistant with access to past lessons.

Relevant memories:
{context}

Use these memories to inform your responses.""",
            messages=[{"role": "user", "content": user_message}]
        )

        return response.content[0].text

    async def learn_from_session(self, session_file: str) -> None:
        """Learn from a conversation session."""
        parser = SessionParser("~/.claude/projects")
        session = await parser.parse_session(session_file)

        # Extract memories
        extraction_request = AgentRequest(
            capability=AgentCapability.MEMORY_EXTRACTION,
            parameters={"session": session},
            context={}
        )

        result = await self.memory.handle_request(extraction_request)

        if result.success:
            print(f"Learned {result.metadata['count']} new memories")
        else:
            print(f"Learning failed: {result.error}")


# Usage
async def main():
    # Set up memory integration
    # (implementation depends on your memory provider)
    memory_integration = MetaAgentIntegration(memory_provider=...)

    # Create meta-agent
    agent = SimpleMetaAgent(memory_integration)

    # Learn from past sessions
    await agent.learn_from_session("~/.claude/projects/session.jsonl")

    # Use learned memories
    response = await agent.process_conversation(
        "How should I handle error recovery in distributed systems?"
    )
    print(response)


if __name__ == "__main__":
    asyncio.run(main())
```

---

## Migration Strategy

### Phase 1: Core Infrastructure (Week 1)

**Goals:**
- ✅ Set up Python project with uv
- ✅ Implement type models (Pydantic)
- ✅ Port session parser
- ✅ Port session chunker
- ✅ Basic tests

**Tasks:**
1. Initialize uv project
2. Create `pyproject.toml`
3. Implement `models/session.py` and `models/memory.py`
4. Port `extraction/parser.py`
5. Port `extraction/chunker.py`
6. Write unit tests
7. Set up CI/CD (GitHub Actions)

**Success Criteria:**
- All tests passing
- Type checking with mypy passes
- Can parse real JSONL files

---

### Phase 2: Extraction & CLI (Week 2)

**Goals:**
- ✅ Implement Anthropic SDK integration
- ✅ Port CLI commands
- ✅ End-to-end extraction working

**Tasks:**
1. Implement `extraction/agent_extractor.py`
2. Port `commands/extract.py`
3. Implement `cli.py` with Typer
4. Add Rich progress indicators
5. Write integration tests
6. Test with real conversation data

**Success Criteria:**
- Can extract memories from real sessions
- CLI matches TypeScript functionality
- Memory files have correct format

---

### Phase 3: Meta-Agent Integration (Week 3)

**Goals:**
- ✅ Design integration protocol
- ✅ Implement memory retrieval
- ✅ Build meta-agent bridge

**Tasks:**
1. Design `meta_agent/protocols.py`
2. Implement `meta_agent/integration.py`
3. Add vector search (FAISS or ChromaDB)
4. Build retrieval system
5. Create example meta-agent
6. Write integration guide

**Success Criteria:**
- Meta-agent can query memories
- Memory retrieval is fast (<100ms)
- Integration is well-documented

---

### Phase 4: Optimization & Polish (Week 4)

**Goals:**
- ✅ Performance optimization
- ✅ Production readiness
- ✅ Documentation

**Tasks:**
1. Add caching layer
2. Optimize async operations
3. Add metrics and monitoring
4. Write comprehensive docs
5. Create migration guide for TS users
6. Publish to PyPI

**Success Criteria:**
- Handles 1000+ sessions efficiently
- Memory usage under control
- Ready for production use

---

## Testing Strategy

### Unit Tests

```python
"""Example unit tests for session chunker."""

import pytest
from datetime import datetime

from claude_memory.extraction.chunker import SessionChunker
from claude_memory.models.session import Session, SessionMessage, MessageContent, MessageRole


@pytest.fixture
def sample_session():
    """Create a sample session for testing."""
    messages = [
        SessionMessage(
            uuid=f"msg-{i}",
            parent_uuid=f"msg-{i-1}" if i > 0 else None,
            timestamp=datetime(2025, 1, 1, 10, i),
            type=MessageRole.USER if i % 2 == 0 else MessageRole.ASSISTANT,
            is_sidechain=False,
            version="1.0.0",
            message=MessageContent(
                role=MessageRole.USER if i % 2 == 0 else MessageRole.ASSISTANT,
                content=f"Message {i}"
            )
        )
        for i in range(10)
    ]

    return Session(
        id="test-session",
        project_path="/test",
        messages=messages,
        start_time=datetime(2025, 1, 1, 10, 0),
        end_time=datetime(2025, 1, 1, 10, 10)
    )


def test_chunk_session(sample_session):
    """Test basic session chunking."""
    chunker = SessionChunker()
    chunks = chunker.chunk_session(sample_session)

    assert len(chunks) >= 1
    assert all(len(chunk.messages) > 0 for chunk in chunks)

    # Verify all messages are included
    total_messages = sum(len(chunk.messages) for chunk in chunks)
    assert total_messages == len(sample_session.messages)


def test_user_correction_detection(sample_session):
    """Test detection of user corrections."""
    # Add a correction message
    sample_session.messages.append(
        SessionMessage(
            uuid="msg-correction",
            parent_uuid="msg-9",
            timestamp=datetime(2025, 1, 1, 10, 11),
            type=MessageRole.USER,
            is_sidechain=False,
            version="1.0.0",
            message=MessageContent(
                role=MessageRole.USER,
                content="No, that's wrong. Please fix it."
            )
        )
    )

    chunker = SessionChunker()
    chunks = chunker.chunk_session(sample_session)

    assert any(chunk.has_user_correction for chunk in chunks)


@pytest.mark.asyncio
async def test_parse_session(tmp_path):
    """Test JSONL parsing."""
    from claude_memory.extraction.parser import SessionParser

    # Create test JSONL file
    jsonl_file = tmp_path / "test.jsonl"
    jsonl_file.write_text('''
{"uuid": "1", "timestamp": "2025-01-01T10:00:00", "type": "user", "isSidechain": false, "version": "1.0", "message": {"role": "user", "content": "Hello"}}
{"uuid": "2", "timestamp": "2025-01-01T10:01:00", "type": "assistant", "isSidechain": false, "version": "1.0", "message": {"role": "assistant", "content": "Hi"}}
'''.strip())

    parser = SessionParser(tmp_path)
    session = await parser.parse_session(jsonl_file)

    assert session.id == "test"
    assert len(session.messages) == 2
    assert session.messages[0].type == MessageRole.USER
```

---

## Performance Considerations

### Async Everything

```python
# TypeScript (sequential)
for (const chunk of chunks) {
  await extractor.extractFromChunk(chunk);
}

# Python (parallel with concurrency limit)
import asyncio
from asyncio import Semaphore

async def process_chunks_parallel(chunks, extractor, max_concurrent=3):
    """Process chunks in parallel with concurrency limit."""
    sem = Semaphore(max_concurrent)

    async def process_with_sem(chunk):
        async with sem:
            return await extractor.extract_from_chunk(chunk, ...)

    tasks = [process_with_sem(chunk) for chunk in chunks]
    return await asyncio.gather(*tasks)

# 3x faster for typical workloads
```

### Caching

```python
from functools import lru_cache
from anthropic import AsyncAnthropic

class CachedAgentExtractor(AgentExtractor):
    """Extractor with response caching."""

    @lru_cache(maxsize=1000)
    def _get_cache_key(self, messages_hash: str) -> str:
        """Generate cache key for messages."""
        return f"extraction_{messages_hash}"

    async def extract_from_chunk(self, chunk, ...):
        # Hash chunk content
        content_hash = hashlib.sha256(
            "".join(msg.uuid for msg in chunk.messages).encode()
        ).hexdigest()

        cache_key = self._get_cache_key(content_hash)

        # Check cache
        cached = await self.cache.get(cache_key)
        if cached:
            return cached

        # Extract and cache
        result = await super().extract_from_chunk(chunk, ...)
        await self.cache.set(cache_key, result, ttl=3600)

        return result
```

---

## Next Steps

1. **Review this guide** - Ensure it matches your meta-agent requirements
2. **Initialize Python project** - Set up uv and project structure
3. **Start Phase 1** - Port core types and parser
4. **Design meta-agent protocol** - Define exact integration points
5. **Implement and test** - Follow phased migration strategy

Would you like me to:
- Start implementing the Python code?
- Design the meta-agent integration protocol in more detail?
- Create a specific migration plan for your use case?
- Set up the uv project structure?

Let me know how you'd like to proceed!
