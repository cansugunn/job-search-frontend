export type WorkingPreference = 'FULLTIME' | 'PARTTIME' | 'REMOTE' | 'HYBRID';

export interface CountryDto {
  id: string;
  name: string;
}

export interface CityDto {
  id: string;
  name: string;
  country: CountryDto;
}

export interface TownDto {
  id: string;
  name: string;
  city: CityDto;
}

export interface CompanyDto {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
}

export interface JobPostingResponseDto {
  id: string;
  title: string;
  description: string;
  company: CompanyDto;
  townId: string;
  town: string;
  cityId: string;
  city: string;
  countryId: string;
  country: string;
  workingPreference: WorkingPreference;
  salary: number | null;
  active: boolean;
  applicationCount: number;
  lastUpdatedDate: string;
}

export interface JobDetailResponseDto {
  posting: JobPostingResponseDto;
  relatedJobs: JobPostingResponseDto[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface RecentSearchResponseDto {
  position: string | null;
  town: string | null;
  city: string | null;
  country: string | null;
  workingPreference: WorkingPreference | null;
  searchedAt: string;
}

export interface AlertResponseDto {
  id: string;
  position: string;
  town: string | null;
  city: string | null;
  country: string | null;
  workingPreference: WorkingPreference | null;
  active: boolean;
  createdAt: string;
}

export interface NotificationResponseDto {
  id: string;
  jobId: string;
  jobTitle: string;
  message: string;
  type: 'JOB_ALERT' | 'RELATED_JOB';
  sent: boolean;
  createdAt: string;
}

export interface ChatResponseDto {
  reply: string;
}

export type AutocompleteResponse = string[];
