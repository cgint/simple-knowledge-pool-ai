# Simple Knowledge AI

A SvelteKit application that lets you tag uploaded documents and chat with them using AI.

## Features

### 📁 File Upload
- Drag & drop support for uploading knowledge files
- Supports markdown (.md), text (.txt), and PDF files
- Files are stored in `data/uploads/` directory

### 🏷️ File Tags
- Assign one or more tags to uploaded files
- Use one or more selected tags as chat context
- Tag mappings are stored in `data/file-tags.json`

### 💬 Chat with Documents
- **Dedicated chat page** that uses selected tags as context
- **Multiple chat sessions** with history sidebar
- Chat history automatically saved and restored
- Real-time chat interface with typing indicators
- Full conversation context maintained across sessions

### 🔧 API Endpoints
- `GET /api/files` - File listing
- `POST /api/files/upload` - File upload
- `GET/PUT /api/file-tags` - Manage file-to-tag mappings
- `POST /api/chat` - Send chat messages to AI
- `GET/POST/PUT /api/chat-history` - Manage chat sessions

## How to Use

1. **Upload Documents**: Use the drag & drop interface on the main page to upload your knowledge files
2. **Tag Files**: Assign tags to your uploaded files in the Tag Manager
3. **Start Chatting**: Open the chat page and create a session using selected tags (or use the quick "Chat with tag" buttons)
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
│   │   └── TagManager.svelte      # Tag creation & management
│   ├── server/
│   │   └── llm.ts                 # LLM integration module
│   └── types/
│       └── chat.ts                # Shared TypeScript types
├── routes/
│   ├── api/
│   │   ├── chat/+server.ts         # Chat API endpoint
│   │   ├── chat-history/+server.ts # Chat session management
│   │   ├── files/+server.ts        # File listing API
│   │   ├── file-tags/+server.ts    # File tags API
│   │   └── files/upload/+server.ts # File upload API
│   ├── chat/[id]/+page.svelte      # Chat interface page (tags-based)
│   └── +page.svelte                # Main page
└── data/
    ├── uploads/                    # Uploaded files (gitignored)
    ├── chat-history/               # Chat sessions (gitignored)
    └── file-tags.json              # File-to-tag mappings
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
- Create multiple independent chat sessions
- Chat history is preserved and can be resumed at any time
- Sessions are stored as individual JSON files in `data/chat-history/`

### Context-Aware Responses
- All files matching the selected tags are provided as context to the AI
- Full chat history is maintained for conversation continuity
- Supports follow-up questions and context references

### User Interface
- Clean, modern chat interface with message bubbles
- Responsive design that works on desktop and mobile
- Real-time typing indicators during AI response generation
- Easy navigation between chat sessions and back to tag management

## API Usage

The chat API can be used by external clients:

```javascript
// Send a chat message
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tags: ['tag1', 'tag2'],
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