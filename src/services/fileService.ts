// src/services/fileService.ts
// FileService — now proxied through Django REST API
// Uses FormData multipart upload instead of Firebase Storage.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Uploads a file to the Django backend and returns the download URL.
 * @param file The file to upload.
 * @param path The path category (e.g., 'wiki/images').
 */
export const uploadFile = async (file: File, _path?: string): Promise<string> => {
  // For now, if /api/upload/ is not implemented, fall back to a data URL
  // This ensures the UI doesn't break while the upload endpoint is being built.
  try {
    const { auth } = await import('../FBase');
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.url || data.fileUrl || '';
    }

    // Fallback: convert to data URL for development
    console.warn('[fileService] Upload endpoint not available, using data URL fallback');
    return fileToDataUrl(file);
  } catch {
    console.warn('[fileService] Upload failed, using data URL fallback');
    return fileToDataUrl(file);
  }
};

/**
 * Uploads an image from a File.
 */
export const uploadImage = async (file: File): Promise<string> => {
  return uploadFile(file, 'images/wiki');
};

/**
 * Convert a file to a data URL as a fallback.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
