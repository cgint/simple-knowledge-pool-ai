import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import FileUpload from '../../src/lib/components/FileUpload.svelte';

describe('FileUpload.svelte', () => {
  it('should have a disabled upload button initially', () => {
    // Arrange
    render(FileUpload);
    const uploadButton = screen.getByRole('button', { name: /upload/i });

    // Assert
    expect(uploadButton).toBeDisabled();
  });

  it('should enable the upload button when files are selected', async () => {
    // Arrange
    const { container } = render(FileUpload);
    const [uploadButton] = screen.getAllByRole('button', { name: /upload/i });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Act
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    await fireEvent.change(fileInput, { target: { files: [file] } });

    // Assert
    expect(uploadButton).toBeEnabled();
  });
});
