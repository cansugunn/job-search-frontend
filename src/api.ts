import axios from 'axios';
import { supabase, getAccessToken, setCurrentToken } from './auth';
import type {
  Page, JobPostingResponseDto, JobDetailResponseDto,
  AlertResponseDto, NotificationResponseDto, ChatResponseDto,
  RecentSearchResponseDto, CityDto, CountryDto, TownDto, CompanyDto, WorkingPreference
} from './types';

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be set`);
  }
  return value.replace(/\/+$/, '');
}

const jobApi = axios.create({ baseURL: getRequiredEnv('VITE_JOB_API_BASE_URL') });
const authJobApi = axios.create({ baseURL: getRequiredEnv('VITE_JOB_API_BASE_URL') });
const notifApi = axios.create({ baseURL: getRequiredEnv('VITE_NOTIFICATION_API_BASE_URL') });
const aiApi = axios.create({ baseURL: getRequiredEnv('VITE_AI_API_BASE_URL') });

function attachAuth(instance: ReturnType<typeof axios.create>) {
  // Attach token on every request
  instance.interceptors.request.use(config => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // On 401, refresh session once and retry
  instance.interceptors.response.use(
    res => res,
    async error => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && data.session) {
          setCurrentToken(data.session.access_token);
          original.headers.Authorization = `Bearer ${data.session.access_token}`;
          return instance(original);
        }
      }
      return Promise.reject(error);
    }
  );
}
attachAuth(authJobApi);
attachAuth(notifApi);
attachAuth(aiApi);

// Jobs
export const searchJobs = (params: {
  position?: string; cityId?: string; townId?: string; countryId?: string;
  workingPreference?: WorkingPreference; page?: number; size?: number;
}) =>
  authJobApi.get<Page<JobPostingResponseDto>>('/jobs', { params }).then(r => r.data);

export const getJobDetail = (id: string) =>
  jobApi.get<JobDetailResponseDto>(`/jobs/${id}`).then(r => r.data);

export const getRelatedJobs = (id: string, page = 0, size = 5) =>
  jobApi.get<Page<JobPostingResponseDto>>(`/jobs/${id}/related`, { params: { page, size } })
    .then(r => r.data.content);

export const checkApplied = (id: string) =>
  authJobApi.get<{ applied: boolean }>(`/jobs/${id}/applied`).then(r => r.data.applied);

export const applyToJob = (id: string) =>
  authJobApi.post(`/jobs/${id}/apply`, {}).then(r => r.data);

export const autocompletePositions = (query: string, size = 10) =>
  jobApi.get<Page<string>>('/jobs/autocomplete', { params: { query, size } })
    .then(r => r.data.content);

export const getJobsByCity = (city: string, size = 8) =>
  jobApi.get<Page<JobPostingResponseDto>>('/jobs/by-city', { params: { city, size } })
    .then(r => r.data.content);

// Admin
export const createJob = (data: {
  title: string; description: string; companyId: string;
  townId: string; workingPreference: WorkingPreference; salary?: number;
}) =>
  authJobApi.post('/admin/jobs', data).then(r => r.data);

export const updateJob = (id: string, data: {
  title: string; description: string; townId: string;
  workingPreference: WorkingPreference; salary: number; active: boolean;
}) =>
  authJobApi.put(`/admin/jobs/${id}`, data).then(r => r.data);

export const getAdminJobs = (params: {
  title?: string; workingPreference?: WorkingPreference; active?: boolean;
  page?: number; size?: number;
} = {}) =>
  authJobApi.get<Page<JobPostingResponseDto>>('/admin/jobs', { params: { size: 10, ...params } }).then(r => r.data);

export const deleteJob = (id: string) =>
  authJobApi.delete(`/admin/jobs/${id}`).then(r => r.data);

// Locations
export const getCities = (params?: { query?: string; countryId?: string; size?: number }) =>
  jobApi.get<Page<CityDto>>('/cities', { params: { size: 50, ...params } })
    .then(r => r.data.content);

export const getCountries = () =>
  jobApi.get<Page<CountryDto>>('/countries', { params: { size: 100 } })
    .then(r => r.data.content);

export const getCompanies = () =>
  jobApi.get<Page<CompanyDto>>('/companies', { params: { size: 100 } })
    .then(r => r.data.content);

export const getTowns = (params?: { query?: string; cityId?: string; size?: number }) =>
  jobApi.get<Page<TownDto>>('/towns', { params: { size: 50, ...params } })
    .then(r => r.data.content);

// Recent searches
export const getRecentSearches = () =>
  authJobApi.get<Page<RecentSearchResponseDto>>('/searches/recent', { params: { size: 5 } })
    .then(r => r.data.content);

// Alerts
export const createAlert = (data: {
  position: string; town?: string; city?: string; country?: string; workingPreference?: WorkingPreference;
}) =>
  notifApi.post('/alerts', data).then(r => r.data);

export const getAlerts = (page = 0, size = 10) =>
  notifApi.get<Page<AlertResponseDto>>('/alerts', { params: { page, size } }).then(r => r.data);

export const deleteAlert = (id: string) =>
  notifApi.delete(`/alerts/${id}`).then(r => r.data);

// Notifications
export const getNotifications = (page = 0, size = 10) =>
  notifApi.get<Page<NotificationResponseDto>>('/notifications', { params: { page, size } }).then(r => r.data);

// AI Chat
export const sendChatMessage = (message: string) =>
  aiApi.post<ChatResponseDto>('/chats', { message }).then(r => r.data);
