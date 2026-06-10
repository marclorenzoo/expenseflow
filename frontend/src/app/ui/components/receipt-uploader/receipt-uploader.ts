import { Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-receipt-uploader',
  imports: [],
  templateUrl: './receipt-uploader.html',
  styleUrl: './receipt-uploader.scss',
})
export class ReceiptUploader {
  selectedFile = signal<File | null>(null);
  errorMessage = signal<string | null>(null);
  isDragging = signal<boolean>(false);

  previewUrl = computed(() => {
    const file = this.selectedFile();
    if (file && file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  });

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.validateFile(file);
    }
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.errorMessage.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.validateFile(file);
    }
  }

  validateFile(file: File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.errorMessage.set('Formato no permitido. Usa JPG, PNG o PDF.');
      return;
    }

    if (file.size > maxSize) {
      this.errorMessage.set('El archivo supera los 5MB.');
      return;
    }

    this.errorMessage.set(null);
    this.selectedFile.set(file);
  }
}
