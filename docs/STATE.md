# Project State

- Task: Implement the draw.io editor in the architectures window.
- Status: In Progress
- Last Updated: Friday, January 30, 2026

## Workflow Step: Check Architectures
- Status: Completed. Found `sample-architecture.drawio` in `docs/architectures/`.
- Last Updated: Thursday, January 29, 2026

## Strategy for Handling Optional Functional and Non-Functional Requirements

### Documentation Strategy:

*   **Requirements Documentation (e.g., `docs/STATE.md`, `docs/BACKLOG.md`):**
    *   Explicitly label optional functional and non-functional requirements with clear tags (e.g., `[OPTIONAL]`, `[CONFIGURABLE]`, `[TIERED]`).
    *   For each optional requirement, specify:
        *   **Condition for Activation:** How it's turned on/off (e.g., config flag, environment variable, user setting).
        *   **Impact:** What changes when it's active/inactive.
        *   **Priority/Justification:** Why it's optional (e.g., future release, performance impact, specific user segment).
*   **Architectural Documentation (e.g., `docs/architectures/`):**
    *   Document optional features that significantly impact the architecture. Highlight extension points or modular boundaries.
*   **Code Comments:**
    *   Add comments to code related to optional features, explaining purpose, control, and dependencies.
*   **`overknight.config.json` Documentation:**
    *   Maintain a clear schema or inline comments for `overknight.config.json` explaining each configuration option, especially those enabling/disabling optional features or setting non-functional parameters.

### Enforcement Strategy:

*   **Leverage Existing Configuration:** Continue to use JSON-based configuration files and boolean flags for controlling optionality.
*   **Validation:** Implement schema validation for configuration files to ensure correct specification of optional parameters.
*   **Runtime Checks:** Ensure code paths dependent on optional features perform appropriate checks against the configuration.
*   **Testing:**
    *   Write unit and integration tests covering both enabled and disabled states of optional features.
    *   Implement automated performance tests for optional non-functional requirements when active.
*   **Code Review:** During code reviews, ensure optional features adhere to modularity and are properly controlled by configuration.
*   **Environment Variables:** Utilize environment variables for optional non-functional requirements that vary per deployment environment.
