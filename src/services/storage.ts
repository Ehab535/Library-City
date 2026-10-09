import { doc, setDoc, getDocs, deleteDoc, collection, query, orderBy } from 'firebase/firestore';
import { db as firebaseDb } from '../firebase';
import { ContentItem, AcademicStructure, SecuritySettings, UserProgress, UserSession } from '../types';

const DB_NAME = 'EduSecureDB';
const DB_VERSION = 1;
const STORE_CONTENT = 'content_items';
const STORE_FILES = 'content_files';

// Define the academic structure
export const ACADEMIC_STRUCTURE: AcademicStructure[] = [
  {
    year: 'First Year',
    semesters: [
      { semester: 'First Semester', subjects: ['Accounting', 'Management', 'Law', 'Political Science'] },
      { semester: 'Second Semester', subjects: [] },
    ]
  },
  {
    year: 'Second Year',
    semesters: [
      { semester: 'First Semester', subjects: ['Marketing', 'Commercial Law'] },
      { semester: 'Second Semester', subjects: [] },
    ]
  },
  {
    year: 'Third Year',
    semesters: [
      { semester: 'First Semester', subjects: ['Governmental Accounting', 'Purchasing', 'Crisis'] },
      { semester: 'Second Semester', subjects: [] },
    ]
  },
  {
    year: 'Fourth Year',
    semesters: [
      { semester: 'First Semester', subjects: ['International relations', 'Accounting Information System', 'Auditing'] },
      { semester: 'Second Semester', subjects: [] },
    ]
  }
];

// Helper to initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CONTENT)) {
        db.createObjectStore(STORE_CONTENT, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Pre-loaded sample items (Set to empty for a completely clean platform)
const INITIAL_DEMO_ITEMS: ContentItem[] = [];

export async function clearAllPlatformContent(): Promise<void> {
  localStorage.setItem('edu_seeded_v2', 'true');
  localStorage.setItem('edu_demo_deleted', 'true');
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_CONTENT, STORE_FILES], 'readwrite');
    tx.objectStore(STORE_CONTENT).clear();
    tx.objectStore(STORE_FILES).clear();
  } catch (err) {
    console.warn('Error clearing IndexedDB:', err);
  }

  try {
    const snapshot = await getDocs(collection(firebaseDb, 'contents'));
    const deletePromises = snapshot.docs.map(async (d) => {
      await deleteFileChunksFromFirestore(d.id).catch(() => {});
      await deleteDoc(d.ref).catch(() => {});
    });
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Error clearing Firestore contents:', err);
  }
}

export async function getStoredContentItems(): Promise<ContentItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CONTENT, 'readonly');
      const store = tx.objectStore(STORE_CONTENT);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as ContentItem[];
        localStorage.setItem('edu_seeded_v2', 'true');
        localStorage.setItem('edu_demo_deleted', 'true');
        const isDemoDeleted = localStorage.getItem('edu_demo_deleted');
        const filtered = isDemoDeleted ? (items || []).filter(i => i.id !== 'financial-accounting-book') : (items || []);
        resolve(filtered);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function saveInitialItems(items: ContentItem[]) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CONTENT, 'readwrite');
    const store = tx.objectStore(STORE_CONTENT);
    for (const item of items) {
      store.put(item);
    }
  } catch (err) {
    console.warn('Failed to save initial items to IndexedDB', err);
  }
}

export async function saveContentItem(item: ContentItem, fileBlob?: Blob): Promise<void> {
  const db = await openDB();
  
  if (fileBlob) {
    // Store blob in separate file store to keep content list lightweight
    const fileTx = db.transaction(STORE_FILES, 'readwrite');
    fileTx.objectStore(STORE_FILES).put({ id: item.id, blob: fileBlob });
  }

  // Keep item object in STORE_CONTENT lightweight by removing huge base64 fileDataUrl
  const cleanItem = { ...item };
  if (cleanItem.fileDataUrl && cleanItem.fileDataUrl.length > 50000) {
    delete cleanItem.fileDataUrl;
  }

  const tx = db.transaction(STORE_CONTENT, 'readwrite');
  tx.objectStore(STORE_CONTENT).put(cleanItem);
}

export async function saveContentFileBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const fileTx = db.transaction(STORE_FILES, 'readwrite');
    fileTx.objectStore(STORE_FILES).put({ id, blob });
  } catch (err) {
    console.warn('Failed to save file blob to IndexedDB:', err);
  }
}

export async function getContentFileBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const req = tx.objectStore(STORE_FILES).get(id);
      req.onsuccess = () => {
        resolve(req.result ? req.result.blob : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteContentItem(id: string): Promise<void> {
  if (id === 'financial-accounting-book') {
    localStorage.setItem('edu_demo_deleted', 'true');
  }
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_CONTENT, STORE_FILES], 'readwrite');
    tx.objectStore(STORE_CONTENT).delete(id);
    tx.objectStore(STORE_FILES).delete(id);
  } catch (err) {
    console.warn('Error deleting from IndexedDB:', err);
  }
}

/**
 * Firestore Cloud File Chunking & Syncing
 */
export async function uploadFileChunksToFirestore(
  itemId: string,
  file: Blob | File,
  onProgress?: (progress: number) => void
): Promise<void> {
  const CHUNK_SIZE = 450 * 1024; // 450 KB per chunk (base64 is ~600KB, well under 1MB limit)
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // First, clean up old chunks if re-uploading
  await deleteFileChunksFromFirestore(itemId);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const slice = file.slice(start, end);

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const commaIdx = res.indexOf(',');
        resolve(commaIdx !== -1 ? res.substring(commaIdx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(slice);
    });

    const chunkDocRef = doc(firebaseDb, 'contents', itemId, 'chunks', `chunk_${String(i).padStart(4, '0')}`);
    await setDoc(chunkDocRef, {
      index: i,
      total: totalChunks,
      data: base64Data,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }
}

export async function downloadFileChunksFromFirestore(
  itemId: string,
  mimeType: string = 'application/octet-stream',
  onProgress?: (progress: number) => void
): Promise<Blob | null> {
  try {
    const chunksRef = collection(firebaseDb, 'contents', itemId, 'chunks');
    const q = query(chunksRef, orderBy('index', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docs = snapshot.docs;
    const base64Parts: string[] = [];

    docs.forEach((d, idx) => {
      const data = d.data();
      if (data && data.data) {
        base64Parts.push(data.data);
      }
      if (onProgress) {
        onProgress(Math.round(((idx + 1) / docs.length) * 100));
      }
    });

    if (base64Parts.length === 0) return null;

    const byteArrays: Uint8Array[] = base64Parts.map(b64 => {
      const binaryString = atob(b64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    });

    const blob = new Blob(byteArrays, { type: mimeType });
    // Cache in local IndexedDB for future instant offline access
    await saveContentFileBlob(itemId, blob);
    return blob;
  } catch (err) {
    console.error('Error downloading cloud file chunks:', err);
    return null;
  }
}

export async function deleteFileChunksFromFirestore(itemId: string): Promise<void> {
  try {
    const chunksRef = collection(firebaseDb, 'contents', itemId, 'chunks');
    const snapshot = await getDocs(chunksRef);
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Error deleting cloud file chunks:', err);
  }
}

// Storage for session management
const SESSION_KEY = 'edu_active_session_v1';
const PROGRESS_KEY = 'edu_user_progress_v1';
const SECURITY_KEY = 'edu_security_settings_v1';

export function getActiveSession(): UserSession | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setActiveSession(session: UserSession | null): void {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getUserProgress(): UserProgress {
  const data = localStorage.getItem(PROGRESS_KEY);
  if (!data) return { completedIds: [], notes: {}, lastPositions: {} };
  try {
    return JSON.parse(data);
  } catch {
    return { completedIds: [], notes: {}, lastPositions: {} };
  }
}

export function saveUserProgress(progress: UserProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function getSecuritySettings(): SecuritySettings {
  const data = localStorage.getItem(SECURITY_KEY);
  if (!data) {
    return {
      watermarkEnabled: true,
      watermarkText: 'محمي - للعرض فقط - جلسة موثقة',
      singleSessionOnly: true,
      blockRightClick: true,
      blockPrint: true,
      allowAdminUpload: true,
    };
  }
  try {
    return JSON.parse(data);
  } catch {
    return {
      watermarkEnabled: true,
      watermarkText: 'محمي - للعرض فقط - جلسة موثقة',
      singleSessionOnly: true,
      blockRightClick: true,
      blockPrint: true,
      allowAdminUpload: true,
    };
  }
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  localStorage.setItem(SECURITY_KEY, JSON.stringify(settings));
}
