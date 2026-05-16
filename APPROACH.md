# Approach

## Goal

The project is a chat-based layout transformation agent. A user sends a natural-language instruction, the backend turns it into layout transform intents, and the frontend displays the updated JSON plus a lightweight wireframe preview.

## Prompt and Reasoning

The system prompt explains the design JSON structure, including the artboard, absolute coordinates, normalized coordinates, node types, and semantic roles such as headline, product, and offer badge. The LLM is asked to return only a small JSON object containing transform intents rather than a full rewritten layout.

## Safe JSON Transformation

The backend applies all coordinate math in code. This keeps risky operations predictable:

- Artboard resizing recomputes child positions from `nx`, `ny`, `nw`, and `nh`.
- Moving nodes updates both absolute and normalized positions.
- Resizing nodes keeps the node centered and updates text font size when appropriate.
- Validation runs before and after transforms.

## Conversation Context

The frontend sends the latest chat messages with every request. The backend and LLM use that context to resolve follow-ups like "make it smaller" or "move it higher".

## Trade-offs

The preview is a wireframe, not a final render. The deterministic rule layer covers the required demo prompts even without an API key, while OpenAI can be enabled for broader language understanding.

