<script lang="ts">
  import FileUpload from '$lib/components/FileUpload.svelte';
  import TagManager from '$lib/components/TagManager.svelte';

  let tagManager: TagManager;

  async function handleUploadComplete() {
    console.log('Files uploaded successfully');
    // Refresh tag manager to show the new files
    if (tagManager) await tagManager.reload();
  }
</script>

<svelte:head>
  <title>Simple Knowledge Pool AI</title>
</svelte:head>

<!-- Header Section -->
<div class="hero-section">
  <div class="container py-3">
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

    <!-- Tag Management Section (replaces pools) -->
    <div class="col-12">
      <div class="card shadow-sm border-0 h-100">
        <div class="card-body">
          <TagManager bind:this={tagManager} />
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
    background-size: 400% 400%;
    animation: gradientShift 15s ease infinite;
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
  

</style>
