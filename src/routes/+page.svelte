<script lang="ts">
  import FileUpload from '$lib/components/FileUpload.svelte';
  import PoolManager from '$lib/components/PoolManager.svelte';

  let poolManager: PoolManager;

  async function handleUploadComplete() {
    console.log('Files uploaded successfully');
    // Refresh the pool manager to show the new files
    if (poolManager) {
      await poolManager.refresh();
    }
  }
</script>

<svelte:head>
  <title>Simple Knowledge Pool AI</title>
</svelte:head>

<!-- Hero Section -->
<div class="hero-section">
  <div class="container py-5">
    <div class="row justify-content-center text-center text-white">
      <div class="col-lg-8">
        <h1 class="display-4 fw-bold mb-4 text-shadow">
          <i class="bi bi-brain me-3"></i>Simple Knowledge Pool AI
        </h1>
        <p class="lead mb-4 text-shadow">
          Transform your documents into intelligent, searchable knowledge pools. 
          Upload your files and start having conversations with your data.
        </p>
        <div class="d-flex justify-content-center gap-3 mb-4">
          <span class="badge bg-white bg-opacity-90 text-primary fs-6 px-3 py-2 shadow-sm">
            <i class="bi bi-file-earmark-text me-2"></i>Markdown
          </span>
          <span class="badge bg-white bg-opacity-90 text-primary fs-6 px-3 py-2 shadow-sm">
            <i class="bi bi-file-earmark-pdf me-2"></i>PDF
          </span>
          <span class="badge bg-white bg-opacity-90 text-primary fs-6 px-3 py-2 shadow-sm">
            <i class="bi bi-file-earmark-text me-2"></i>Text
          </span>
        </div>
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
        <div class="card-header bg-white border-0 pb-0">
          <h3 class="card-title text-primary mb-0">
            <i class="bi bi-cloud-upload me-2"></i>Upload Your Documents
          </h3>
          <p class="text-muted mt-2 mb-0">Start by uploading your knowledge files</p>
        </div>
        <div class="card-body">
          <FileUpload onUploadComplete={handleUploadComplete} on:upload={handleUploadComplete} />
        </div>
      </div>
    </div>

    <!-- Pool Management Section -->
    <div class="col-12">
      <div class="card shadow-sm border-0 h-100">
        <div class="card-header bg-white border-0 pb-0">
          <h3 class="card-title text-primary mb-0">
            <i class="bi bi-collection me-2"></i>Knowledge Pools
          </h3>
          <p class="text-muted mt-2 mb-0">Organize and manage your document collections</p>
        </div>
        <div class="card-body">
          <PoolManager bind:this={poolManager} />
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
  /* Hero Section with beautiful gradient background */
  .hero-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
    position: relative;
    min-height: 60vh;
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
    animation: floatPattern 20s ease-in-out infinite;
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
  
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes floatPattern {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -30px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
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
  
  .badge {
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .badge:hover {
    transform: translateY(-1px);
  }
  
  /* Body background enhancement */
  body {
    background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
    min-height: 100vh;
  }
</style>
