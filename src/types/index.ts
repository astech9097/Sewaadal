export type Role = "SUPERADMIN" | "ADMIN" | "INCHARGE" | "MEMBER";

export type AttendanceStatus = "P" | "PV" | "A";

export type ApprovalStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface User {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  role: Role;
  phone?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  user?: User;
  date: string;
  status: AttendanceStatus;
  approvalStatus: ApprovalStatus;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  markedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionNote?: string;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface AttendanceStats {
  total: number;
  present: number;
  presentVardi: number;
  absent: number;
  percentage: number;
}