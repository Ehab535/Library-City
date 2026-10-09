export type ContentType = 'video' | 'pdf' | 'audio';

export type Role = 'student' | 'admin';

export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: Role;
  loginTime: number;
  sessionToken: string;
  activeDevice: string;
  status?: string;
  year?: string;
  group?: string;
  email?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  academicYear: string;
  semester: string;
  subject: string;
  fileDataUrl?: string; // Stored in IndexedDB or Blob URL
  externalUrl?: string;
  fileSize?: string;
  duration?: string;
  totalPages?: number;
  uploadDate: string;
  viewsCount: number;
  thumbnailUrl?: string;
  hasCloudFile?: boolean;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveContentLink?: string;
}

export interface AcademicStructure {
  year: string;
  semesters: {
    semester: string;
    subjects: string[];
  }[];
}

export interface UserProgress {
  completedIds: string[];
  lastVisitedId?: string;
  notes: Record<string, string>; // contentId -> user notes
  lastPositions: Record<string, number>; // contentId -> video time or pdf page
}

export interface SecuritySettings {
  watermarkEnabled: boolean;
  watermarkText: string;
  singleSessionOnly: boolean;
  blockRightClick: boolean;
  blockPrint: boolean;
  allowAdminUpload: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: any;
  priority?: 1 | 2; // 1 = عاجل / مهم, 2 = تنبيه عادي
  targetYear?: string;
  senderName?: string;
}
