import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createJob, updateJob, deleteJob, getAdminJobs, getCities, getCountries, getCompanies, getTowns } from '../api';
import { useAuth } from '../AuthContext';
import type { JobPostingResponseDto, Page, WorkingPreference } from '../types';

interface Option { id: string; name: string; }

export default function AdminPage() {
  const { loggedIn, isAdmin, isCompany } = useAuth();
  const navigate = useNavigate();

  // Reference data
  const [countries, setCountries] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [towns, setTowns] = useState<Option[]>([]);
  const [companies, setCompanies] = useState<Option[]>([]);

  // Jobs list + filters
  const [jobsResult, setJobsResult] = useState<Page<JobPostingResponseDto> | null>(null);
  const [jobsPage, setJobsPage] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [filterTitle, setFilterTitle] = useState('');
  const [filterWp, setFilterWp] = useState<WorkingPreference | ''>('');
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all');

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [countryId, setCountryId] = useState('');
  const [cityId, setCityId] = useState('');
  const [townId, setTownId] = useState('');
  const [workingPreference, setWorkingPreference] = useState<WorkingPreference>('FULLTIME');
  const [salary, setSalary] = useState('');
  const [active, setActive] = useState(true);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loggedIn || (!isAdmin && !isCompany)) { navigate('/'); return; }
    Promise.all([
      getCountries().then(list => setCountries(list as Option[])),
      getCompanies().then(setCompanies),
    ]).catch(() => {});
    loadJobs();
  }, [loggedIn, isAdmin, isCompany]);

  function loadJobs(page = 0) {
    setJobsLoading(true);
    getAdminJobs({
      title: filterTitle || undefined,
      workingPreference: filterWp || undefined,
      active: filterActive === 'all' ? undefined : filterActive === 'true',
      page,
      size: 10,
    })
      .then(result => { setJobsResult(result); setJobsPage(page); })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }

  // Manual cascade handlers (no reactive effects — avoids clearing on edit pre-fill)
  async function handleCountryChange(newCountryId: string) {
    setCountryId(newCountryId);
    setCityId(''); setTownId(''); setCities([]); setTowns([]);
    if (!newCountryId) return;
    getCities({ countryId: newCountryId })
      .then(list => setCities(list.map(c => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }

  async function handleCityChange(newCityId: string) {
    setCityId(newCityId);
    setTownId(''); setTowns([]);
    if (!newCityId) return;
    getTowns({ cityId: newCityId })
      .then(list => setTowns(list.map(t => ({ id: t.id, name: t.name }))))
      .catch(() => {});
  }

  async function startEdit(job: JobPostingResponseDto) {
    setEditId(job.id);
    setTitle(job.title);
    setDescription(job.description);
    setCompanyId(job.company.id);
    setSalary(job.salary?.toString() ?? '');
    setWorkingPreference(job.workingPreference);
    setActive(job.active ?? true);
    setMsg(null);

    // Load cascade data and set IDs — order matters: load before setting
    setCountryId(job.countryId);
    const [cityList, townList] = await Promise.all([
      getCities({ countryId: job.countryId }),
      getTowns({ cityId: job.cityId }),
    ]);
    setCities(cityList.map(c => ({ id: c.id, name: c.name })));
    setTowns(townList.map(t => ({ id: t.id, name: t.name })));
    setCityId(job.cityId);
    setTownId(job.townId);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditId(null);
    setTitle(''); setDescription(''); setSalary('');
    setCompanyId(''); setCountryId(''); setCityId(''); setTownId('');
    setWorkingPreference('FULLTIME'); setActive(true);
    setCities([]); setTowns([]);
    setMsg(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (editId) {
        await updateJob(editId, {
          title, description, townId,
          workingPreference,
          salary: Number(salary),
          active,
        });
        setMsg({ type: 'success', text: 'Listing updated successfully.' });
        loadJobs();
        cancelEdit();
      } else {
        await createJob({
          title, description, companyId, townId,
          workingPreference,
          salary: salary ? Number(salary) : undefined,
        });
        setMsg({ type: 'success', text: 'Listing created successfully! Notifications sent via RabbitMQ.' });
        setTitle(''); setDescription(''); setSalary('');
        loadJobs();
      }
    } catch {
      setMsg({ type: 'error', text: editId ? 'Failed to update listing.' : 'Failed to create listing.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="section-title">Job Management</h1>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {/* Create / Edit Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{editId ? 'Edit Listing' : 'Create New Listing'}</h3>
          {editId && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Job Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Senior React Developer" />
          </div>
          <div className="form-group">
            <label>Job Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              placeholder="Requirements, benefits, company info..."
              style={{ minHeight: 120 }}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Company *</label>
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} required disabled={!!editId}>
                <option value="">Select company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Work Type *</label>
              <select value={workingPreference} onChange={e => setWorkingPreference(e.target.value as WorkingPreference)}>
                <option value="FULLTIME">Full Time</option>
                <option value="PARTTIME">Part Time</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
            <div className="form-group">
              <label>Country *</label>
              <select value={countryId} onChange={e => handleCountryChange(e.target.value)} required>
                <option value="">Select country</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>City *</label>
              <select value={cityId} onChange={e => handleCityChange(e.target.value)} required disabled={!countryId}>
                <option value="">{countryId ? 'Select city' : 'Select country first'}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Town / District *</label>
              <select value={townId} onChange={e => setTownId(e.target.value)} required disabled={!cityId}>
                <option value="">{cityId ? 'Select town' : 'Select city first'}</option>
                {towns.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Salary (₺) {editId && <span style={{ color: '#e53935', fontSize: '0.8rem' }}>* required for update</span>}</label>
              <input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="30000" min="0" required={!!editId} />
            </div>
          </div>

          {editId && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ margin: 0 }}>Active</label>
              <input
                type="checkbox"
                checked={active}
                onChange={e => setActive(e.target.checked)}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#888' }}>
                {active ? 'Visible to job seekers' : 'Hidden from job seekers'}
              </span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading || !townId || (!!editId && !salary)}>
            {loading ? (editId ? 'Updating...' : 'Creating...') : (editId ? 'Save Changes' : 'Create & Publish')}
          </button>
        </form>
      </div>

      {/* Jobs list */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Existing Listings</h3>
          {jobsResult && (
            <span style={{ fontSize: '0.82rem', color: '#888' }}>
              {jobsResult.totalElements} listing{jobsResult.totalElements !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Filters */}
        <form
          onSubmit={e => { e.preventDefault(); loadJobs(0); }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}
        >
          <div style={{ flex: '2 1 180px' }}>
            <input
              type="text"
              value={filterTitle}
              onChange={e => setFilterTitle(e.target.value)}
              placeholder="Search by title..."
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <select value={filterWp} onChange={e => setFilterWp(e.target.value as WorkingPreference | '')} style={{ width: '100%' }}>
              <option value="">All Work Types</option>
              <option value="FULLTIME">Full Time</option>
              <option value="PARTTIME">Part Time</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <select value={filterActive} onChange={e => setFilterActive(e.target.value as 'all' | 'true' | 'false')} style={{ width: '100%' }}>
              <option value="all">All Status</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Apply</button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setFilterTitle(''); setFilterWp(''); setFilterActive('all'); setTimeout(() => loadJobs(0), 0); }}
          >Clear</button>
        </form>

        {jobsLoading ? (
          <div className="spinner">Loading...</div>
        ) : !jobsResult || jobsResult.content.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No listings found.</p>
        ) : (
          <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', color: '#555' }}>Title</th>
                <th style={{ padding: '8px 10px', color: '#555' }}>Company</th>
                <th style={{ padding: '8px 10px', color: '#555' }}>Location</th>
                <th style={{ padding: '8px 10px', color: '#555' }}>Type</th>
                <th style={{ padding: '8px 10px', color: '#555' }}>Apps</th>
                <th style={{ padding: '8px 10px', color: '#555' }}>Status</th>
                <th style={{ padding: '8px 10px' }}></th>
              </tr>
            </thead>
            <tbody>
              {jobsResult.content.map(job => (
                <tr
                  key={job.id}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    background: editId === job.id ? '#f0f7ff' : undefined,
                  }}
                >
                  <td style={{ padding: '10px 10px', fontWeight: 500 }}>
                    <a
                      href={`/jobs/${job.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1a73e8', textDecoration: 'none' }}
                    >
                      {job.title} ↗
                    </a>
                  </td>
                  <td style={{ padding: '10px 10px', color: '#555' }}>{job.company.name}</td>
                  <td style={{ padding: '10px 10px', color: '#555' }}>{job.town}, {job.city}</td>
                  <td style={{ padding: '10px 10px' }}>
                    <span className="chip">{job.workingPreference}</span>
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600, color: '#1a73e8' }}>
                    {job.applicationCount}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <span className={`chip ${job.active ? 'chip-green' : 'chip-gray'}`}>
                      {job.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => startEdit(job)}
                      disabled={editId === job.id}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={async () => {
                        if (!confirm(`Remove "${job.title}"? This also deletes all ${job.applicationCount} application(s).`)) return;
                        try {
                          await deleteJob(job.id);
                          if (editId === job.id) cancelEdit();
                          loadJobs(jobsPage);
                        } catch {
                          setMsg({ type: 'error', text: 'Failed to delete listing.' });
                        }
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {jobsResult.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={jobsPage === 0}
                onClick={() => loadJobs(jobsPage - 1)}
              >
                ‹ Prev
              </button>
              {Array.from({ length: jobsResult.totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${i === jobsPage ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => loadJobs(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="btn btn-secondary btn-sm"
                disabled={jobsPage >= jobsResult.totalPages - 1}
                onClick={() => loadJobs(jobsPage + 1)}
              >
                Next ›
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
