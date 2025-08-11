<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import sanitizeHtml from 'sanitize-html';

  // Pools removed; using tags instead

  interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }

  interface ChatSession {
    id: string;
    tags: string[];
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
    file?: string; // Kept for backward compatibility
    files?: string[]; // New field for explicitly storing resolved files
  }

  let tags = $state<string[]>([]);
  let chatSessions = $state<ChatSession[]>([]);
  let currentSession = $state<ChatSession | null>(null);
  let newMessage = $state('');
  let loading = $state(false);
  let sessionLoading = $state(false);
  let sidebarCollapsed = $state(false);
  let selectedFile = $state<string | null>(null);
  let copiedMessageKeys = $state<Set<string>>(new Set());
  let copiedAll = $state(false);

  // Markdown -> Safe HTML
  marked.setOptions({ breaks: true, gfm: true });
  function renderMarkdownToSafeHtml(input: string): string {
    try {
      const rawHtml = marked.parse(input ?? '') as string;
      return sanitizeHtml(rawHtml, {
        allowedTags: [
          'p','br','div','span','strong','b','em','i','u','s','blockquote','code','pre','kbd','samp','hr',
          'h1','h2','h3','h4','h5','h6',
          'ul','ol','li','dl','dt','dd',
          'a','img',
          'table','thead','tbody','tr','th','td'
        ],
        allowedAttributes: {
          a: ['href','name','target','rel'],
          img: ['src','alt','title'],
          '*': ['title']
        },
        allowedSchemes: ['http','https','mailto'],
        transformTags: {
          a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
        }
      });
    } catch {
      return input ?? '';
    }
  }

  $effect(() => {
    // Determine mode from route param: direct session ID, file:<name>, or tag:<name>
    const poolId = $page.params.poolId || '';
    selectedFile = null;
    let routeHandled = false;

    if (poolId.startsWith('file:')) {
      const fname = decodeURIComponent(poolId.slice('file:'.length));
      selectedFile = fname || null;
      tags = [];
      routeHandled = true;
      // Load all sessions (no tag filtering) and ensure file session
      loadChatSessions(false).then(() => {
        if (selectedFile) ensureFileSession(selectedFile);
      });
    } else if (poolId.startsWith('tag:')) {
      const t = decodeURIComponent(poolId.slice('tag:'.length));
      tags = t ? [t] : [];
      selectedFile = null;
      routeHandled = true;
      // Auto-create a new session for this tag after loading sessions
      loadChatSessions(false).then(() => {
        createNewSession();
      });
    } else if (poolId && poolId.length > 0) {
      // Direct session ID - load all sessions and find the specific one
      routeHandled = true;
      loadChatSessions(false).then(() => {
        const session = chatSessions.find(s => s.id === poolId);
        if (session) {
          currentSession = session;
          // Extract tags and files from the session
          tags = session.tags || [];
          selectedFile = session.file || null;
        } else {
          // Session not found, redirect to home
          goto('/');
        }
      });
    }

    if (!routeHandled) {
      // Fallback: parse tags from query string
      const tagsParam = $page.url.searchParams.get('tags');
      if (tagsParam) {
        try { const parsed = JSON.parse(tagsParam); if (Array.isArray(parsed)) tags = parsed as string[]; } catch {}
      }
      selectedFile = null;
      // Always show all sessions in sidebar
      loadChatSessions(false);
    }
  });

  // Removed loadPool; tags drive context

  async function loadChatSessions(filterByTags: boolean = true) {
    try {
      const useTagFilter = filterByTags && tags.length > 0;
      const response = await fetch(`/api/chat-history${useTagFilter ? `?tags=${encodeURIComponent(JSON.stringify(tags))}` : ''}`);
      if (response.ok) {
        chatSessions = await response.json();
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }

  async function ensureFileSession(fileName: string) {
    // Try to find existing session for this file
    const existing = chatSessions.find((s) => s.file === fileName);
    if (existing) {
      goto(`/chat/${existing.id}`);
      return;
    }
    // Create one if not exists
    await createNewSession({ file: fileName, titleOverride: `Chat about: ${fileName}` });
  }

  async function createNewSession(options?: { file?: string; titleOverride?: string }) {
    sessionLoading = true;
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tags, 
          title: options?.titleOverride ?? (tags.length ? `Chat about tags: ${tags.join(', ')}` : 'General Chat'),
          file: options?.file
        })
      });

      if (response.ok) {
        const newSession = await response.json();
        chatSessions = [newSession, ...chatSessions];
        // Navigate to the new session to update the URL
        goto(`/chat/${newSession.id}`);
      }
    } catch (error) {
      console.error('Failed to create new session:', error);
    } finally {
      sessionLoading = false;
    }
  }

  async function selectSession(session: ChatSession) {
    // Navigate to the session URL to update the browser address bar
    goto(`/chat/${session.id}`);
  }

  async function deleteSession(sessionId: string) {
    try {
      const confirmed = confirm('Delete this chat? This cannot be undone.');
      if (!confirmed) return;

      const resp = await fetch(`/api/chat-history?id=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (!resp.ok) {
        console.error('Failed to delete chat session');
        return;
      }

      chatSessions = chatSessions.filter((s) => s.id !== sessionId);
      if (currentSession?.id === sessionId) {
        // Navigate to another session or back to home
        if (chatSessions.length > 0) {
          goto(`/chat/${chatSessions[0].id}`);
        } else {
          goto('/');
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentSession || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: newMessage.trim(),
      timestamp: Date.now()
    };

    // Add user message to current session
    currentSession.messages = [...currentSession.messages, userMessage];
    const messageToSend = newMessage.trim();
    newMessage = '';
    loading = true;

    try {
      let response: Response;
      const historyToSend = currentSession.messages.slice(0, -1);

      // Use the new files field or fallback to legacy file field
      const sessionFiles = currentSession?.files || (currentSession?.file ? [currentSession.file] : []);
      
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: currentSession?.tags || tags,
          message: messageToSend,
          history: historyToSend,
          files: sessionFiles
        })
      });

      if (response.ok) {
        const result = await response.json();
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.response,
          timestamp: result.timestamp || Date.now()
        };

        // Add assistant response
        currentSession.messages = [...currentSession.messages, assistantMessage];

        // Save updated session
        await saveSession();
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      loading = false;
    }
  }

  async function saveSession() {
    if (!currentSession) return;

    try {
      await fetch('/api/chat-history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSession)
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function handleGlobalKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      goto('/');
    }
  }

  function makeMsgKey(message: ChatMessage): string {
    return `${message.role}:${message.timestamp}`;
  }

  async function copyTextToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }

  async function copyMessageMarkdown(message: ChatMessage) {
    const ok = await copyTextToClipboard(message.content ?? '');
    if (!ok) return;
    const key = makeMsgKey(message);
    copiedMessageKeys = new Set([...copiedMessageKeys, key]);
    setTimeout(() => {
      const next = new Set(copiedMessageKeys);
      next.delete(key);
      copiedMessageKeys = next;
    }, 1500);
  }

  function buildConversationMarkdown(session: ChatSession): string {
    return (session.messages || [])
      .map((m) => `**${m.role === 'user' ? 'User' : 'Assistant'}**\n\n${m.content}\n`)
      .join('\n---\n\n');
  }

  async function copyFullConversation() {
    if (!currentSession) return;
    const text = buildConversationMarkdown(currentSession);
    const ok = await copyTextToClipboard(text);
    if (!ok) return;
    copiedAll = true;
    setTimeout(() => { copiedAll = false; }, 1500);
  }
</script>

<svelte:window on:keydown={handleGlobalKeyDown} />

<svelte:head>
  <title>Chat</title>
</svelte:head>

<div class="d-flex vh-100 bg-light">
  <!-- Sidebar -->
  <div class="sidebar bg-white border-end shadow-sm d-flex flex-column" class:collapsed={sidebarCollapsed}>
    <!-- Sidebar Header -->
    <div class="sidebar-header p-3 border-bottom bg-primary text-white">
      <div class="d-flex align-items-center justify-content-between">
        <h5 class="mb-0 fw-bold">
          <i class="bi bi-chat-square-text me-2"></i>
          <span class="sidebar-text">Chat History</span>
        </h5>
        <button 
          class="btn btn-sm btn-outline-light d-lg-none"
          onclick={() => sidebarCollapsed = !sidebarCollapsed}
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <i class="bi bi-list"></i>
        </button>
      </div>
      <div class="mt-2 sidebar-text">
        <button 
          class="btn btn-light btn-sm w-100"
          onclick={() => createNewSession()}
          disabled={sessionLoading}
        >
          {#if sessionLoading}
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Creating...
          {:else}
            <i class="bi bi-plus-circle me-2"></i>New Chat
          {/if}
        </button>
      </div>
    </div>

    <!-- Pool Info removed -->

    <!-- Sessions List -->
    <div class="sessions-list flex-grow-1 p-2" style="overflow-y: auto;">
      {#if chatSessions.length > 0}
        {#each chatSessions as session (session.id)}
          <div class="session-row position-relative mb-2">
            <button 
              class="session-item btn w-100 text-start p-3"
              class:btn-primary={currentSession?.id === session.id}
              class:btn-outline-secondary={currentSession?.id !== session.id}
              onclick={() => selectSession(session)}
              aria-label={`Open chat session ${session.title}`}
            >
              <div class="sidebar-text">
                <div class="fw-medium text-truncate">{session.title}</div>
                <small class="text-muted">
                  {#if session.tags?.length}
                    <span
                      class="d-inline-block text-truncate align-middle"
                      style="max-width: 160px; vertical-align: middle;"
                      title={session.tags.join(', ')}
                    >
                      {session.tags.join(', ')}
                    </span>
                    •
                  {/if}
                  {formatDate(session.updatedAt)} • {session.messages.length} messages
                </small>
              </div>
            </button>
            <button
              class="session-delete btn btn-outline-danger btn-sm position-absolute top-0 end-0 m-2"
              title="Delete chat"
              aria-label={`Delete chat session ${session.title}`}
              onclick={() => deleteSession(session.id)}
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        {/each}
      {:else}
        <div class="text-center p-4 sidebar-text">
          <i class="bi bi-chat-square-dots display-4 text-muted mb-3"></i>
          <p class="text-muted small">No chat sessions yet. Create your first one!</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Main Chat Area -->
  <div class="chat-main flex-grow-1 d-flex flex-column">
    {#if currentSession}
      <!-- Chat Header -->
      <div class="chat-header p-3 bg-white border-bottom shadow-sm">
        <div class="d-flex align-items-center">
          <a 
            href="/" 
            class="btn btn-outline-secondary btn-sm me-3"
            aria-label="Back to overview"
            title="Back to overview (Esc)"
          >
            <i class="bi bi-arrow-left"></i>
          </a>
          <button 
            class="btn btn-outline-secondary btn-sm me-3 d-lg-none"
            onclick={() => sidebarCollapsed = !sidebarCollapsed}
            aria-label="Toggle sidebar"
          >
            <i class="bi bi-list"></i>
          </button>
          <div>
            <h4 class="mb-0 text-primary">{currentSession.title}</h4>
            <small class="text-muted">
              {#if currentSession.files?.length}
                {`Files: ${currentSession.files.join(', ')}`} • {currentSession.messages.length} messages
              {:else if currentSession.file}
                {`File: ${currentSession.file}`} • {currentSession.messages.length} messages
              {:else}
                {currentSession.tags?.length ? `Tags: ${currentSession.tags.join(', ')}` : 'No tags'} • {currentSession.messages.length} messages
              {/if}
            </small>
          </div>
          <div class="ms-auto d-flex align-items-center">
            <button
              class="btn btn-outline-primary btn-sm"
              title={copiedAll ? 'Copied!' : 'Copy full chat as Markdown'}
              aria-label="Copy full chat as Markdown"
              onclick={copyFullConversation}
            >
              <i class={copiedAll ? 'bi bi-clipboard-check' : 'bi bi-clipboard'}></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Messages Container -->
      <div class="messages-container flex-grow-1 p-3" style="overflow-y: auto;">
        {#if currentSession.messages.length > 0}
          {#each currentSession.messages as message (message.timestamp)}
            <div class="message-wrapper mb-4" class:text-end={message.role === 'user'}>
              <div class="message d-inline-block" class:user-message={message.role === 'user'}>
                <div class="message-content p-3 rounded-3 shadow-sm">
                  {@html renderMarkdownToSafeHtml(message.content)}
                </div>
                <div class="d-flex align-items-center gap-2 mt-1">
                  <small class="message-time text-muted">
                    {formatTime(message.timestamp)}
                  </small>
                  <button
                    class="btn btn-outline-secondary btn-sm py-0 px-2"
                    title={copiedMessageKeys.has(makeMsgKey(message)) ? 'Copied!' : 'Copy message as Markdown'}
                    aria-label="Copy message as Markdown"
                    onclick={() => copyMessageMarkdown(message)}
                  >
                    <i class={copiedMessageKeys.has(makeMsgKey(message)) ? 'bi bi-clipboard-check' : 'bi bi-clipboard'}></i>
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {:else}
          <div class="empty-chat text-center py-5">
            <i class="bi bi-chat-quote display-1 text-primary mb-3"></i>
            <h5 class="text-primary">Start a conversation</h5>
            <p class="text-muted">
              {currentSession.tags?.length ? `Ask about documents tagged: ${currentSession.tags.join(', ')}` : 'General chat'}
            </p>
          </div>
        {/if}

        {#if loading}
          <div class="message-wrapper mb-4">
            <div class="message d-inline-block">
              <div class="message-content p-3 rounded-3 bg-light">
                <div class="typing-indicator d-flex align-items-center">
                  <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </div>
                  <span class="text-muted">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Input Container -->
      <div class="input-container p-3 bg-white border-top">
        <div class="row g-2">
          <div class="col">
            <textarea
              bind:value={newMessage}
              placeholder="Ask a question..."
              rows="3"
              class="form-control"
              onkeypress={handleKeyPress}
              disabled={loading}
            ></textarea>
          </div>
          <div class="col-auto d-flex align-items-end">
            <button 
              onclick={sendMessage} 
              disabled={!newMessage.trim() || loading}
              class="btn btn-primary"
              style="height: fit-content;"
            >
              {#if loading}
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Sending...
              {:else}
                <i class="bi bi-send me-2"></i>Send
              {/if}
            </button>
          </div>
        </div>
      </div>
    {:else}
      <!-- No Session Selected -->
      <div class="chat-header p-3 bg-white border-bottom shadow-sm">
        <div class="d-flex align-items-center">
          <a 
            href="/" 
            class="btn btn-outline-secondary btn-sm me-3"
            aria-label="Back to overview"
            title="Back to overview (Esc)"
          >
            <i class="bi bi-arrow-left"></i>
          </a>
          <div>
            <h4 class="mb-0 text-primary">Chat</h4>
            <small class="text-muted">Select a session or create a new one</small>
          </div>
        </div>
      </div>
      <div class="no-session d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
        <i class="bi bi-chat-square-heart display-1 text-primary mb-4"></i>
        <h3 class="text-primary mb-3">Welcome</h3>
        <p class="text-muted mb-4 lead">
          Select an existing chat session from the sidebar or create a new one to start chatting with your documents.
        </p>
        <button class="btn btn-primary btn-lg" onclick={() => createNewSession()} disabled={sessionLoading}>
          {#if sessionLoading}
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Creating...
          {:else}
            <i class="bi bi-chat-dots me-2"></i>Start Your First Chat
          {/if}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .sidebar {
    width: 350px;
    min-width: 350px;
    transition: all 0.3s ease;
  }
  
  .sidebar.collapsed {
    width: 0;
    min-width: 0;
    overflow: hidden;
  }
  
  .sidebar-text {
    opacity: 1;
    transition: opacity 0.3s ease;
  }
  
  .sidebar.collapsed .sidebar-text {
    opacity: 0;
  }
  
  .message {
    max-width: 70%;
  }
  
  .user-message .message-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .message-content {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    line-height: 1.5;
    white-space: normal;
    word-wrap: break-word;
  }
  
  .typing-indicator {
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  .session-item {
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }
  
  .session-item:hover {
    transform: translateX(2px);
  }
  
  .session-row {
    /* create stacking context to ensure floating delete stays above */
    isolation: isolate;
  }
  
  .session-delete {
    opacity: 0.85;
    transition: opacity 0.15s ease;
  }
  
  .session-row:hover .session-delete {
    opacity: 1;
  }
  
  .messages-container {
    scroll-behavior: smooth;
  }
  
  .message-wrapper:last-child {
    scroll-margin-bottom: 1rem;
  }

  @media (max-width: 991.98px) {
    .sidebar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      z-index: 1000;
      transform: translateX(-100%);
    }
    
    .sidebar:not(.collapsed) {
      transform: translateX(0);
    }
    
    .chat-main {
      width: 100%;
    }
  }
  
  @media (max-width: 576px) {
    .sidebar {
      width: 100vw;
      min-width: 100vw;
    }
    
    .message {
      max-width: 85%;
    }
  }
</style> 