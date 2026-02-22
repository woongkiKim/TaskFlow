import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../FBase";

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload.
 * @param path The path in storage (e.g., 'wiki/images').
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;
  const storageRef = ref(storage, `${path}/${fileName}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

/**
 * Uploads an image from a URL or File.
 * (Placeholder for more complex logic if needed later)
 */
export const uploadImage = async (file: File): Promise<string> => {
  return uploadFile(file, 'images/wiki');
};
