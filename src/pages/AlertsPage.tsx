import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAlerts, createAlert, deleteAlert, getCountries, getCities, getTowns } from '../api';
import { useAuth } from '../AuthContext';
import WorkingPreferenceBadge from '../components/WorkingPreferenceBadge';
import type { AlertResponseDto, CountryDto, CityDto, TownDto, WorkingPreference } from '../types';

export default function AlertsPage() {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<AlertResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Location data
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [towns, setTowns] = useState<TownDto[]>([]);

  // Form state
  const [position, setPosition] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryDto | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityDto | null>(null);
  const [selectedTownName, setSelectedTownName] = useState('');
  const [workingPreference, setWorkingPreference] = useState<WorkingPreference | ''>('');

  useEffect(() => {
    if (!loggedIn) { navigate('/login'); return; }
    loadAlerts();
    getCountries().then(setCountries).catch(() => {});
  }, [loggedIn]);

  // Load cities when country changes
  useEffect(() => {
    setCities([]);
    setSelectedCity(null);
    setTowns([]);
    setSelectedTownName('');
    if (!selectedCountry) return;
    getCities({ countryId: selectedCountry.id, size: 100 })
      .then(setCities)
      .catch(() => {});
  }, [selectedCountry]);

  // Load towns when city changes
  useEffect(() => {
    setTowns([]);
    setSelectedTownName('');
    if (!selectedCity) return;
    getTowns({ cityId: selectedCity.id, size: 100 })
      .then(setTowns)
      .catch(() => {});
  }, [selectedCity]);

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

  function resetForm() {
    setPosition('');
    setSelectedCountry(null);
    setSelectedCity(null);
    setSelectedTownName('');
    setWorkingPreference('');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!selectedCountry) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await createAlert({
        position,
        country: selectedCountry.name,
        city: selectedCity?.name || undefined,
        town: selectedTownName || undefined,
        workingPreference: workingPreference || undefined,
      });
      setMsg({ type: 'success', text: 'Alert created!' });
      resetForm();
      await loadAlerts();
    } catch {
      setMsg({ type: 'error', text: 'Failed to create alert.' });
    } finally {
      setSubmitting(false);
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
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                required
                placeholder="React Developer"
              />
            </div>

            <div className="form-group">
              <label>Country *</label>
              <select
                value={selectedCountry?.id ?? ''}
                onChange={e => {
                  const c = countries.find(x => x.id === e.target.value) ?? null;
                  setSelectedCountry(c);
                }}
                required
              >
                <option value="">Select country...</option>
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>City</label>
              <select
                value={selectedCity?.id ?? ''}
                onChange={e => {
                  const c = cities.find(x => x.id === e.target.value) ?? null;
                  setSelectedCity(c);
                }}
                disabled={!selectedCountry || cities.length === 0}
              >
                <option value="">{selectedCountry ? 'Select city...' : 'Select country first'}</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Town / District</label>
              <select
                value={selectedTownName}
                onChange={e => setSelectedTownName(e.target.value)}
                disabled={!selectedCity || towns.length === 0}
              >
                <option value="">{selectedCity ? 'Select town...' : 'Select city first'}</option>
                {towns.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Work Type</label>
              <select
                value={workingPreference}
                onChange={e => setWorkingPreference(e.target.value as WorkingPreference | '')}
              >
                <option value="">All</option>
                <option value="FULLTIME">Full Time</option>
                <option value="PARTTIME">Part Time</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Alert'}
          </button>
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
              {alert.country && <span style={{ marginLeft: 8, color: '#666', fontSize: '0.9rem' }}>🌍 {alert.country}</span>}
              {alert.city && <span style={{ marginLeft: 8, color: '#666', fontSize: '0.9rem' }}>📍 {alert.city}</span>}
              {alert.town && <span style={{ marginLeft: 8, color: '#666', fontSize: '0.9rem' }}>🏘 {alert.town}</span>}
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
