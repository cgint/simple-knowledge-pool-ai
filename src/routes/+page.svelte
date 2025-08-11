<script lang="ts">
  import FileUpload from '$lib/components/FileUpload.svelte';
  import TagManager from '$lib/components/TagManager.svelte';

  let tagManager: TagManager;

  // Modal state - moved here from TagManager for proper component architecture
  interface ExtractionData {
    summary: string;
    keyPoints: string[];
    categories: string[];
    extractedAt: number;
  }
  
  let showModal = $state(false);
  let modalExtraction: ExtractionData | null = $state(null);
  let modalFilename = $state('');

  async function handleUploadComplete() {
    console.log('Files uploaded successfully');
    // Refresh tag manager to show the new files
    if (tagManager) await tagManager.reload();
  }

  function showExtractionModal(event: CustomEvent<{filename: string, extraction: ExtractionData}>) {
    modalFilename = event.detail.filename;
    modalExtraction = event.detail.extraction;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    modalExtraction = null;
    modalFilename = '';
  }
</script>

<svelte:head>
  <title>Simple Knowledge Pool AI</title>
</svelte:head>

<!-- Header Section -->
<div class="hero-section">
  <div class="container py-5">
    <div class="row justify-content-center text-center text-white">
      <div class="col-12">
        <h1 class="h2 fw-bold mb-0 text-shadow">
          Simple Knowledge Pool AI
        </h1>
      </div>
    </div>
  </div>
</div>

<!-- Main Content -->
<div class="container py-5">
  <div class="row g-4">
    <!-- Upload Section -->
    <div class="col-12">
      <div class="card shadow-sm border-0 h-100">
        <div class="card-body">
          <FileUpload onUploadComplete={handleUploadComplete} on:upload={handleUploadComplete} />
        </div>
      </div>
    </div>

    <!-- Tag Management Section (replaces pools) -->
    <div class="col-12">
      <div class="card shadow-sm border-0 h-100">
        <div class="card-body">
          <TagManager bind:this={tagManager} on:showExtraction={showExtractionModal} />
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Footer -->
<footer class="bg-dark text-light py-4 mt-5">
  <div class="container">
    <div class="row align-items-center">
      <div class="col-md-6">
        <p class="mb-0">
          <i class="bi bi-lightning-charge me-2"></i>
          Powered by AI • Built with SvelteKit
        </p>
      </div>
      <div class="col-md-6 text-md-end">
        <small class="text-light-emphasis">
          Transform your documents into intelligent conversations
        </small>
      </div>
    </div>
  </div>
</footer>

<style>
  /* Header Section with beautiful gradient background */
  .hero-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    position: relative;
    min-height: auto;
    display: flex;
    align-items: center;
  }
  
  .hero-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%);
  }
  
  .hero-section::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
  }
  
  .hero-section .container {
    position: relative;
    z-index: 2;
  }
  
  .text-shadow {
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  

  
  /* Card enhancements */
  .card {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    border: 0;
  }
  
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
  }
  
  /* Modal styles */
  .modal-content {
    border: none;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  }
  
  .modal-body {
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .list-group-item {
    border: none !important;
    padding: 0.25rem 0;
  }

</style>

<!-- Extraction Modal - positioned at root level for proper overlay -->
{#if showModal && modalExtraction}
  <div 
    class="modal show d-block position-fixed top-0 start-0 w-100 h-100" 
    style="background-color: rgba(0,0,0,0.5); z-index: 9999;" 
    onclick={closeModal}
    onkeydown={(e) => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div 
      class="modal-dialog modal-lg" 
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modal-title">
            <i class="bi bi-file-text me-2"></i>
            Document Extracts: {modalFilename}
          </h5>
          <button type="button" class="btn-close" onclick={closeModal} aria-label="Close modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-4">
            <h6 class="text-primary mb-2">
              <i class="bi bi-card-text me-1"></i>Summary
            </h6>
            <p class="text-muted">{modalExtraction.summary}</p>
          </div>
          
          <div class="mb-4">
            <h6 class="text-primary mb-2">
              <i class="bi bi-list-ul me-1"></i>Key Points
            </h6>
            <ul class="list-group list-group-flush">
              {#each modalExtraction.keyPoints as point}
                <li class="list-group-item border-0 px-0">
                  <i class="bi bi-arrow-right-short text-primary me-1"></i>
                  {point}
                </li>
              {/each}
            </ul>
          </div>
          
          <div class="mb-3">
            <h6 class="text-primary mb-2">
              <i class="bi bi-tags me-1"></i>Categories
            </h6>
            <div class="d-flex flex-wrap gap-2">
              {#each modalExtraction.categories as category}
                <span class="badge bg-secondary">{category}</span>
              {/each}
            </div>
          </div>
          
          <div class="text-end">
            <small class="text-muted">
              Extracted on {new Date(modalExtraction.extractedAt).toLocaleString()}
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeModal}>Close</button>
        </div>
      </div>
    </div>
  </div>
{/if}
