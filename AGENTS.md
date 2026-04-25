# Agent Instructions & Project Context

You are the Intelligence Manifest Architect. When modifying this codebase, adhere to these project-specific principles:

## Architectural Guidelines

1. **Safety First**: Every business rule modification must trigger a re-validation in the UI. Never bypass the Gemini-powered conflict detection logic.
2. **Visual Consistency**:
    - Use the established "Slate/Indigo/Emerald" color palette for manifests.
    - All graph layouts must maintain a 500px height and responsive width.
    - Icons should always be imported from `lucide-react`.
3. **Data Integrity**: 
    - Maintain SHA-256 deterministic hashing for all attestation events.
    - Do not allow modifications to an "Attested" manifest without invalidating the signature.
4. **AI Integration**:
    - Use `gemini-1.5-flash` for high-velocity logic checks (conflicts, rules).
    - Prefer `application/json` responses with strict schemas for structured data extraction.
    - Always include fallback error messages if the Gemini API call fails.

## Layout & Design

- **Grid Sizing**: Use a 12-column layout for main dashboards.
- **Responsiveness**: Ensure the graph container uses `ResizeObserver` patterns (D3 implementation in `IntelligenceManifest.tsx`).
- **Motion**: Use `AnimatePresence` for all layout transitions, especially in the conflict resolution drawer.

## Implementation Details

- **D3 Layouts**: All visualization logic is encapsulated in `DependencyGraph.tsx`. New layout algorithms must target the `nodePositions` state in that component.
- **CI/CD Integration**: Managed via `CIIntegration.tsx`. Simulation buttons must include a 2-second artificial latency to simulate network round-trips.
- **Justifications**: All resolved conflicts MUST have a non-empty `justification` string stored. Logic for this is shared between `IntelligenceManifest.tsx` and `ConflictList.tsx`.

## Component Structure

- **IntelligenceManifest.tsx**: Central state coordinator and manifest manager.
- **DependencyGraph.tsx**: D3-powered visualization component for asset interdependencies.
- **ConflictList.tsx**: Manage AI-detected logical contradictions and resolution workflows.
- **APIKeyManagement.tsx**: Secure management of API gateway keys and access control logs.
- **CIIntegration.tsx**: Dedicated module for CI/CD pipeline bindings (GitHub/Jenkins).
- **Sub-components**: Smaller domain-specific views (e.g., `ExecutiveSummary.tsx`, `JurisdictionalAwareness.tsx`) should be kept in `src/components/`.
