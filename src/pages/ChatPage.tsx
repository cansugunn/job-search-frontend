import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage, applyToJob } from '../api';
import { useAuth } from '../AuthContext';

interface JobMention {
  id: string;
  title: string;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  jobs?: JobMention[];
}

const CHAT_CONVERSATION_ID_STORAGE_KEY = 'jobSearchChatConversationId';

function createConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getInitialConversationId(): string {
  if (typeof window === 'undefined') return createConversationId();

  try {
    const stored = window.sessionStorage.getItem(CHAT_CONVERSATION_ID_STORAGE_KEY);
    if (stored) return stored;

    const conversationId = createConversationId();
    window.sessionStorage.setItem(CHAT_CONVERSATION_ID_STORAGE_KEY, conversationId);
    return conversationId;
  } catch {
    return createConversationId();
  }
}

function storeConversationId(conversationId: string) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(CHAT_CONVERSATION_ID_STORAGE_KEY, conversationId);
  } catch {
    // Ignore storage failures; in-memory state still keeps this chat coherent.
  }
}

// Extract job IDs + titles from AI reply.
// The AI consistently formats listings as: **Job Title** – City – Company\n- Job ID: uuid
// We find each UUID, then pick the LAST **bold** segment before it (nearest title).
function extractJobs(text: string): JobMention[] {
  const jobs: JobMention[] = [];
  const seen = new Set<string>();

  const idPattern = /(?:job\s*id|jobId|id)[:\s]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
  let match;
  while ((match = idPattern.exec(text)) !== null) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);

    // Look back up to 400 chars and take the LAST **bold** — avoids picking up
    // list items like "- Working preference: REMOTE" that come before the UUID.
    const before = text.slice(Math.max(0, match.index - 400), match.index);
    const boldMatches = [...before.matchAll(/\*\*([^*\n]{3,80}?)\*\*/g)];
    const title = boldMatches.length > 0
      ? boldMatches[boldMatches.length - 1][1].trim()
      : `Job #${jobs.length + 1}`;

    jobs.push({ id, title });
  }

  // Fallback: bare UUIDs with no "Job ID:" prefix
  if (jobs.length === 0) {
    const uuidPattern = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;
    while ((match = uuidPattern.exec(text)) !== null) {
      const id = match[1];
      if (!seen.has(id)) {
        seen.add(id);
        jobs.push({ id, title: `Job ${jobs.length + 1}` });
      }
    }
  }

  return jobs;
}

const SUGGESTIONS = [
  'Search for React Developer jobs in Istanbul',
  'Show me remote Java positions',
  'Software engineer positions in Izmir',
  'List Full Stack Developer listings',
];

export default function ChatPage() {
  const { loggedIn } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Hello! I am your job search assistant. 🔍\n\nI can help you search listings, view details, or apply for jobs. What would you like to do?',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(getInitialConversationId);
  const [applyStatus, setApplyStatus] = useState<Record<string, 'loading' | 'done' | 'error'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loggedIn) navigate('/login');
  }, [loggedIn, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userText = text.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);
    try {
      const res = await sendChatMessage(userText, conversationId);
      setConversationId(res.conversationId);
      storeConversationId(res.conversationId);
      const jobs = extractJobs(res.reply);
      setMessages(prev => [...prev, { role: 'ai', text: res.reply, jobs }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'An error occurred. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(jobId: string) {
    setApplyStatus(prev => ({ ...prev, [jobId]: 'loading' }));
    try {
      await applyToJob(jobId);
      setApplyStatus(prev => ({ ...prev, [jobId]: 'done' }));
      setMessages(prev => [...prev, { role: 'ai', text: `✅ Application submitted! View listing at: /jobs/${jobId}` }]);
    } catch {
      setApplyStatus(prev => ({ ...prev, [jobId]: 'error' }));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div>
      <h1 className="section-title">AI Job Search Assistant</h1>
      <p style={{ color: '#666', marginBottom: 12, fontSize: '0.88rem' }}>
        The AI assistant helps you search listings, view details, and apply for jobs.
      </p>

      {messages.length === 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} className="recent-search-chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="card chat-container" style={{ padding: 0 }}>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div className={`chat-bubble ${m.role}`}>
                {m.role === 'ai'
                  ? <ReactMarkdown>{m.text}</ReactMarkdown>
                  : m.text}
              </div>

              {/* Inline Apply buttons for detected job IDs */}
              {m.role === 'ai' && m.jobs && m.jobs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, alignSelf: 'flex-start', maxWidth: '80%' }}>
                  {m.jobs.map(job => (
                    <div key={job.id} style={{
                      background: '#f0f4ff', border: '1px solid #c5d8ff', borderRadius: 8,
                      padding: '8px 14px', display: 'flex', alignItems: 'center',
                      gap: 10, justifyContent: 'space-between',
                    }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{job.title}</span>
                        <br />
                        <button
                          style={{ fontSize: '0.75rem', color: '#888', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                          onClick={() => navigate(`/jobs/${job.id}`)}
                        >
                          View details →
                        </button>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApply(job.id)}
                        disabled={applyStatus[job.id] === 'loading' || applyStatus[job.id] === 'done'}
                      >
                        {applyStatus[job.id] === 'loading' ? '...' : applyStatus[job.id] === 'done' ? 'Applied ✓' : applyStatus[job.id] === 'error' ? 'Error' : 'Apply'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-bubble ai" style={{ opacity: 0.6 }}>
              Preparing response...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '0 16px', borderTop: '1px solid #eee' }}>
          <form onSubmit={handleSubmit} className="chat-input-row">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (press Enter to send)"
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
