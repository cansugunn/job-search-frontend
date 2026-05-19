import { useNavigate } from 'react-router-dom';
import type { JobPostingResponseDto } from '../types';
import WorkingPreferenceBadge from './WorkingPreferenceBadge';

export default function JobCard({ job }: { job: JobPostingResponseDto }) {
  const navigate = useNavigate();
  return (
    <div className="job-card" onClick={() => navigate(`/jobs/${job.id}`)}>
      <h3>{job.title}</h3>
      <div className="meta">
        <span>🏢 {job.company.name}</span>
        <span>📍 {job.town}, {job.city}, {job.country}</span>
        {job.salary && <span>💰 {Number(job.salary).toLocaleString('en-US')} ₺</span>}
        <span>👥 {job.applicationCount} applications</span>
      </div>
      <WorkingPreferenceBadge value={job.workingPreference} />
    </div>
  );
}
