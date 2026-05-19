import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { autocompletePositions, getJobsByCity, getRecentSearches, searchJobs } from '../api';
import { useAuth } from '../AuthContext';
import JobCard from '../components/JobCard';
import CityAutocomplete from '../components/CityAutocomplete';
import type { JobPostingResponseDto, RecentSearchResponseDto, WorkingPreference } from '../types';

const WP_LABELS: Record<string, string> = {
  FULLTIME: 'Full Time', PARTTIME: 'Part Time', REMOTE: 'Remote', HYBRID: 'Hybrid',
};

async function reverseGeocodeCity(): Promise<string | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.county || null;
          resolve(city);
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

export default function HomePage() {
  const navigate = useNavigate();
  const { loggedIn } = useAuth();

  const [position, setPosition] = useState('');
  const [city, setCity] = useState('');
  const [workingPreference, setWorkingPreference] = useState<WorkingPreference | ''>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [cityJobs, setCityJobs] = useState<JobPostingResponseDto[]>([]);
  const [cityJobsLoading, setCityJobsLoading] = useState(true);

  const [recentSearches, setRecentSearches] = useState<RecentSearchResponseDto[]>([]);

  // Detect city on load
  useEffect(() => {
    (async () => {
      const geo = await reverseGeocodeCity();
      const targetCity = geo || 'Istanbul';
      setDetectedCity(targetCity);
      setCityJobsLoading(true);
      try {
        // Try city-specific jobs (ask for 8 so we can reliably check >= 5)
        const cityList = await getJobsByCity(targetCity, 8);
        if (cityList.length >= 5) {
          setCityJobs(cityList);
        } else {
          // Not enough city postings — fall back to general (no city filter)
          const general = await searchJobs({ size: 8 });
          if (general.content.length > 0) {
            setCityJobs(general.content);
            if (cityList.length === 0) setDetectedCity(null);
          } else {
            setCityJobs(cityList);
          }
        }
      } catch {
        // Any error — show general postings
        try {
          const general = await searchJobs({ size: 8 });
          setCityJobs(general.content);
          setDetectedCity(null);
        } catch { /* ignore */ }
      } finally {
        setCityJobsLoading(false);
      }
    })();

    if (loggedIn) {
      getRecentSearches().then(setRecentSearches).catch(() => {});
    }
  }, [loggedIn]);

  async function handlePositionChange(val: string) {
    setPosition(val);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await autocompletePositions(val);
        setSuggestions(res ?? []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (position) params.set('position', position);
    if (city) params.set('city', city);
    if (workingPreference) params.set('workingPreference', workingPreference);
    navigate(`/search?${params.toString()}`);
  }

  function applyRecentSearch(search: RecentSearchResponseDto) {
    const isUUID = (v: string | null) =>
      !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
    const params = new URLSearchParams();
    if (search.position)                       params.set('position', search.position);
    if (search.city && !isUUID(search.city))   params.set('city', search.city);
    if (search.workingPreference)              params.set('workingPreference', search.workingPreference);
    navigate(`/search?${params.toString()}`);
  }

  function recentSearchLabel(s: RecentSearchResponseDto): string {
    const clean = (v: string | null) =>
      v && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v : null;
    const locationParts = [clean(s.town), clean(s.city), clean(s.country)].filter(Boolean);
    const location = locationParts.length ? locationParts.join(', ') : null;
    const wp = s.workingPreference ? (WP_LABELS[s.workingPreference] ?? s.workingPreference) : null;
    return [s.position, location, wp].filter(Boolean).join(' – ') || 'All Listings';
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: '2rem', color: '#1a73e8', marginBottom: 8 }}>Search Jobs, Find Your Career</h1>
        <p style={{ color: '#666' }}>The widest job listings platform</p>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        {/* Position autocomplete */}
        <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
          <input
            type="text"
            placeholder="Position, title or company..."
            value={position}
            onChange={e => handlePositionChange(e.target.value)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#fff', border: '1px solid #ddd', borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,.1)', zIndex: 200,
              maxHeight: 220, overflowY: 'auto',
            }}>
              {suggestions.map(s => (
                <div
                  key={s}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem' }}
                  onMouseDown={() => { setPosition(s); setShowSuggestions(false); }}
                >
                  🔍 {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* City autocomplete */}
        <CityAutocomplete value={city} onChange={setCity} placeholder="Select city..." />

        <select
          value={workingPreference}
          onChange={e => setWorkingPreference(e.target.value as WorkingPreference | '')}
          style={{ flex: 1, minWidth: 130 }}
        >
          <option value="">Work Type</option>
          <option value="FULLTIME">Full Time</option>
          <option value="PARTTIME">Part Time</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
        </select>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {/* Son Aramalarım — always visible when logged in */}
      {loggedIn && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 8 }}>
            Recent Searches
          </p>
          {recentSearches.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: '#aaa', margin: 0 }}>
              No saved searches yet. They will appear here as you search.
            </p>
          ) : (
            <div className="recent-searches">
              {recentSearches.map(s => (
                <button
                  key={s.searchedAt}
                  className="recent-search-chip"
                  onClick={() => applyRecentSearch(s)}
                  title={recentSearchLabel(s)}
                >
                  {recentSearchLabel(s)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* City jobs */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            {detectedCity ? `${detectedCity} Job Listings` : 'Popular Listings'}
            {detectedCity && (
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#888', marginLeft: 8 }}>
                (from your location)
              </span>
            )}
          </h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(detectedCity ? `/search?city=${detectedCity}` : '/search')}
          >
            View All →
          </button>
        </div>

        {cityJobsLoading ? (
          <div className="spinner">Detecting location and loading listings...</div>
        ) : cityJobs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#888' }}>
            No listings found in this city.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {cityJobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 32, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Remote'].map(label => (
          <button
            key={label}
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(
              label === 'Remote'
                ? '/search?workingPreference=REMOTE'
                : `/search?city=${label}`
            )}
          >
            {label} Jobs
          </button>
        ))}
      </div>

      {/* AI Chat teaser */}
      <div className="card" style={{ marginTop: 28, background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)', color: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ marginBottom: 6 }}>AI Job Search Assistant</h3>
            <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>
              Search, apply, and reach your career goals with AI.
            </p>
          </div>
          <button
            className="btn"
            style={{ background: '#fff', color: '#1a73e8', fontWeight: 600 }}
            onClick={() => navigate('/chat')}
          >
            Open Assistant →
          </button>
        </div>
      </div>
    </div>
  );
}
