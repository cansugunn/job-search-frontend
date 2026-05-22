import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchJobs, getCountries, getCities, getTowns } from '../api';
import JobCard from '../components/JobCard';
import type { JobPostingResponseDto, Page, WorkingPreference } from '../types';

interface Option { id: string; name: string; }

const WP_LABELS: Record<string, string> = {
  FULLTIME: 'Full Time', PARTTIME: 'Part Time', REMOTE: 'Remote', HYBRID: 'Hybrid',
};

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [position, setPosition] = useState(searchParams.get('position') ?? '');
  const [workingPreference, setWorkingPreference] = useState<WorkingPreference | ''>(
    (searchParams.get('workingPreference') as WorkingPreference) ?? ''
  );
  const [countryId, setCountryId] = useState(searchParams.get('countryId') ?? '');
  const [cityId, setCityId] = useState(searchParams.get('cityId') ?? '');
  const [townId, setTownId] = useState(searchParams.get('townId') ?? '');

  const [page, setPage] = useState(0);
  const [result, setResult] = useState<Page<JobPostingResponseDto> | null>(null);
  const [countries, setCountries] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [towns, setTowns] = useState<Option[]>([]);
  const [optionNames, setOptionNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Prevent search from firing until any ?city=text resolution is done
  const [resolved, setResolved] = useState(
    !searchParams.get('city') || !!searchParams.get('cityId')
  );

  // Prevent cascade effects from clearing sibling state on initial mount
  const countryInitRef = useRef(false);
  const cityInitRef = useRef(false);
  // Used to set cityId after country's cities have loaded (during text resolution)
  const pendingCityIdRef = useRef<string | null>(null);

  const rememberOptionNames = useCallback((options: Option[]) => {
    setOptionNames(prev => {
      let changed = false;
      const next = { ...prev };
      for (const option of options) {
        if (next[option.id] !== option.name) {
          next[option.id] = option.name;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Load countries once
  useEffect(() => {
    getCountries()
      .then(list => {
        const options = list as Option[];
        setCountries(options);
        rememberOptionNames(options);
      })
      .catch(() => {});
  }, [rememberOptionNames]);

  // One-time: if ?city=text arrived from home page, resolve it to precise countryId/cityId
  useEffect(() => {
    const cityText = searchParams.get('city');
    if (!cityText || searchParams.get('cityId')) return;

    getCities({ query: cityText, size: 1 })
      .then(results => {
        if (results.length) {
          const found = results[0];
          pendingCityIdRef.current = found.id;
          rememberOptionNames([
            { id: found.country.id, name: found.country.name },
            { id: found.id, name: found.name },
          ]);
          setCountryId(found.country.id);
          const next = Object.fromEntries(searchParams.entries());
          delete next.city;
          next.countryId = found.country.id;
          next.cityId = found.id;
          setSearchParams(next, { replace: true });
        }
        setResolved(true);
      })
      .catch(() => setResolved(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cascade: country → cities
  useEffect(() => {
    if (!countryId) {
      setCities([]);
      if (countryInitRef.current) { setCityId(''); setTowns([]); setTownId(''); }
      countryInitRef.current = true;
      return;
    }
    getCities({ countryId })
      .then(list => {
        const options = list.map(c => ({ id: c.id, name: c.name }));
        setCities(options);
        rememberOptionNames(options);
        if (pendingCityIdRef.current) {
          setCityId(pendingCityIdRef.current);
          pendingCityIdRef.current = null;
        }
      })
      .catch(() => setCities([]));
    if (countryInitRef.current) { setCityId(''); setTowns([]); setTownId(''); }
    countryInitRef.current = true;
  }, [countryId, rememberOptionNames]);

  // Cascade: city → towns
  useEffect(() => {
    if (!cityId) {
      setTowns([]);
      if (cityInitRef.current) setTownId('');
      cityInitRef.current = true;
      return;
    }
    getTowns({ cityId })
      .then(list => {
        const options = list.map(t => ({ id: t.id, name: t.name }));
        setTowns(options);
        rememberOptionNames(options);
      })
      .catch(() => setTowns([]));
    if (cityInitRef.current) setTownId('');
    cityInitRef.current = true;
  }, [cityId, rememberOptionNames]);

  // Search whenever URL params change (but only after resolution is done)
  useEffect(() => {
    if (!resolved) return;
    doSearch(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, resolved]);

  async function doSearch(p: number) {
    setLoading(true);
    setError('');
    try {
      const params: Parameters<typeof searchJobs>[0] = { page: p, size: 10 };
      const pos = searchParams.get('position');
      const co  = searchParams.get('countryId');
      const ci  = searchParams.get('cityId');
      const to  = searchParams.get('townId');
      const wp  = searchParams.get('workingPreference');
      if (pos) params.position          = pos;
      if (co)  params.countryId         = co;
      if (ci)  params.cityId            = ci;
      if (to)  params.townId            = to;
      if (wp)  params.workingPreference = wp as WorkingPreference;
      const res = await searchJobs(params);
      setResult(res);
      setPage(p);
    } catch {
      setError('Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (position)           params.position          = position;
    if (countryId)          params.countryId         = countryId;
    if (cityId)             params.cityId            = cityId;
    if (townId)             params.townId            = townId;
    if (workingPreference)  params.workingPreference = workingPreference;
    setSearchParams(params);
  }

  function removeFilter(key: string) {
    const current = Object.fromEntries(searchParams.entries());
    delete current[key];
    if (key === 'position')          setPosition('');
    if (key === 'countryId')         { setCountryId(''); setCityId(''); setTownId(''); delete current.cityId; delete current.townId; }
    if (key === 'cityId')            { setCityId(''); setTownId(''); delete current.townId; }
    if (key === 'townId')            setTownId('');
    if (key === 'workingPreference') setWorkingPreference('');
    setSearchParams(current);
  }

  const activeFilters: { key: string; label: string }[] = [];
  if (searchParams.get('position'))
    activeFilters.push({ key: 'position', label: `Position: ${searchParams.get('position')}` });
  if (searchParams.get('townId')) {
    const name = optionNames[searchParams.get('townId')!];
    if (name) activeFilters.push({ key: 'townId', label: `Town: ${name}` });
  }
  if (searchParams.get('cityId')) {
    const name = optionNames[searchParams.get('cityId')!];
    if (name) activeFilters.push({ key: 'cityId', label: `City: ${name}` });
  }
  if (searchParams.get('countryId')) {
    const name = optionNames[searchParams.get('countryId')!];
    if (name) activeFilters.push({ key: 'countryId', label: `Country: ${name}` });
  }
  if (searchParams.get('workingPreference'))
    activeFilters.push({
      key: 'workingPreference',
      label: WP_LABELS[searchParams.get('workingPreference')!] ?? searchParams.get('workingPreference')!,
    });

  return (
    <div className="layout-with-sidebar">
      <aside className="sidebar">
        <h4>Filters</h4>
        <form onSubmit={applyFilters}>

          <div className="form-group">
            <label>Position</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="React, Java, DevOps..."
            />
          </div>

          <div className="form-group">
            <label>Country</label>
            <select value={countryId} onChange={e => setCountryId(e.target.value)}>
              <option value="">All Countries</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {countryId && (
            <div className="form-group">
              <label>City</label>
              <select value={cityId} onChange={e => setCityId(e.target.value)}>
                <option value="">All Cities</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {cityId && (
            <div className="form-group">
              <label>Town / District</label>
              <select value={townId} onChange={e => setTownId(e.target.value)}>
                <option value="">All Towns</option>
                {towns.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: 8 }}>
            Apply Filters
          </button>
          {activeFilters.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => {
                setPosition(''); setCountryId(''); setCityId(''); setTownId(''); setWorkingPreference('');
                setSearchParams({});
              }}
            >
              Clear All Filters
            </button>
          )}
        </form>
      </aside>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {result ? `${result.totalElements} listings found` : 'Job Listings'}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>

        {activeFilters.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {activeFilters.map(f => (
              <span
                key={f.key}
                className="chip chip-gray"
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'default' }}
              >
                {f.label}
                <button
                  onClick={() => removeFilter(f.key)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, fontSize: '0.9rem', lineHeight: 1,
                    color: '#555', marginLeft: 2,
                  }}
                  title="Remove filter"
                >×</button>
              </span>
            ))}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="spinner">Loading...</div>}

        {!loading && result && (
          <>
            {result.content.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: '#888' }}>
                No listings found matching your search criteria.
              </div>
            ) : (
              result.content.map(job => <JobCard key={job.id} job={job} />)
            )}

            {result.totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page === 0}
                  onClick={() => doSearch(page - 1)}
                >‹ Previous</button>
                {Array.from({ length: Math.min(result.totalPages, 7) }, (_, i) => (
                  <button
                    key={i}
                    className={`btn btn-sm ${i === page ? 'btn-primary active' : 'btn-secondary'}`}
                    onClick={() => doSearch(i)}
                  >{i + 1}</button>
                ))}
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page >= result.totalPages - 1}
                  onClick={() => doSearch(page + 1)}
                >Next ›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
