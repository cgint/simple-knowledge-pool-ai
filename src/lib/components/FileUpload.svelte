<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let { onUploadComplete = () => {} } = $props<{ onUploadComplete?: () => void }>();

	const dispatch = createEventDispatcher();

	let filesToUpload = $state<FileList | null>(null);
	let isDragging = $state(false);
	let uploadStatus = $state('');
	let isUploading = $state(false);

	const allowedTypes = ['text/markdown', 'application/pdf', 'text/plain', 'multipart/related', 'message/rfc822'];

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
			// Automatically start upload when files are dropped
			handleUpload();
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
			const lower = file.name.toLowerCase();
			const isMht = lower.endsWith('.mht') || lower.endsWith('.mhtml');
			if (allowedTypes.includes(file.type) || file.name.endsWith('.md') || isMht) {
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

		isUploading = true;
		uploadStatus = 'Uploading...';

		try {
			const response = await fetch('/api/files/upload', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				const baseMsg = `Successfully uploaded: ${result.files.join(', ')}`;
				const pdfMsg = result.generatedPdfs && result.generatedPdfs.length ? `; Generated PDFs: ${result.generatedPdfs.join(', ')}` : '';
				uploadStatus = baseMsg + pdfMsg;
				
				// Notify parent component via both methods for compatibility
				onUploadComplete();
				dispatch('upload', { files: result.files });
			} else {
				const error = await response.json();
				uploadStatus = `Error: ${error.message}`;
			}
		} catch (error) {
			uploadStatus = 'An unexpected error occurred.';
			console.error(error);
		} finally {
			isUploading = false;
			filesToUpload = null; // Reset after upload
		}
	}
</script>

<div class="upload-wrapper">
	<!-- Drop Zone -->
	<div
		class="drop-zone p-1 text-center border border-2 border-dashed rounded-3 position-relative"
		class:border-primary={isDragging}
		class:bg-primary-subtle={isDragging}
		role="button"
		tabindex="0"
		ondragenter={() => (isDragging = true)}
		ondragleave={() => (isDragging = false)}
		ondragover={(e: DragEvent) => e.preventDefault()}
		ondrop={handleDrop}
		onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && (e.currentTarget as HTMLElement).click()}
	>
		<input
			type="file"
			multiple
			accept=".md,.pdf,.txt,.mht,.mhtml,text/markdown,application/pdf,text/plain,multipart/related,message/rfc822"
			onchange={handleFileSelect}
			class="position-absolute top-0 start-0 w-100 h-100 opacity-0"
			style="cursor: pointer;"
		/>
		
		<div class="upload-content">
			<i class="bi bi-cloud-upload display-5 text-primary mb-3"></i>
			<h5 class="mb-3">
				{isDragging ? 'Drop your files here!' : 'Drag & drop your files here'}
			</h5>
			<p class="text-muted mb-3">
				or <span class="text-primary fw-semibold">click to browse</span>
			</p>
		</div>
	</div>

	<!-- Selected Files Display -->
	{#if filesToUpload && filesToUpload.length > 0}
		<div class="mt-4">
			<h6 class="text-secondary mb-3">
				<i class="bi bi-files me-2"></i>Selected Files ({filesToUpload.length})
			</h6>
			<div class="row g-2">
				{#if filesToUpload}
					{#each Array.from(filesToUpload) as file}
						<div class="col-12 col-md-6">
							<div class="card card-body py-2 bg-light border-0">
								<div class="d-flex align-items-center">
									<i class="bi bi-file-earmark me-2 text-primary"></i>
									<div class="flex-grow-1 text-truncate">
										<small class="fw-medium">{file.name}</small>
										<div class="text-muted" style="font-size: 0.75rem;">
											{(file.size / 1024).toFixed(1)} KB
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Upload Button -->
	<div class="d-grid gap-2 mt-4">
		<button 
			class="btn btn-primary btn-lg"
			onclick={handleUpload} 
			disabled={!filesToUpload || isUploading}
		>
			{#if isUploading}
				<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
				Uploading...
			{:else}
				<i class="bi bi-upload me-2"></i>
				Upload {filesToUpload ? `${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''}` : 'Files'}
			{/if}
		</button>
	</div>

	<!-- Status Message -->
	{#if uploadStatus}
		<div class="mt-4">
			{#if uploadStatus.includes('Successfully')}
				<div class="alert alert-success d-flex align-items-center" role="alert">
					<i class="bi bi-check-circle-fill me-2"></i>
					{uploadStatus}
				</div>
			{:else if uploadStatus.includes('Error') || uploadStatus.includes('unexpected')}
				<div class="alert alert-danger d-flex align-items-center" role="alert">
					<i class="bi bi-exclamation-triangle-fill me-2"></i>
					{uploadStatus}
				</div>
			{:else if uploadStatus.includes('Uploading')}
				<div class="alert alert-info d-flex align-items-center" role="alert">
					<div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
					{uploadStatus}
				</div>
			{:else}
				<div class="alert alert-warning d-flex align-items-center" role="alert">
					<i class="bi bi-info-circle-fill me-2"></i>
					{uploadStatus}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.drop-zone {
		transition: all 0.3s ease;
		cursor: pointer;
		min-height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--bs-gray-50);
	}
	
	.drop-zone:hover {
		border-color: var(--bs-primary) !important;
		background-color: var(--bs-primary-bg-subtle);
	}
	
	.upload-content {
		pointer-events: none;
	}
	
	.badge {
		font-size: 0.75rem;
	}
</style>
