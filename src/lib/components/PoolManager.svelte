<script lang="ts">
  // Svelte 5 runes are automatically available without importing.

  interface Pool {
    id: string;
    name: string;
    files: string[];
  }

  let availableFiles = $state<string[]>([]);
  let pools = $state<Pool[]>([]);
  let newPoolName = $state('');
  let selectedFiles = $state<string[]>([]);
  let statusMessage = $state('');

  async function fetchAvailableFiles() {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        availableFiles = await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    }
  }

  async function fetchPools() {
    try {
      const response = await fetch('/api/pools');
      if (response.ok) {
        pools = await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch pools:', error);
    }
  }

  // Effect to run on component mount
  $effect(() => {
    fetchAvailableFiles();
    fetchPools();
  });

  async function createPool() {
    if (!newPoolName.trim()) {
      statusMessage = 'Pool name cannot be empty.';
      return;
    }
    if (selectedFiles.length === 0) {
      statusMessage = 'Please select at least one file for the pool.';
      return;
    }

    statusMessage = 'Creating pool...';

    try {
      const response = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPoolName, files: selectedFiles })
      });

      if (response.ok) {
        statusMessage = 'Pool created successfully!';
        newPoolName = '';
        selectedFiles = [];
        await fetchPools(); // Refresh the list of pools
      } else {
        const result = await response.json();
        statusMessage = `Failed to create pool: ${result.message}`;
      }
    } catch (error) {
      statusMessage = 'An error occurred while creating the pool.';
      console.error('Failed to create pool:', error);
    }
  }

  async function deletePool(id: string) {
    try {
      const response = await fetch(`/api/pools/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchPools(); // Refresh pools list
      } else {
        console.error('Failed to delete pool');
      }
    } catch (error) {
      console.error('Error deleting pool:', error);
    }
  }

  export function refresh() {
    fetchAvailableFiles();
    fetchPools();
  }
</script>

<div class="pool-manager-container">
  <h2>Manage Knowledge Pools</h2>

  <div class="pool-creation-form">
    <h3>Create New Pool</h3>
    <input type="text" placeholder="New Pool Name" bind:value={newPoolName} />

    <h4>Select Files for Pool:</h4>
    {#if availableFiles.length > 0}
      <div class="file-selection-list">
        {#each availableFiles as file}
          <label>
            <input type="checkbox" value={file} bind:group={selectedFiles} />
            {file}
          </label>
        {/each}
      </div>
    {:else}
      <p>No files available. Upload some first.</p>
    {/if}

    <button onclick={createPool} disabled={availableFiles.length === 0}>Create Pool</button>
    {#if statusMessage}
      <p class="status-message">{statusMessage}</p>
    {/if}
  </div>

      <div class="existing-pools">
    <h3>Existing Pools</h3>
    {#if pools.length > 0}
      <ul>
        {#each pools as pool (pool.id)}
          <li>
            <div class="pool-header">
              <strong>{pool.name}</strong>
              <div class="pool-actions">
                <a href="/chat/{pool.id}" class="chat-button">💬 Chat</a>
                <button class="delete-button" onclick={() => deletePool(pool.id)}>Delete</button>
              </div>
            </div>
            <ul class="file-list">
              {#each pool.files as file}
                <li>{file}</li>
              {/each}
            </ul>
          </li>
        {/each}
      </ul>
    {:else}
      <p>No pools created yet.</p>
    {/if}
  </div>
</div>

<style>
  .pool-manager-container {
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
  }
  .pool-creation-form,
  .existing-pools {
    margin-top: 20px;
  }
  input[type='text'] {
    width: 100%;
    padding: 8px;
    margin-bottom: 10px;
  }
  .file-selection-list {
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid #ddd;
    padding: 10px;
    margin-bottom: 10px;
  }
  .file-selection-list label {
    display: block;
  }
  .status-message {
    margin-top: 10px;
    color: green;
  }
  .existing-pools ul {
    list-style-type: none;
    padding: 0;
  }
  .existing-pools li {
    padding: 15px;
    border-bottom: 1px solid #eee;
    background: white;
    margin-bottom: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .pool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .pool-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .chat-button {
    background: #007bff;
    color: white;
    text-decoration: none;
    padding: 8px 15px;
    border-radius: 5px;
    font-size: 14px;
    transition: background-color 0.2s;
  }
  
  .chat-button:hover {
    background: #0056b3;
  }
  
  .file-list {
    margin-left: 20px;
    color: #666;
  }
  
  .file-list li {
    padding: 2px 0;
    font-size: 14px;
  }
  
  .delete-button {
    background-color: #ff4d4d;
    color: white;
    border: none;
    padding: 8px 15px;
    cursor: pointer;
    border-radius: 5px;
    font-size: 14px;
  }
  
  .delete-button:hover {
    background-color: #ff3333;
  }
</style>
