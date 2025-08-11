<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Svelte 5 runes available
  const dispatch = createEventDispatcher();

  let availableFiles = $state<string[]>([]);
  let fileToTags = $state<Record<string, string[]>>({});
  let tagInputByFile = $state<Record<string, string>>({});
  let globalTagSuggestions = $state<string[]>([]);
  let loading = $state(false);
  let savingFor: string | null = $state(null);
  let newTagInput = $state('');
  
  // Extraction-related state
  interface ExtractionData {
    summary: string;
    keyPoints: string[];
    categories: string[];
    extractedAt: number;
  }
  
  interface FileExtractionStatus {
    filename: string;
    hasExtraction: boolean;
    extraction: ExtractionData | null;
  }
  
  let extractionStatuses = $state<Record<string, FileExtractionStatus>>({});
  let extractingFor: string | null = $state(null);
  
  // Delete confirmation state
  let showDeleteConfirm = $state(false);
  let fileToDelete = $state('');

  async function loadFiles() {
    const res = await fetch('/api/files');
    if (res.ok) {
      availableFiles = await res.json();
      // Initialize tag inputs for each file
      availableFiles.forEach(file => {
        if (!(file in tagInputByFile)) {
          tagInputByFile[file] = '';
        }
      });
    } else {
      availableFiles = [];
    }
  }

  async function loadTags() {
    const res = await fetch('/api/file-tags');
    if (res.ok) {
      const map = await res.json();
      fileToTags = map || {};
      const set = new Set<string>();
      Object.values(fileToTags).forEach(tags => tags?.forEach(t => set.add(t)));
      globalTagSuggestions = Array.from(set).sort((a, b) => a.localeCompare(b));
    } else {
      fileToTags = {};
      globalTagSuggestions = [];
    }
  }

  async function loadExtractionStatuses() {
    const res = await fetch('/api/extract');
    if (res.ok) {
      const statuses: FileExtractionStatus[] = await res.json();
      extractionStatuses = {};
      statuses.forEach(status => {
        extractionStatuses[status.filename] = status;
      });
    } else {
      extractionStatuses = {};
    }
  }

  async function refresh() {
    loading = true;
    try {
      await Promise.all([loadFiles(), loadTags(), loadExtractionStatuses()]);
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    refresh();
  });

  function addQuickTag(file: string, tag: string) {
    const normalized = tag.trim();
    if (!normalized) return;
    const existing = new Set(fileToTags[file] || []);
    existing.add(normalized);
    fileToTags[file] = Array.from(existing);
    if (!globalTagSuggestions.includes(normalized)) {
      globalTagSuggestions = [...globalTagSuggestions, normalized].sort((a, b) => a.localeCompare(b));
    }
    tagInputByFile[file] = '';
    saveTags(file);
  }

  function removeTag(file: string, tag: string) {
    const next = (fileToTags[file] || []).filter(t => t !== tag);
    fileToTags[file] = next;
    saveTags(file);
  }

  function createGlobalTag() {
    const normalized = newTagInput.trim();
    if (!normalized) return;
    if (!globalTagSuggestions.includes(normalized)) {
      globalTagSuggestions = [...globalTagSuggestions, normalized].sort((a, b) => a.localeCompare(b));
    }
    newTagInput = '';
  }

  async function saveTags(file: string) {
    savingFor = file;
    try {
      await fetch('/api/file-tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, tags: fileToTags[file] || [] })
      });
    } finally {
      savingFor = null;
    }
  }

  async function extractFileContent(filename: string) {
    extractingFor = filename;
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.extraction) {
          // Update the extraction status
          extractionStatuses[filename] = {
            filename,
            hasExtraction: true,
            extraction: result.extraction
          };
          
          // Refresh tags to show newly added categories
          await loadTags();
        }
      } else {
        console.error('Extraction failed:', await res.text());
        alert('Failed to extract content. Please try again.');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      alert('An error occurred during extraction.');
    } finally {
      extractingFor = null;
    }
  }

  function showExtractionModal(filename: string) {
    const status = extractionStatuses[filename];
    if (status?.extraction) {
      dispatch('showExtraction', {
        filename,
        extraction: status.extraction
      });
    }
  }

  // Auto-extract content for files that don't have extraction yet
  let hasTriggeredAutoExtraction = $state(false);
  
  $effect(() => {
    if (availableFiles.length > 0 && Object.keys(extractionStatuses).length > 0 && !hasTriggeredAutoExtraction) {
      const filesToExtract = availableFiles.filter(filename => {
        const status = extractionStatuses[filename];
        return filename.toLowerCase().endsWith('.pdf') && (!status || !status.hasExtraction);
      });
      
      if (filesToExtract.length > 0) {
        hasTriggeredAutoExtraction = true;
        // Extract content for the first file that needs it (to avoid overloading)
        extractFileContent(filesToExtract[0]);
      }
    }
  });

  function confirmDelete(filename: string) {
    fileToDelete = filename;
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    fileToDelete = '';
  }

  async function deleteFile() {
    if (!fileToDelete) return;
    
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(fileToDelete)}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // Remove file from local state
        availableFiles = availableFiles.filter(f => f !== fileToDelete);
        
        // Remove tags for this file
        if (fileToTags[fileToDelete]) {
          delete fileToTags[fileToDelete];
        }
        
        // Remove extraction status for this file
        if (extractionStatuses[fileToDelete]) {
          delete extractionStatuses[fileToDelete];
        }
        
        // Close the confirmation modal
        cancelDelete();
        
        console.log(`File ${fileToDelete} deleted successfully`);
      } else {
        const error = await res.json();
        console.error('Failed to delete file:', error);
        alert(`Failed to delete file: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('An error occurred while deleting the file');
    }
  }

  export function reload() {
    refresh();
  }
</script>

<div class="tag-manager">
  <div class="d-flex align-items-center justify-content-between mb-3">
    <h4 class="mb-0"><i class="bi bi-tags me-2"></i>File Tags</h4>
    <button class="btn btn-outline-secondary btn-sm" onclick={refresh} disabled={loading}>
      {#if loading}
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      {/if}
      Refresh
    </button>
  </div>

  <div class="mb-3">
    <div class="input-group input-group-sm" style="max-width: 420px;">
      <input
        class="form-control"
        placeholder="Create new tag and press Enter"
        bind:value={newTagInput}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === 'Enter') createGlobalTag();
        }}
      />
      <button class="btn btn-outline-primary" onclick={createGlobalTag}>Create tag</button>
    </div>
  </div>

  {#if globalTagSuggestions.length > 0}
    <div class="mb-3">
      <div class="d-flex align-items-center flex-wrap gap-2">
        <span class="text-muted small">Chat with tag:</span>
        {#each globalTagSuggestions as t}
          {@const fileCount = Object.values(fileToTags).filter(tags => tags?.includes(t)).length}
          <a class="btn btn-sm btn-primary" href={`/chat/tag:${encodeURIComponent(t)}`}>
            <i class="bi bi-chat-dots me-1"></i>{t} ({fileCount})
          </a>
        {/each}
      </div>
    </div>
  {/if}

  {#if availableFiles.length === 0}
    <div class="alert alert-warning">No files found. Upload files to start tagging.</div>
  {:else}
    <div class="list-group">
      {#each availableFiles as file}
        <div class="list-group-item">
          <!-- Line 1: Filename (bold) with action buttons -->
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="file-info d-flex align-items-center">
              <i class="bi bi-file-earmark-text text-primary me-2"></i>
              <a 
                href={`/api/files/${encodeURIComponent(file)}`}
                target="_blank"
                rel="noopener noreferrer"
                class="text-decoration-none text-dark hover-link fw-bold"
                title="Open PDF in new tab"
              >
                {file}
              </a>
            </div>
            
            <div class="action-buttons d-flex align-items-center gap-2">
              <!-- Extracts button for PDF files -->
              {#if file.toLowerCase().endsWith('.pdf')}
                <button 
                  class="btn btn-sm"
                  class:btn-success={extractionStatuses[file]?.hasExtraction}
                  class:btn-outline-secondary={!extractionStatuses[file]?.hasExtraction}
                  onclick={() => extractionStatuses[file]?.hasExtraction ? showExtractionModal(file) : extractFileContent(file)}
                  disabled={extractingFor === file}
                  title={extractionStatuses[file]?.hasExtraction ? 'View extracts' : 'Extract content'}
                >
                  {#if extractingFor === file}
                    <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  {:else}
                    <i class="bi bi-file-text me-1"></i>
                  {/if}
                  Extracts
                </button>
              {/if}

              <a class="btn btn-sm btn-primary" href={`/chat/file:${encodeURIComponent(file)}`}>
                <i class="bi bi-chat-dots me-1"></i> Chat
              </a>

              <button 
                class="btn btn-sm btn-outline-danger"
                onclick={() => confirmDelete(file)}
                title="Delete file"
                aria-label="Delete file"
              >
                <i class="bi bi-trash"></i>
              </button>

              <div style="width: 28px;">
                {#if savingFor === file}
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Line 2: Tags with left padding -->
          <div style="padding-left: 10px;" class="d-flex align-items-center gap-3 flex-wrap">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="text-muted">Tags:</span>
              {#each fileToTags[file] || [] as tag}
                <span class="badge bg-primary-subtle text-primary-emphasis">
                  {tag}
                  <button class="btn btn-sm btn-link p-0 ms-1" aria-label="Remove tag" onclick={() => removeTag(file, tag)}>
                    <i class="bi bi-x"></i>
                  </button>
                </span>
              {/each}
              {#if (fileToTags[file] || []).length === 0}
                <span class="text-muted">No tags</span>
              {/if}
            </div>
            
            <!-- Add tag input -->
            <div class="input-group input-group-sm" style="max-width: 200px;">
              <input
                class="form-control form-control-sm"
                placeholder="Add tag..."
                bind:value={tagInputByFile[file]}
                onkeydown={(e) => {
                  if (e.key === 'Enter' && tagInputByFile[file]?.trim()) {
                    addQuickTag(file, tagInputByFile[file]);
                  }
                }}
              />
              <button 
                class="btn btn-outline-secondary btn-sm" 
                onclick={() => tagInputByFile[file]?.trim() && addQuickTag(file, tagInputByFile[file])}
                disabled={!tagInputByFile[file]?.trim()}
                aria-label="Add tag"
              >
                <i class="bi bi-plus"></i>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="modal show d-block" tabindex="-1" role="dialog" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-exclamation-triangle text-warning me-2"></i>
            Confirm Delete
          </h5>
          <button type="button" class="btn-close" onclick={cancelDelete} aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p class="mb-2">Are you sure you want to delete this file?</p>
          <div class="alert alert-light border">
            <i class="bi bi-file-earmark-text text-primary me-2"></i>
            <strong>{fileToDelete}</strong>
          </div>
          <div class="alert alert-warning mb-0">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>This action cannot be undone.</strong> The file, its tags, and any extracted content will be permanently deleted.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={cancelDelete}>
            Cancel
          </button>
          <button type="button" class="btn btn-danger" onclick={deleteFile}>
            <i class="bi bi-trash me-2"></i>
            Delete File
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .badge button { vertical-align: middle; }
  .hover-link:hover {
    color: #0d6efd !important;
    text-decoration: underline !important;
  }
  
  .list-group-item {
    padding: 12px 16px;
  }
  
  .file-info {
    flex: 1;
    min-width: 0; /* Allow truncation */
  }
  
  .action-buttons {
    flex-shrink: 0;
  }
</style>


