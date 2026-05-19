import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications } from '../api';
import { useAuth } from '../AuthContext';
import type { NotificationResponseDto } from '../types';

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const [all, setAll] = useState<NotificationResponseDto[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loggedIn) { navigate('/login'); return; }
    getNotifications()
      .then(setAll)
      .catch(() => setError('Failed to load notifications.'))
      .finally(() => setLoading(false));
  }, [loggedIn]);

  const totalPages = Math.ceil(all.length / PAGE_SIZE);
  const items = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (loading) return <div className="spinner">Loading...</div>;

  return (
    <div>
      <h1 className="section-title">My Notifications</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {all.length > 0 && (
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>
          {all.length} notification{all.length !== 1 ? 's' : ''}
        </p>
      )}

      {all.length === 0 && !error ? (
        <div className="card" style={{ textAlign: 'center', color: '#888' }}>
          No notifications yet. Create a job alert to start receiving notifications.
        </div>
      ) : (
        <>
          {items.map(n => (
            <div
              key={n.id}
              className={`notif-item ${n.type === 'RELATED_JOB' ? 'related' : ''}`}
              style={{ cursor: n.jobId ? 'pointer' : 'default' }}
              onClick={() => n.jobId && navigate(`/jobs/${n.jobId}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className={`chip ${n.type === 'RELATED_JOB' ? 'chip-purple' : ''}`} style={{ marginBottom: 6 }}>
                    {n.type === 'JOB_ALERT' ? '🔔 Job Alert' : '🔗 Related Listing'}
                  </span>
                  <h4 style={{ margin: '6px 0 4px', fontSize: '0.95rem' }}>{n.jobTitle}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#555' }}>{n.message}</p>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#999', whiteSpace: 'nowrap', marginLeft: 12 }}>
                  {new Date(n.createdAt).toLocaleDateString('en-US')}
                </span>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >‹ Previous</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${i === page ? 'btn-primary active' : 'btn-secondary'}`}
                  onClick={() => setPage(i)}
                >{i + 1}</button>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >Next ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
