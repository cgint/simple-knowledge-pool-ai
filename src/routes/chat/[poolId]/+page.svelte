<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  interface Pool {
    id: string;
    name: string;
    files: string[];
  }

  interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }

  interface ChatSession {
    id: string;
    poolId: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
  }

  let poolId = $state($page.params.poolId);
  let pool = $state<Pool | null>(null);
  let chatSessions = $state<ChatSession[]>([]);
  let currentSession = $state<ChatSession | null>(null);
  let newMessage = $state('');
  let loading = $state(false);
  let sessionLoading = $state(false);
  let sidebarCollapsed = $state(false);

  $effect(() => {
    poolId = $page.params.poolId;
    if (poolId) {
      loadPool();
      loadChatSessions();
    }
  });

  async function loadPool() {
    try {
      const response = await fetch(`/api/pools/${poolId}`);
      if (response.ok) {
        pool = await response.json();
      } else {
        console.error('Pool not found');
        goto('/');
      }
    } catch (error) {
      console.error('Failed to load pool:', error);
    }
  }

  async function loadChatSessions() {
    try {
      const response = await fetch(`/api/chat-history?poolId=${poolId}`);
      if (response.ok) {
        chatSessions = await response.json();
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }

  async function createNewSession() {
    if (!pool) return;

    sessionLoading = true;
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          poolId: pool.id, 
          title: `Chat about ${pool.name}` 
        })
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
      // Send to chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId: currentSession.poolId,
          message: messageToSend,
          history: currentSession.messages.slice(0, -1) // Don't include the message we just added
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
</script>

<svelte:head>
  <title>Chat - {pool?.name || 'Loading...'}</title>
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
        >
          <i class="bi bi-list"></i>
        </button>
      </div>
      <div class="mt-2 sidebar-text">
        <button 
          class="btn btn-light btn-sm w-100"
          onclick={createNewSession}
          disabled={sessionLoading || !pool}
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

    <!-- Pool Info -->
    {#if pool}
      <div class="pool-info p-3 border-bottom bg-light">
        <div class="sidebar-text">
          <h6 class="text-primary mb-1">
            <i class="bi bi-folder-fill me-2"></i>{pool.name}
          </h6>
          <p class="text-muted small mb-2">
            <i class="bi bi-files me-1"></i>
            {pool.files.length} document{pool.files.length !== 1 ? 's' : ''}
          </p>
          <a href="/" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-arrow-left me-1"></i>Back to Pools
          </a>
        </div>
      </div>
    {/if}

    <!-- Sessions List -->
    <div class="sessions-list flex-grow-1 p-2" style="overflow-y: auto;">
      {#if chatSessions.length > 0}
        {#each chatSessions as session (session.id)}
          <button 
            class="session-item btn w-100 text-start mb-2 p-3"
            class:btn-primary={currentSession?.id === session.id}
            class:btn-outline-secondary={currentSession?.id !== session.id}
            onclick={() => selectSession(session)}
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
          >
            <i class="bi bi-list"></i>
          </button>
          <div>
            <h4 class="mb-0 text-primary">{currentSession.title}</h4>
            <small class="text-muted">
              Chatting with {pool?.name} • {currentSession.messages.length} messages
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
              Ask questions about the <strong>{pool?.files.length} documents</strong> in <strong>{pool?.name}</strong>
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
              placeholder="Ask a question about the documents in this pool..."
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
      <div class="no-session d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
        <i class="bi bi-chat-square-heart display-1 text-primary mb-4"></i>
        <h3 class="text-primary mb-3">Welcome to {pool?.name || 'this Knowledge Pool'}</h3>
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