# Agent Guidelines

After implementing every new feature or change in this workspace, you must commit the changed files to the Git repository.

## Git Commit Rules & Granularity

To ensure robust version control and allow clean, painless rollbacks of specific features, follow these strict rules for commit granularity:

1. **Atomic & Incremental Commits:**
   * Every commit must represent exactly **one** single, logical, and self-contained change.
   * **Do not** group unrelated changes (such as structural CSS grid changes, HTML dropdown adjustments, and icon sizing scaling) into a single large commit.
   * Commit incrementally. If a feature has multiple development phases (e.g., Phase 1: Grid structural changes, Phase 2: Proportion scaling, Phase 3: HTML dropdown adjustments), create a separate commit at the end of **each** phase.

2. **Commit Message Format:**
   * Always write commit messages briefly, clearly, and in **English**.
   * Use Conventional Commit prefixes to easily identify the type of change:
     * `feat:` for new features (e.g., adding a new option or control).
     * `fix:` for bug fixes (e.g., fixing a layout override).
     * `style:` for style-only changes (e.g., adjusting margins, colors, centering, sizes).
     * `refactor:` for code restructuring without changing behavior.

3. **No Over-Amending:**
   * Avoid abusing `git commit --amend` to squish separate development steps or feedback loops into one commit, unless explicitly asked. Keeping separate commits for feedback iterations ensures we can easily jump back to a previous state if a design direction is rejected.

4. **Verify Before Committing:**
   * Double-check files for layout regressions or syntax issues before committing.
