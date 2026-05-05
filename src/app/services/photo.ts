// src/app/services/photo.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  // Version stockage local - fonctionne sans CORS
  async uploadProfilePhoto(file: File, userId: number, type: 'admin' | 'etudiant' | 'formateur'): Promise<string> {
    console.log('Upload photo pour:', type, userId);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Stocker dans localStorage
        const storageKey = `photo_${type}_${userId}`;
        localStorage.setItem(storageKey, base64);
        console.log('Photo sauvegardée dans localStorage avec clé:', storageKey);
        resolve(base64);
      };
      reader.onerror = (error) => {
        console.error('Erreur lecture fichier:', error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }

  async deleteOldPhoto(photoUrl: string): Promise<void> {
    console.log('Suppression photo (non nécessaire pour stockage local)');
  }

  getStoredPhoto(type: string, userId: number): string | null {
    return localStorage.getItem(`photo_${type}_${userId}`);
  }
}
