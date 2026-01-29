# Brainstorming: Multi-Framework Mesh Harmonization

**Goal**: Move beyond "Point-to-Point" (Source->Target) mapping to a "Mesh" (Many-to-Many) where all related controls are interlinked automatically.

## The Challenge
Currently, if you map `ISO 27001` -> `SOC 2` and `ISO 27001` -> `PCI-DSS`:
-   **ISO <-> SOC** works.
-   **ISO <-> PCI** works.
-   **SOC <-> PCI** does *not* explicitly exist.

If a client only cares about SOC and PCI, they won't benefit from the ISO work unless they also implement ISO.

## The Solution: "Infinite Transitivity" (Cluster Logic)

Instead of individual links, we treat mappings as "Glue" that binds controls into **Universal Clusters**.

### Logic: Connected Components
If Control A is equivalent to Control B, and A is equivalent to C, then **A, B, and C form a Cluster**.

-   **Cluster 1**: { `ISO A.5.15`, `SOC CC6.1`, `PCI 8.1`, `HIPAA 164.312` }
-   **Cluster 2**: { `ISO A.8.2`, `SOC CC6.2` }

### Benefits
1.  **No Extra Work**: You only mapped ISO->SOC and ISO->PCI. The system *inferred* SOC->PCI.
2.  **Omni-Directional**: If a client marks **PCI 8.1** as "Implemented", the system sees it belongs to **Cluster 1**. It instantly marks ISO, SOC, and HIPAA as "Implemented" too.
3.  **Self-Healing**: If you add a new framework (e.g. NIST) and map it to *just* ISO, it automatically joins the cluster and links to SOC, PCI, etc.

## Proposed Algorithm (The "Mesh Engine")

1.  **Ingest Mappings**: Read all `equivalent` mappings from the database.
2.  **Build Graph**: Create an in-memory graph where controls are nodes and mappings are edges.
3.  **Resolve Clusters**: Run a "Connected Components" algorithm (BFS/DFS) to group related nodes into unique Cluster IDs.
4.  **Runtime Check**:
    -   When fetching Client Controls, we check if *any* control in the same Cluster has `status = 'implemented'`.
    -   If yes, **inherit status**.

## "Related" vs "Equivalent"
-   **Equivalent (Strong Mesh)**: Fully transitive. Status propagates to everyone in the cluster.
-   **Related (Weak Mesh)**: Direct neighbors only. Status propagates only 1 hop.
    -   *Logic*: Being "Related" to a "Related" control is too dilute (Telephone game problem).

## UI Implications
-   **Visualization**: We can show a "Cluster View" in the control details: *"This control is linked to 5 other frameworks via the Mesh."*
-   **Traceability**: "Implemented via `PCI-DSS 8.1` (Indirect Link)".

## Recommendation
Implement **Transitive Clustering** for `equivalent` mappings. This achieves the "Mesh" effect without creating N*N database rows.
