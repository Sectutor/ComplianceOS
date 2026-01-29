I will implement **AI-Powered Automatic Control Harmonization** with the following components:

### 1. AI-Driven Auto-Mapping (Server-Side)
I will upgrade the `autoMapControls` procedure in `server/routers/compliance.ts` to use **Semantic Vector Embeddings** instead of simple keyword matching.

- **Process**:
  1.  **Generate/Fetch Embeddings**: For each control in the Source and Target frameworks, I will retrieve its vector embedding.
      - I will use the `LLMService.getEmbeddings()` method.
      - To optimize performance and cost, I will cache these embeddings in the `embeddings` database table (checking if one already exists for the control before calling the API).
  2.  **Semantic Comparison**: I will calculate the **Cosine Similarity** between the control vectors. This allows the system to understand that "Access Control Policy" and "Authentication Standard" are semantically related even if they share few words.
  3.  **Auto-Link**:
      - **High Confidence (>85%)**: Automatically create an "equivalent" mapping in `control_mappings`.
      - **Medium Confidence (>75%)**: Automatically create a "related" mapping.
  4.  **Persistence**: The function will now accept a `save: true` flag to persist these findings to the database immediately.

### 2. Dynamic Status Propagation (Client-Side Trigger)
I will modify the `update` mutation in `server/routers/clientControls.ts` to ensure "Test Once, Comply Many".

- **Logic**:
  1.  When a user updates a control's status (e.g., to "Implemented"), the system will identify the underlying Master Control ID.
  2.  It will query the `control_mappings` table to find all semantically linked controls (mapped via the AI process above).
  3.  It will automatically update the status, evidence, and notes of the corresponding controls in other frameworks for that specific client.
  4.  A system note `(Auto-synced from [Framework] [Control ID])` will be appended for audit trails.

### Implementation Steps
1.  **Update `server/routers/compliance.ts`**: Implement the embedding-based matching logic and persistence.
2.  **Update `server/routers/clientControls.ts`**: Implement the status propagation trigger.
