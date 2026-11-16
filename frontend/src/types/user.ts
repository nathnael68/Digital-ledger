import { User, UserRole } from './auth';

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserCreateInput {
  username: string;
  full_name: string;
  password: string;
  role: UserRole;
}

export interface UserUpdateInput {
  full_name: string;
  role: UserRole;
}

export interface UserStatusInput {
  is_active: boolean;
}

export interface UserPasswordResetInput {
  new_password: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}
