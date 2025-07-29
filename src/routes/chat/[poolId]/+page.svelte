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

<div class="chat-container">
  <!-- Sidebar with chat history -->
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>Chat History</h2>
      <button 
        class="new-chat-btn" 
        onclick={createNewSession}
        disabled={sessionLoading || !pool}
      >
        {sessionLoading ? '...' : '+ New Chat'}
      </button>
    </div>

    <div class="pool-info">
      {#if pool}
        <h3>{pool.name}</h3>
        <p>{pool.files.length} files</p>
        <button class="back-btn" onclick={() => goto('/')}>← Back to Pools</button>
      {/if}
    </div>

    <div class="sessions-list">
      {#if chatSessions.length > 0}
        {#each chatSessions as session (session.id)}
          <button 
            class="session-item"
            class:active={currentSession?.id === session.id}
            onclick={() => selectSession(session)}
          >
            <div class="session-title">{session.title}</div>
            <div class="session-meta">
              {formatDate(session.updatedAt)}
              • {session.messages.length} messages
            </div>
          </button>
        {/each}
      {:else}
        <p class="no-sessions">No chat sessions yet. Create your first one!</p>
      {/if}
    </div>
  </div>

  <!-- Main chat area -->
  <div class="chat-main">
    {#if currentSession}
      <div class="chat-header">
        <h1>{currentSession.title}</h1>
      </div>

      <div class="messages-container">
        {#if currentSession.messages.length > 0}
          {#each currentSession.messages as message (message.timestamp)}
            <div class="message" class:user-message={message.role === 'user'}>
              <div class="message-content">
                {message.content}
              </div>
              <div class="message-time">
                {formatTime(message.timestamp)}
              </div>
            </div>
          {/each}
        {:else}
          <div class="empty-chat">
            <p>Start a conversation about the documents in <strong>{pool?.name}</strong></p>
            <p>You can ask questions about any of the {pool?.files.length} files in this knowledge pool.</p>
          </div>
        {/if}

        {#if loading}
          <div class="message">
            <div class="message-content typing">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="input-container">
        <textarea
          bind:value={newMessage}
          placeholder="Ask a question about the documents in this pool..."
          rows="3"
          onkeypress={handleKeyPress}
          disabled={loading}
        ></textarea>
        <button 
          onclick={sendMessage} 
          disabled={!newMessage.trim() || loading}
          class="send-btn"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    {:else}
      <div class="no-session">
        <h2>Welcome to {pool?.name || 'this Knowledge Pool'}</h2>
        <p>Select an existing chat session from the sidebar or create a new one to start chatting with the documents.</p>
        <button class="create-first-chat" onclick={createNewSession}>
          Start Your First Chat
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .chat-container {
    display: flex;
    height: 100vh;
    background: #f5f5f5;
  }

  .sidebar {
    width: 300px;
    background: white;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
  }

  .sidebar-header h2 {
    margin: 0 0 15px 0;
    font-size: 18px;
    color: #333;
  }

  .new-chat-btn {
    width: 100%;
    padding: 10px 15px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }

  .new-chat-btn:hover:not(:disabled) {
    background: #0056b3;
  }

  .new-chat-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .pool-info {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    background: #f8f9fa;
  }

  .pool-info h3 {
    margin: 0 0 5px 0;
    color: #333;
    font-size: 16px;
  }

  .pool-info p {
    margin: 0 0 15px 0;
    color: #666;
    font-size: 14px;
  }

  .back-btn {
    padding: 8px 12px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .back-btn:hover {
    background: #545b62;
  }

  .sessions-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .session-item {
    width: 100%;
    padding: 15px;
    margin-bottom: 8px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .session-item:hover {
    background: #f8f9fa;
    border-color: #007bff;
  }

  .session-item.active {
    background: #e7f3ff;
    border-color: #007bff;
  }

  .session-title {
    font-weight: 500;
    color: #333;
    margin-bottom: 5px;
  }

  .session-meta {
    font-size: 12px;
    color: #666;
  }

  .no-sessions {
    text-align: center;
    color: #666;
    padding: 20px;
    font-style: italic;
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
  }

  .chat-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    background: #fafafa;
  }

  .chat-header h1 {
    margin: 0;
    font-size: 20px;
    color: #333;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .message {
    max-width: 80%;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .user-message {
    align-self: flex-end;
    align-items: flex-end;
  }

  .message-content {
    padding: 12px 16px;
    border-radius: 12px;
    background: #f1f3f5;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .user-message .message-content {
    background: #007bff;
    color: white;
  }

  .message-time {
    font-size: 12px;
    color: #666;
    padding: 0 5px;
  }

  .empty-chat {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }

  .empty-chat p {
    margin: 10px 0;
  }

  .no-session {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 40px;
    color: #666;
  }

  .no-session h2 {
    color: #333;
    margin-bottom: 15px;
  }

  .create-first-chat {
    margin-top: 20px;
    padding: 12px 24px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
  }

  .create-first-chat:hover {
    background: #0056b3;
  }

  .input-container {
    padding: 20px;
    border-top: 1px solid #e0e0e0;
    background: #fafafa;
    display: flex;
    gap: 15px;
    align-items: flex-end;
  }

  .input-container textarea {
    flex: 1;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    resize: none;
    font-family: inherit;
    font-size: 14px;
  }

  .input-container textarea:focus {
    outline: none;
    border-color: #007bff;
  }

  .send-btn {
    padding: 12px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    white-space: nowrap;
  }

  .send-btn:hover:not(:disabled) {
    background: #0056b3;
  }

  .send-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .typing {
    background: #f1f3f5 !important;
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
    animation: typing 1.4s infinite ease-in-out;
  }

  .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes typing {
    0%, 80%, 100% { 
      transform: scale(0);
    } 40% { 
      transform: scale(1);
    }
  }

  @media (max-width: 768px) {
    .chat-container {
      flex-direction: column;
    }
    
    .sidebar {
      width: 100%;
      height: 200px;
    }
    
    .message {
      max-width: 95%;
    }
  }
</style> 