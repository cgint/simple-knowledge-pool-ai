<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

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
  }

  let poolId = $state<string>($page.params.poolId || '');
  let tags = $state<string[]>([]);
  let chatSessions = $state<ChatSession[]>([]);
  let currentSession = $state<ChatSession | null>(null);
  let newMessage = $state('');
  let loading = $state(false);
  let sessionLoading = $state(false);
  let sidebarCollapsed = $state(false);
  let attachedFile = $state<File | null>(null);
  let attachedFileError = $state<string | null>(null);

  $effect(() => {
    poolId = $page.params.poolId || '';
    // Parse tags from query string
    const tagsParam = $page.url.searchParams.get('tags');
    if (tagsParam) {
      try { const parsed = JSON.parse(tagsParam); if (Array.isArray(parsed)) tags = parsed as string[]; } catch {}
    }
    loadChatSessions();
  });

  // Removed loadPool; tags drive context

  async function loadChatSessions() {
    try {
      const response = await fetch(`/api/chat-history${tags.length ? `?tags=${encodeURIComponent(JSON.stringify(tags))}` : ''}`);
      if (response.ok) {
        chatSessions = await response.json();
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }

  async function createNewSession() {
    sessionLoading = true;
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags, title: tags.length ? `Chat about tags: ${tags.join(', ')}` : 'General Chat' })
      });

      if (response.ok) {
        const newSession = await response.json();
        chatSessions = [newSession, ...chatSessions];
        currentSession = newSession;
      }
    } catch (error) {
      console.error('Failed to create new session:', error);
    } finally {
      sessionLoading = false;
    }
  }

  async function selectSession(session: ChatSession) {
    currentSession = session;
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

      if (attachedFile) {
        const form = new FormData();
        form.append('tags', JSON.stringify(currentSession?.tags || tags));
        form.append('message', messageToSend);
        form.append('history', JSON.stringify(historyToSend));
        form.append('file', attachedFile);
        response = await fetch('/api/chat', { method: 'POST', body: form });
      } else {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tags: currentSession?.tags || tags,
            message: messageToSend,
            history: historyToSend
          })
        });
      }

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
        // Clear attachment after successful send
        attachedFile = null;
        attachedFileError = null;
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      loading = false;
    }
  }

  function handleAttachFile(event: Event) {
    attachedFileError = null;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) { attachedFile = null; return; }
    const file = input.files[0];
    if (file && file.type !== 'application/pdf') {
      attachedFileError = 'Only PDF files are supported.';
      attachedFile = null;
      input.value = '';
      return;
    }
    attachedFile = file;
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
</script>

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
          onclick={createNewSession}
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
          <button 
            class="session-item btn w-100 text-start mb-2 p-3"
            class:btn-primary={currentSession?.id === session.id}
            class:btn-outline-secondary={currentSession?.id !== session.id}
            onclick={() => selectSession(session)}
            aria-label={`Open chat session ${session.title}`}
          >
            <div class="sidebar-text">
              <div class="fw-medium text-truncate">{session.title}</div>
              <small class="text-muted">
                {formatDate(session.updatedAt)} • {session.messages.length} messages
              </small>
            </div>
          </button>
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
              {currentSession.tags?.length ? `Tags: ${currentSession.tags.join(', ')}` : 'No tags'} • {currentSession.messages.length} messages
            </small>
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
                  {message.content}
                </div>
                <small class="message-time text-muted d-block mt-1">
                  {formatTime(message.timestamp)}
                </small>
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
            <div class="d-flex align-items-center gap-2 mt-2">
              <label class="btn btn-outline-secondary btn-sm mb-0">
                <input type="file" accept="application/pdf" onchange={handleAttachFile} style="display:none" />
                <i class="bi bi-paperclip me-1"></i>Attach PDF
              </label>
              {#if attachedFile}
                <small class="text-muted">{attachedFile.name}</small>
              {/if}
              {#if attachedFileError}
                <small class="text-danger">{attachedFileError}</small>
              {/if}
            </div>
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
      <div class="no-session d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
        <i class="bi bi-chat-square-heart display-1 text-primary mb-4"></i>
        <h3 class="text-primary mb-3">Welcome</h3>
        <p class="text-muted mb-4 lead">
          Select an existing chat session from the sidebar or create a new one to start chatting with your documents.
        </p>
        <button class="btn btn-primary btn-lg" onclick={createNewSession} disabled={sessionLoading}>
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
    white-space: pre-wrap;
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