<script lang="ts">
	let { onUploadComplete = () => {} } = $props<{ onUploadComplete?: () => void }>();

	let filesToUpload = $state<FileList | null>(null);
	let isDragging = $state(false);
	let uploadStatus = $state('');

	const allowedTypes = ['text/markdown', 'application/pdf', 'text/plain'];

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			filesToUpload = target.files;
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files) {
			filesToUpload = event.dataTransfer.files;
		}
	}

	async function handleUpload() {
		if (!filesToUpload || filesToUpload.length === 0) {
			uploadStatus = 'Please select files to upload.';
			return;
		}

		const formData = new FormData();
		const validFiles: File[] = [];

		if (!filesToUpload) return;
		for (const file of filesToUpload as any as File[]) {
			if (allowedTypes.includes(file.type) || file.name.endsWith('.md')) {
				formData.append('files', file);
				validFiles.push(file);
			} else {
				console.warn(`Skipping unsupported file type: ${file.name} (${file.type})`);
			}
		}

		if (validFiles.length === 0) {
			uploadStatus = 'No supported files selected (Markdown, PDF, TXT).';
			filesToUpload = null;
			return;
		}

		uploadStatus = 'Uploading...';

		try {
			const response = await fetch('/api/files/upload', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				uploadStatus = `Successfully uploaded: ${result.files.join(', ')}`;
				onUploadComplete(); // Notify parent component
			} else {
				const error = await response.json();
				uploadStatus = `Error: ${error.message}`;
			}
		} catch (error) {
			uploadStatus = 'An unexpected error occurred.';
			console.error(error);
		}

		filesToUpload = null; // Reset after upload
	}
</script>

<div class="upload-container">
	<h2>Upload Knowledge Files</h2>
	<div
		class="drop-zone"
		role="button"
		tabindex="0"
		class:dragging={isDragging}
		ondragenter={() => (isDragging = true)}
		ondragleave={() => (isDragging = false)}
		ondragover={(e: DragEvent) => e.preventDefault()}
		ondrop={handleDrop}
		onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}
	>
		<p>Drag & drop files here (MD, PDF, TXT) or click to select.</p>
		<input
			type="file"
			multiple
			accept=".md,.pdf,.txt,text/markdown,application/pdf,text/plain"
			onchange={handleFileSelect}
		/>
	</div>

	{#if filesToUpload && filesToUpload.length > 0}
		<div class="file-list">
			<p>Selected files:</p>
			<ul>
				{#if filesToUpload}
					{#each Array.from(filesToUpload) as file}
						<li>{file.name} ({file.type})</li>
					{/each}
				{/if}
			</ul>
		</div>
	{/if}

	<button onclick={handleUpload} disabled={!filesToUpload}>Upload</button>

	{#if uploadStatus}
		<p class="status">{uploadStatus}</p>
	{/if}
</div>

<style>
  .upload-container {
    border: 2px solid #ccc;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    font-family: sans-serif;
  }
  .drop-zone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 40px 20px;
    position: relative;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .drop-zone.dragging {
    background-color: #f0f8ff;
    border-color: #007bff;
  }
  .drop-zone input[type='file'] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  .file-list {
    text-align: left;
    margin-top: 10px;
  }
  button {
    margin-top: 15px;
    padding: 10px 20px;
    border: none;
    background-color: #007bff;
    color: white;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  button:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
  button:hover:not(:disabled) {
    background-color: #0056b3;
  }
  .status {
    margin-top: 15px;
    font-weight: bold;
  }
</style>
