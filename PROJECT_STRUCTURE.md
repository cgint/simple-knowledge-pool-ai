# Project Structure

This document outlines the directory structure and the purpose of key files for the Simple Knowledge Pool application.

## High-Level Overview

The project is built with SvelteKit and is designed to be deployed on Cloudflare Pages. It follows the structure of the provided `svelte-kit-mini-ai-example-voice-correct.md` example, with additions to support the knowledge pool functionality.

## Directory Structure

```
.
├── uploads/                  # Stores uploaded knowledge files (gitignored)
├── src/
│   ├── lib/
│   │   ├── components/         # Reusable Svelte components
│   │   │   ├── FileUpload.svelte
│   │   │   ├── PoolManager.svelte
│   │   │   └── Chat.svelte
│   │   ├── data/               # Data management (e.g., pool definitions)
│   │   │   └── pools.json
│   │   └── server/             # Server-side logic
│   │       └── llm.ts          # Logic for interacting with the LLM
│   ├── routes/
│   │   ├── api/
│   │   │   ├── files/upload/+server.ts  # API for file uploads
│   │   │   ├── pools/[[id]]/+server.ts  # API for knowledge pools (CRUD)
│   │   │   └── chat/+server.ts          # API for the chat
│   │   └── +page.svelte        # Main application page
│   └── static/                 # Static assets like CSS and images
├── ... (existing config files)
```

## Key Components & Files

### `uploads/`
- This directory will store all user-uploaded files (Markdown, PDF, TXT).
- It should be added to `.gitignore` to prevent checking knowledge files into the repository.

### `src/lib/components/`
- **`FileUpload.svelte`**: A component with a drag-and-drop interface for users to upload their knowledge files.
- **`PoolManager.svelte`**: A component that allows users to create new knowledge pools and assign uploaded files to them.
- **`Chat.svelte`**: The main chat interface where users select a pool and interact with the AI.

### `src/lib/data/`
- **`pools.json`**: A simple JSON file to persist the knowledge pool definitions. For this PoC, we will use this file as a lightweight database. It will store an array of pools, each with an ID, a name, and a list of associated file paths.

### `src/lib/server/`
- **`llm.ts`**: This module will contain the logic for communicating with the external LLM provider (e.g., Google Gemini). It will handle constructing the prompt from the file contents and chat history.

### `src/routes/api/`
- **`files/upload/+server.ts`**: Handles the server-side logic for receiving and saving uploaded files to the `uploads/` directory.
- **`pools/[[id]]/+server.ts`**: A RESTful endpoint for managing knowledge pools. It will handle creating, reading, updating, and deleting pool definitions in `pools.json`.
- **`chat/+server.ts`**: The core API endpoint for the chat functionality. It will receive a pool ID, a user's question, and the chat history. It will then read the content of all files in the specified pool, construct a prompt, send it to the LLM via `llm.ts`, and return the AI's response.

### `src/routes/+page.svelte`
- This is the main entry point of the application. It will integrate the `FileUpload`, `PoolManager`, and `Chat` components to create the complete user interface.
