import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

// Google Drive Scopes
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize Auth Listener & Token Handler
export const initDriveAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedAccessToken) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      if (onFailure) onFailure();
    }
  });
};

export const getCachedDriveToken = (): string | null => cachedAccessToken;

// Perform Sign In with Google to obtain Drive Access Token
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم نتمكن من الحصول على تصريح الوصول لـ Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Upload a File to Google Drive
 */
export async function uploadFileToGoogleDrive(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (pct: number) => void
): Promise<{ fileId: string; webViewLink?: string; webContentLink?: string }> {
  let token = cachedAccessToken;
  if (!token) {
    const authRes = await signInWithGoogleDrive();
    if (!authRes?.accessToken) {
      throw new Error('يلزم تسجيل الدخول بحساب Google لرفع الملفات إلى Google Drive.');
    }
    token = authRes.accessToken;
  }

  // Handle small files (< 5MB) via multipart, large files via Resumable Upload
  if (file.size <= 5 * 1024 * 1024) {
    if (onProgress) onProgress(30);
    const metadata = { name: fileName, mimeType };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`فشل رفع الملف إلى Google Drive: ${errText}`);
    }

    if (onProgress) onProgress(80);
    const data = await res.json();
    const fileId = data.id;

    // Make file accessible to anyone with link for viewing
    if (onProgress) onProgress(100);

    return {
      fileId,
      webViewLink: data.webViewLink,
      webContentLink: data.webContentLink,
    };
  } else {
    // Resumable upload for larger files
    if (onProgress) onProgress(10);
    const initRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: fileName, mimeType }),
      }
    );

    if (!initRes.ok) {
      throw new Error('فشل بدء رفع الملف الضخم إلى Google Drive');
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('لم نتمكن من الحصول على رابط الرفع من Google Drive');
    }

    if (onProgress) onProgress(20);

    // Upload content in 1MB chunks to report progress
    const CHUNK_SIZE = 1024 * 1024;
    let start = 0;
    let finalData: any = null;

    while (start < file.size) {
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);
      const isLast = end === file.size;

      const chunkRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
        },
        body: chunk,
      });

      if (isLast) {
        if (!chunkRes.ok) {
          throw new Error('فشل اكتمال رفع ملف Google Drive');
        }
        finalData = await chunkRes.json();
      }

      start = end;
      if (onProgress) {
        onProgress(20 + Math.round((start / file.size) * 70));
      }
    }

    const fileId = finalData.id;
    if (onProgress) onProgress(100);

    return {
      fileId,
      webViewLink: finalData.webViewLink,
      webContentLink: finalData.webContentLink,
    };
  }
}

/**
 * Download file from Google Drive as Blob
 */
export async function downloadFileFromGoogleDrive(
  fileId: string,
  onProgress?: (pct: number) => void
): Promise<Blob | null> {
  const token = cachedAccessToken;
  try {
    let res: Response;
    if (token) {
      res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      // Files are private to the admin's Drive; without a token there is nothing to fetch
      return null;
    }

    if (!res.ok) {
      console.warn(`Failed to fetch file ${fileId} from Drive directly: status ${res.status}`);
      return null;
    }

    if (onProgress) onProgress(50);
    const blob = await res.blob();
    if (onProgress) onProgress(100);
    return blob;
  } catch (err) {
    console.error('Error downloading file from Google Drive:', err);
    return null;
  }
}
