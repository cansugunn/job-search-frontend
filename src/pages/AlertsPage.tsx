import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlerts, createAlert, deleteAlert } from '../api';
import { useAuth } from '../AuthContext';
import WorkingPreferenceBadge from '../components/WorkingPreferenceBadge';
import type { AlertResponseDto, WorkingPreference } from '../types';

export default function AlertsPage() {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<AlertResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [position, setPosition] = useState('');
  const [town, setTown] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [workingPreference, setWorkingPreference] = useState<WorkingPreference | ''>('');

  useEffect(() => {
    if (!loggedIn) { navigate('/login'); return; }
    loadAlerts();
  }, [loggedIn]);

  async function loadAlerts() {
    setLoading(true);
    try {
      setAlerts(await getAlerts());
    } catch {
      setMsg({ type: 'error', text: 'Failed to load alerts.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await createAlert({
        position,
        town: town || undefined,
        city: city || undefined,
        country: country || undefined,
        workingPreference: workingPreference || undefined,
      });
      setMsg({ type: 'success', text: 'Alert created!' });
      setPosition(''); setTown(''); setCity(''); setCountry(''); setWorkingPreference('');
      await loadAlerts();
    } catch {
      setMsg({ type: 'error', text: 'Failed to create alert.' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch {
      setMsg({ type: 'error', text: 'Failed to delete alert.' });
    }
  }

  return (
    <div>
      <h1 className="section-title">Job Alerts</h1>
      <p style={{ color: '#666', marginBottom: 20, fontSize: '0.9rem' }}>
        We will notify you when new listings matching your criteria are posted.
      </p>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Create New Alert</h3>
        <form onSubmit={handleCreate}>
          <div className="grid-2">
            <div className="form-group">
              <label>Position *</label>
              <input type="text" value={position} onChange={e => setPosition(e.target.value)} required placeholder="React Developer" />
            </div>
            <div className="form-group">
              <label>Town / District</label>
              <input type="text" value={town} onChange={e => setTown(e.target.value)} placeholder="Kadıköy, Beşiktaş..." />
            </div>
            <div className="form-group">
              <label>City</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Istanbul" />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Turkey" />
            </div>
            <div className="form-group">
              <label>Work Type</label>
              <select value={workingPreference} onChange={e => setWorkingPreference(e.target.value as WorkingPreference | '')}>
                <option value="">All</option>
                <option value="FULLTIME">Full Time</option>
                <option value="PARTTIME">Part Time</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Create Alert</button>
        </form>
      </div>

      <h2 className="section-title">My Active Alerts</h2>
      {loading ? (
        <div className="spinner">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#888' }}>
          You have not created any alerts yet.
        </div>
      ) : (
        alerts.map(alert => (
          <div key={alert.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{alert.position}</strong>
              {alert.town && <span style={{ marginLeft: 8, color: '#666', fontSize: '0.9rem' }}>🏘 {alert.town}</span>}
              {alert.city && <span style={{ marginLeft: 8, color: '#666', fontSize: '0.9rem' }}>📍 {alert.city}</span>}
              {alert.country && <span style={{ marginLeft: 8, color: '#666', fontSize: '0.9rem' }}>🌍 {alert.country}</span>}
              <div style={{ marginTop: 6 }}>
                <WorkingPreferenceBadge value={alert.workingPreference} />
                <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#999' }}>
                  {new Date(alert.createdAt).toLocaleDateString('en-US')}
                </span>
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(alert.id)}>Delete</button>
          </div>
        ))
      )}
    </div>
  );
}
