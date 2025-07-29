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
  let isCreating = $state(false);

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

  function handleFormSubmit(event: Event) {
    event.preventDefault();
    createPool();
  }

  async function createPool() {
    if (!newPoolName.trim()) {
      statusMessage = 'Pool name cannot be empty.';
      return;
    }
    if (selectedFiles.length === 0) {
      statusMessage = 'Please select at least one file for the pool.';
      return;
    }

    isCreating = true;
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
    } finally {
      isCreating = false;
    }
  }

  async function deletePool(id: string) {
    if (!confirm('Are you sure you want to delete this pool? This action cannot be undone.')) {
      return;
    }
    
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

<div class="pool-manager">
  <!-- Create New Pool Section -->
  <div class="card border-0 shadow-sm mb-4">
    <div class="card-header bg-primary text-white border-0">
      <h4 class="mb-0">
        <i class="bi bi-plus-circle me-2"></i>Create New Knowledge Pool
      </h4>
    </div>
    <div class="card-body">
      <form onsubmit={handleFormSubmit}>
        <!-- Pool Name Input -->
        <div class="mb-3">
          <label for="poolName" class="form-label fw-semibold">Pool Name</label>
          <input 
            type="text" 
            class="form-control form-control-lg" 
            id="poolName"
            placeholder="Enter a descriptive name for your knowledge pool"
            bind:value={newPoolName}
            disabled={isCreating}
          />
        </div>

        <!-- File Selection -->
        <div class="mb-4">
          <label class="form-label fw-semibold">Select Files for Pool</label>
          {#if availableFiles.length > 0}
            <div class="border rounded-3 p-3 bg-light" style="max-height: 250px; overflow-y: auto;">
              <div class="row g-2">
                {#each availableFiles as file}
                  <div class="col-12 col-md-6">
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="checkbox" 
                        value={file} 
                        bind:group={selectedFiles}
                        id="file-{file}"
                        disabled={isCreating}
                      />
                      <label class="form-check-label d-flex align-items-center" for="file-{file}">
                        <i class="bi bi-file-earmark-text me-2 text-primary"></i>
                        <span class="text-truncate">{file}</span>
                      </label>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
            <div class="form-text">
              <i class="bi bi-info-circle me-1"></i>
              Selected: {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
            </div>
          {:else}
            <div class="alert alert-warning d-flex align-items-center mb-0" role="alert">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <div>
                No files available. <strong>Upload some files first</strong> to create a knowledge pool.
              </div>
            </div>
          {/if}
        </div>

        <!-- Create Button -->
        <div class="d-grid">
          <button 
            type="submit" 
            class="btn btn-primary btn-lg"
            disabled={availableFiles.length === 0 || isCreating}
          >
            {#if isCreating}
              <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Creating Pool...
            {:else}
              <i class="bi bi-collection me-2"></i>
              Create Knowledge Pool
            {/if}
          </button>
        </div>

        <!-- Status Message -->
        {#if statusMessage}
          <div class="mt-3">
            {#if statusMessage.includes('successfully')}
              <div class="alert alert-success d-flex align-items-center" role="alert">
                <i class="bi bi-check-circle-fill me-2"></i>
                {statusMessage}
              </div>
            {:else if statusMessage.includes('Failed') || statusMessage.includes('error')}
              <div class="alert alert-danger d-flex align-items-center" role="alert">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                {statusMessage}
              </div>
            {:else if statusMessage.includes('Creating')}
              <div class="alert alert-info d-flex align-items-center" role="alert">
                <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                {statusMessage}
              </div>
            {:else}
              <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="bi bi-info-circle-fill me-2"></i>
                {statusMessage}
              </div>
            {/if}
          </div>
        {/if}
      </form>
    </div>
  </div>

  <!-- Existing Pools Section -->
  <div class="existing-pools">
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h4 class="mb-0">
        <i class="bi bi-collection me-2"></i>Your Knowledge Pools
      </h4>
      {#if pools.length > 0}
        <span class="badge bg-primary-subtle text-primary-emphasis fs-6 px-3 py-2">
          {pools.length} pool{pools.length !== 1 ? 's' : ''}
        </span>
      {/if}
    </div>

    {#if pools.length > 0}
      <div class="row g-4">
        {#each pools as pool (pool.id)}
          <div class="col-12 col-lg-6">
            <div class="card h-100 border-0 shadow-sm">
              <div class="card-header bg-white border-0 pb-2">
                <div class="d-flex align-items-start justify-content-between">
                  <div class="flex-grow-1">
                    <h5 class="card-title mb-1 text-primary">
                      <i class="bi bi-folder-fill me-2"></i>{pool.name}
                    </h5>
                    <p class="text-muted mb-0 small">
                      <i class="bi bi-files me-1"></i>
                      {pool.files.length} file{pool.files.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button 
                    class="btn btn-outline-danger btn-sm"
                    onclick={() => deletePool(pool.id)}
                    title="Delete pool"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              
              <div class="card-body pt-0">
                <!-- Files List -->
                <div class="mb-3">
                  <h6 class="text-secondary mb-2">Files in this pool:</h6>
                  <div class="files-grid">
                    {#each pool.files as file}
                      <div class="file-item">
                        <i class="bi bi-file-earmark-text text-primary me-2"></i>
                        <span class="text-truncate">{file}</span>
                      </div>
                    {/each}
                  </div>
                </div>
                
                <!-- Chat Button -->
                <div class="d-grid">
                  <a 
                    href="/chat/{pool.id}" 
                    class="btn btn-primary"
                  >
                    <i class="bi bi-chat-dots me-2"></i>
                    Start Chatting
                  </a>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-5">
        <i class="bi bi-collection display-1 text-muted mb-3"></i>
        <h5 class="text-muted mb-3">No Knowledge Pools Yet</h5>
        <p class="text-muted">
          Create your first knowledge pool by uploading some files and organizing them into a collection.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .pool-manager {
    max-width: 100%;
  }
  
  .files-grid {
    display: grid;
    gap: 0.5rem;
    max-height: 150px;
    overflow-y: auto;
  }
  
  .file-item {
    display: flex;
    align-items: center;
    padding: 0.375rem 0.5rem;
    background-color: var(--bs-gray-100);
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  
  .card {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  }
  
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
  }
</style>
