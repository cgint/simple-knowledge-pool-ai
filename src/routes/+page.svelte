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

<main>
  <h1>Simple Knowledge Pool AI</h1>

  <div class="container">
    <div class="upload-section">
      <FileUpload onUploadComplete={handleUploadComplete} on:upload={handleUploadComplete} />
    </div>

    <div class="pool-section">
      <PoolManager bind:this={poolManager} />
    </div>
  </div>
</main>

<style>
  main {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
    font-family: sans-serif;
  }

  h1 {
    text-align: center;
    margin-bottom: 40px;
  }

  .container {
    display: grid;
    gap: 40px;
  }

  .upload-section {
    grid-column: 1 / -1; /* Span full width */
  }

</style>
