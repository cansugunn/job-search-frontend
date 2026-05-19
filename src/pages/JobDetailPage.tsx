import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJobDetail, applyToJob, checkApplied } from '../api';
import { useAuth } from '../AuthContext';
import WorkingPreferenceBadge from '../components/WorkingPreferenceBadge';
import type { JobDetailResponseDto } from '../types';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loggedIn } = useAuth();

  const [job, setJob] = useState<JobDetailResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyMsg, setApplyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getJobDetail(id)
      .then(setJob)
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
    if (loggedIn) {
      checkApplied(id).then(setApplied).catch(() => {});
    }
  }, [id, loggedIn]);

  async function handleApply() {
    if (!id) return;
    setApplying(true);
    setApplyMsg(null);
    try {
      await applyToJob(id);
      setApplied(true);
      setApplyMsg({ type: 'success', text: 'Your application was submitted successfully!' });
      setJob(prev => prev ? {
        ...prev,
        posting: { ...prev.posting, applicationCount: prev.posting.applicationCount + 1 }
      } : prev);
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes('409') || msg.includes('already')) {
        setApplyMsg({ type: 'error', text: 'You have already applied to this listing.' });
      } else {
        setApplyMsg({ type: 'error', text: 'An error occurred while applying.' });
      }
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <div className="spinner">Loading...</div>;
  if (!job) return <div className="alert alert-error">Listing not found.</div>;

  const { posting, relatedJobs } = job;

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        <div>
          <div className="card">
            <h1 style={{ fontSize: '1.4rem', color: '#1a73e8', marginBottom: 10 }}>{posting.title}</h1>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, fontSize: '0.9rem', color: '#555' }}>
              <span>🏢 {posting.company.name}</span>
              <span>📍 {posting.town}, {posting.city}, {posting.country}</span>
              {posting.salary && <span>💰 {Number(posting.salary).toLocaleString('en-US')} ₺</span>}
              <span>👥 {posting.applicationCount} applications</span>
            </div>
            <WorkingPreferenceBadge value={posting.workingPreference} />
            <p style={{ marginTop: 6, fontSize: '0.8rem', color: '#999' }}>
              Updated: {new Date(posting.lastUpdatedDate).toLocaleDateString('en-US')}
            </p>

            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #eee' }} />

            <h3 style={{ marginBottom: 12, color: '#333' }}>Job Description</h3>
            <div style={{ lineHeight: 1.7, color: '#444', whiteSpace: 'pre-wrap' }}>
              {posting.description}
            </div>
          </div>

          {applyMsg && (
            <div className={`alert alert-${applyMsg.type}`}>{applyMsg.text}</div>
          )}
        </div>

        <div>
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: '1rem' }}>Apply</h3>
            {!loggedIn ? (
              <>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 12 }}>
                  You need to sign in to apply.
                </p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
                  Sign In
                </button>
              </>
            ) : applied ? (
              <button className="btn" style={{ width: '100%', background: '#e8f5e9', color: '#2e7d32', cursor: 'default' }} disabled>
                Applied ✓
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? 'Applying...' : 'Apply'}
              </button>
            )}
          </div>

          {relatedJobs.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 14, fontSize: '1rem', color: '#555' }}>Similar Listings</h3>
              {relatedJobs.map(r => (
                <div
                  key={r.id}
                  className="related-job-card"
                  onClick={() => navigate(`/jobs/${r.id}`)}
                >
                  <h4>{r.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 4 }}>
                    {r.company.name} · {r.town}, {r.city}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
