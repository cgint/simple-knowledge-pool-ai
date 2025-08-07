<script lang="ts">
  // Svelte 5 runes available

  let availableFiles = $state<string[]>([]);
  let fileToTags = $state<Record<string, string[]>>({});
  let tagInputByFile = $state<Record<string, string>>({});
  let globalTagSuggestions = $state<string[]>([]);
  let loading = $state(false);
  let savingFor: string | null = $state(null);
  let newTagInput = $state('');

  async function loadFiles() {
    const res = await fetch('/api/files');
    if (res.ok) {
      availableFiles = await res.json();
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

  async function refresh() {
    loading = true;
    try {
      await Promise.all([loadFiles(), loadTags()]);
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
          <a class="btn btn-sm btn-primary" href={`/chat/tag:${encodeURIComponent(t)}`}>
            <i class="bi bi-chat-dots me-1"></i>{t}
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
        <div class="list-group-item d-flex align-items-center justify-content-between gap-2">
          <div class="file-name text-truncate me-2">
            <i class="bi bi-file-earmark-text text-primary me-2"></i>
            {file}
          </div>
          <div class="flex-grow-1 d-flex align-items-center gap-2 overflow-auto text-nowrap">
            <div class="tags d-flex align-items-center gap-2">
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

            {#if globalTagSuggestions.length > 0}
              <div class="quick-tags d-inline-flex align-items-center gap-1 ms-3 text-nowrap">
                <span class="text-muted small">Quick apply:</span>
                {#each globalTagSuggestions as t}
                  <button class="btn btn-sm btn-light" onclick={() => addQuickTag(file, t)}>{t}</button>
                {/each}
              </div>
            {/if}
          </div>

          <a class="btn btn-sm btn-primary ms-2" href={`/chat/file:${encodeURIComponent(file)}`}>
            <i class="bi bi-chat-dots me-1"></i> Chat
          </a>

          <div class="ms-2" style="width: 28px;">
            {#if savingFor === file}
              <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .file-name { max-width: 30%; }
  .quick-tags { display: flex; flex-wrap: wrap; }
  .badge button { vertical-align: middle; }
</style>


