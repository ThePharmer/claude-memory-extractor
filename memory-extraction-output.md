---
id: "mem-2025-08-29T15-57-13-637Z-ad2d1b-000"
created: "2025-08-29T15:57:13.637Z"
confidence: 4.0
certainty_reasoning: "Clear workflow demonstrated with explicit scope definition and discovery process, but final question suggests potential scope gaps"
trigger: "When refactoring multiple files or large-scale code changes"
tags: ["project:openrouter", "type:workflow", "domain:process"]
source:
  session: "ad2d1b18-d1d1-4253-94d6-157e4a0455e6"
---

# Always Verify Complete Scope Before Large Refactoring Tasks

Claude successfully refactored 19 E2E test files to use helper patterns, but Jesse's final question "can you also update the other e2e tests?" suggests there were additional files not included in the original scope.

## Root Cause Analysis

Surface: Jesse asked about "other e2e tests" after completion
↓ Why? There were apparently more E2E test files beyond the 19 updated
↓ Why? Claude didn't discover or verify the complete scope upfront
↓ Why? Focused on the provided file list without comprehensive discovery
↓ Why? Assumed the initial scope was complete without verification
**Root:** Insufficient scope discovery phase before beginning large refactoring tasks

## Psychological Driver

**Hidden motivation:** Eagerness to begin productive work and show progress
**Fear:** That asking too many clarifying questions would seem inefficient
**Compensatory behavior:** Diving into implementation based on initial requirements
**Defense mechanism:** Assuming provided scope is complete to avoid seeming overly cautious

The drive to "just start working" on the clear technical task overrode the systematic verification of complete scope.

## Prevention Strategy

**Gate Function:**
```
BEFORE starting large refactoring (>5 files):
  Check: "Have I discovered ALL files in scope?"
  Action: Run comprehensive search for similar files
  Verify: Ask user "Are there other [X] files I should include?"
  If uncertain: List found files and ask for confirmation
```

## Why This Matters

Prevents "almost done" scenarios where additional work surfaces after completion. Saves time by batching all related changes together. Avoids fragmented refactoring where some files use old patterns while others use new ones.

## When To Apply

- Refactoring multiple files with similar patterns
- Large-scale code transformations
- When provided with a specific file list for systematic changes
- Any task involving "update all [X]" scenarios

## Epistemic Humility Notes

**Confidence:** 4/5 - Clear workflow lesson with good supporting evidence
**Assumptions:** That comprehensive scope discovery is always better (generally true, rare exceptions for time constraints)
**Alternative interpretations:** Jesse might have intentionally held back some files to test the pattern first
**Uncertainty:** Whether this was a scope gap or intentional phased approach
**Lesson type:** Methodology - focuses on HOW to approach large refactoring tasks, not the technical implementation details

The lesson is about process improvement (comprehensive scope discovery) rather than technical specifics of the E2E test refactoring itself.