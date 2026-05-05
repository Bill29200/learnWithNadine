// src/app/shared/photo-upload/photo-upload.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {PhotoService} from '../../services/photo';


@Component({
  selector: 'app-photo-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="photo-upload-container">
      <div class="photo-preview" (click)="triggerFileInput()">
        <img *ngIf="currentPhotoUrl" [src]="currentPhotoUrl" alt="Photo de profil" class="profile-photo rounded-circle">
        <div *ngIf="!currentPhotoUrl && !previewUrl" class="photo-placeholder rounded-circle">
          <i class="bi bi-camera-fill"></i>
          <span>Ajouter une photo</span>
        </div>
        <img *ngIf="!currentPhotoUrl && previewUrl" [src]="previewUrl" alt="Preview" class="profile-photo rounded-circle">
        <div class="photo-overlay" *ngIf="currentPhotoUrl || previewUrl">
          <i class="bi bi-pencil-fill"></i>
        </div>
      </div>
      <input type="file" #fileInput accept="image/*" (change)="onFileSelected($event)" style="display: none">
      <div *ngIf="uploading" class="upload-spinner">
        <div class="spinner-border spinner-border-sm text-orange" role="status">
          <span class="visually-hidden">Upload...</span>
        </div>
      </div>
      <div *ngIf="error" class="text-danger small mt-1 text-center">{{error}}</div>
      <div *ngIf="!currentPhotoUrl && !previewUrl" class="text-muted small mt-1 text-center">
        Cliquez pour ajouter une photo
      </div>
    </div>
  `,
  styles: [`
    .photo-upload-container {
      position: relative;
      display: inline-block;
      width: 100%;
      text-align: center;
    }
    .photo-preview {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      position: relative;
      border: 3px solid #ff5928;
      transition: all 0.3s ease;
      margin: 0 auto;
    }
    .photo-preview:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 15px rgba(255, 89, 40, 0.3);
    }
    .profile-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .photo-placeholder i {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    .photo-placeholder span {
      font-size: 0.75rem;
    }
    .photo-overlay {
      position: absolute;
      bottom: 0;
      right: 0;
      background: #ff5928;
      border-radius: 50%;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: all 0.3s ease;
    }
    .photo-overlay:hover {
      transform: scale(1.1);
    }
    .upload-spinner {
      position: absolute;
      bottom: -10px;
      right: 50%;
      transform: translateX(50%);
    }
    @media (max-width: 768px) {
      .photo-preview {
        width: 100px;
        height: 100px;
      }
      .photo-placeholder i {
        font-size: 1.5rem;
      }
      .photo-placeholder span {
        font-size: 0.65rem;
      }
    }
  `]
})
export class PhotoUploadComponent {
  @Input() currentPhotoUrl: string | null = null;
  @Output() photoUploaded = new EventEmitter<File>();
  @Output() photoRemoved = new EventEmitter<void>();

  previewUrl: string | null = null;
  selectedFile: File | null = null;
  uploading = false;
  error = '';

  constructor(private photoService: PhotoService) {}

  triggerFileInput() {
    const fileInput = document.querySelector('#photo-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      this.error = 'Veuillez sélectionner une image';
      this.clearFileInput();
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.error = 'L\'image ne doit pas dépasser 5MB';
      this.clearFileInput();
      return;
    }

    this.error = '';
    this.selectedFile = file;

    // Créer un aperçu
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Émettre le fichier pour upload
    this.photoUploaded.emit(file);
  }

  async uploadPhoto(userId: number, type: 'admin' | 'etudiant' | 'formateur'): Promise<string | null> {
    if (!this.selectedFile) return null;

    this.uploading = true;
    this.error = '';

    try {
      const photoUrl = await this.photoService.uploadProfilePhoto(
        this.selectedFile,
        userId,
        type
      );

      this.currentPhotoUrl = photoUrl;
      this.previewUrl = null;
      this.selectedFile = null;

      return photoUrl;
    } catch (error) {
      console.error('Erreur upload photo:', error);
      this.error = 'Erreur lors de l\'upload de la photo';
      return null;
    } finally {
      this.uploading = false;
      this.clearFileInput();
    }
  }

  clearPhoto() {
    this.selectedFile = null;
    this.previewUrl = null;
    this.error = '';
    this.photoRemoved.emit();
    this.clearFileInput();
  }

  private clearFileInput() {
    const input = document.querySelector('#photo-file-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  reset() {
    this.selectedFile = null;
    this.previewUrl = null;
    this.error = '';
    this.uploading = false;
    this.clearFileInput();
  }
}
