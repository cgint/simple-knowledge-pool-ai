# Simple Knowledge Pool AI

A SvelteKit application that allows you to create knowledge pools from uploaded documents and chat with them using AI.

## Features

### 📁 File Upload
- Drag & drop support for uploading knowledge files
- Supports markdown (.md), text (.txt), and PDF files
- Files are stored in `data/uploads/` directory

### 🏊 Knowledge Pools
- Create knowledge pools by selecting uploaded files
- Each pool is a collection of related documents
- Pool metadata stored in `data/pools.json`

### 💬 Chat with Documents
- **Separate chat page** for each knowledge pool at `/chat/[poolId]`
- **Multiple chat sessions** with history sidebar
- Chat history automatically saved and restored
- Real-time chat interface with typing indicators
- Full conversation context maintained across sessions

### 🔧 API Endpoints
- `GET/POST /api/pools` - Manage knowledge pools
- `GET/DELETE /api/pools/[id]` - Individual pool operations
- `POST /api/chat` - Send chat messages to AI
- `GET/POST/PUT /api/chat-history` - Manage chat sessions
- `GET/POST /api/files` - File management

## How to Use

1. **Upload Documents**: Use the drag & drop interface on the main page to upload your knowledge files
2. **Create a Pool**: Select uploaded files and create a knowledge pool with a descriptive name
3. **Start Chatting**: Click the "💬 Chat" button next to any pool to open the chat interface
4. **Manage Conversations**: 
   - Create new chat sessions with the "+ New Chat" button
   - Select previous conversations from the sidebar
   - All chat history is automatically saved

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── FileUpload.svelte      # File upload interface
│   │   └── PoolManager.svelte     # Pool creation & management
│   ├── server/
│   │   └── llm.ts                 # LLM integration module
│   └── types/
│       └── chat.ts                # Shared TypeScript types
├── routes/
│   ├── api/
│   │   ├── chat/+server.ts        # Chat API endpoint
│   │   ├── chat-history/+server.ts # Chat session management
│   │   ├── files/+server.ts       # File listing API
│   │   │   └── upload/+server.ts  # File upload API
│   │   └── pools/[[id]]/+server.ts # Pool CRUD operations
│   ├── chat/[poolId]/+page.svelte # Chat interface page
│   └── +page.svelte               # Main page
└── data/
    ├── uploads/                   # Uploaded files (gitignored)
    ├── chat-history/              # Chat sessions (gitignored)
    └── pools.json                 # Pool definitions
```

## Development

### Prerequisites
- Node.js 18+
- npm or pnpm

### Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure Google Gemini API**:
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a `.env` file in the root directory:
   ```bash
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start development server**:
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

## LLM Integration

The application uses **Google Gemini** for AI-powered chat functionality. The modular LLM integration system at `src/lib/server/llm.ts` includes:

- ✅ **Google Gemini 2.5 Flash** (currently implemented)
- 🔧 OpenAI GPT (extensible)
- 🔧 Anthropic Claude (extensible)

### Features:
- Retry logic with exponential backoff for reliability
- Context length management for large documents
- Chat history preservation
- Error handling and timeout protection

### Configuration:
Set `VITE_GEMINI_API_KEY` in your environment variables to enable AI responses.

## Chat Features

### Multi-Session Support
- Each knowledge pool can have multiple independent chat sessions
- Chat history is preserved and can be resumed at any time
- Sessions are stored as individual JSON files in `data/chat-history/`

### Context-Aware Responses
- All files in the selected pool are provided as context to the AI
- Full chat history is maintained for conversation continuity
- Supports follow-up questions and context references

### User Interface
- Clean, modern chat interface with message bubbles
- Responsive design that works on desktop and mobile
- Real-time typing indicators during AI response generation
- Easy navigation between chat sessions and back to pool management

## API Usage

The chat API can be used by external clients:

```javascript
// Send a chat message
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    poolId: 'your-pool-id',
    message: 'Your question here',
    history: [] // Array of previous ChatMessage objects
  })
});

const result = await response.json();
console.log(result.response); // AI's response
```

## Future Enhancements

- Additional LLM providers (OpenAI GPT, Anthropic Claude)
- Advanced document parsing (better PDF support, Word docs)
- Retrieval Augmented Generation (RAG) for large document sets
- User authentication and multi-user support
- Export chat sessions
- Document search and filtering
- Advanced chat features (file attachments, code highlighting)
- Vector embeddings for semantic search

## License

MIT License - see LICENSE file for details. 