import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, CheckCheck, CheckCircle2, Circle, Clock3, LayoutGrid, ListTodo, LoaderCircle, Plus, RefreshCw, Sprout, Trash2, X } from 'lucide-react';
import { request } from './api.js';

function Summary({ tasks }) {
  const completed = tasks.filter(task => task.completed).length;
  return <div className="summary-grid">
    {[{ label: 'Total tasks', value: tasks.length, Icon: ListTodo, color: 'green', note: 'A little structure goes a long way' },
      { label: 'In progress', value: tasks.length - completed, Icon: Clock3, color: 'amber', note: 'One step at a time' },
      { label: 'Completed', value: completed, Icon: CheckCheck, color: 'purple', note: 'Look at you making progress' }].map(({ label, value, Icon, color, note }) =>
      <div className="summary-card" key={label}><div className="summary-top"><span>{label}</span><span className={`icon-box ${color}`}><Icon size={20} /></span></div><strong>{value.toString().padStart(2, '0')}</strong><p>{note}</p></div>)}
  </div>;
}

function TaskForm({ onCreate, unavailable }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || saving || unavailable) return;
    setSaving(true);
    try {
      const saved = await onCreate({ title: title.trim(), description: description.trim() });
      if (saved) { setTitle(''); setDescription(''); }
    } finally { setSaving(false); }
  }
  return <section className="panel create-panel" aria-labelledby="create-heading">
    <div className="panel-heading"><span className="heading-icon"><Plus size={20} /></span><div><h2 id="create-heading">Make room for what’s next</h2><p>Big plans start with a small task.</p></div></div>
    <form onSubmit={submit}><fieldset disabled={unavailable || saving}>
      <label htmlFor="title">Task title <span className="required">*</span></label>
      <input id="title" placeholder="What would you like to get done?" value={title} onChange={e => setTitle(e.target.value)} required maxLength={120} disabled={saving} />
      <label htmlFor="description">Description <span className="optional">optional</span></label>
      <textarea id="description" placeholder="Add a few details, if you like…" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={4} disabled={saving} />
      <button className="primary-button" type="submit" disabled={saving || !title.trim()}>{saving ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}{saving ? 'Adding task…' : 'Add task'}</button>
      <p className="form-hint">A clearer mind, one task at a time.</p>
    </fieldset></form>
  </section>;
}

function TaskItem({ task, onToggle, onDelete, busy }) {
  return <li className={`task-item ${task.completed ? 'is-completed' : ''}`}>
    <button className="complete-button" onClick={() => onToggle(task)} disabled={busy} aria-label={`Mark ${task.title} as ${task.completed ? 'pending' : 'completed'}`} aria-pressed={task.completed}>
      {busy ? <LoaderCircle size={21} className="spin" /> : task.completed ? <CheckCircle2 size={23} /> : <Circle size={23} />}
    </button>
    <div className="task-content"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<span className={`status-badge ${task.completed ? 'done' : ''}`}>{task.completed ? <Check size={11} /> : <span className="status-dot" />}{task.completed ? 'Completed' : 'Pending'}</span></div>
    <button className="delete-button" aria-label={`Delete ${task.title}`} onClick={() => onDelete(task)} disabled={busy}><Trash2 size={17} /></button>
  </li>;
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState('All tasks');
  const [feedback, setFeedback] = useState(null);
  const [busyIds, setBusyIds] = useState([]);

  async function loadTasks() {
    setLoading(true); setLoadFailed(false); setFeedback(null);
    try { const data = await request('/tasks'); setTasks(data.tasks); }
    catch (error) { setLoadFailed(true); setFeedback({ type: 'error', message: error.message }); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    request('/tasks')
      .then(data => { if (active) setTasks(data.tasks); })
      .catch(error => {
        if (active) { setLoadFailed(true); setFeedback({ type: 'error', message: error.message }); }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function createTask(body) {
    setFeedback(null);
    try {
      const { task } = await request('/tasks', { method: 'POST', body: JSON.stringify(body) });
      setTasks(previous => [task, ...previous]);
      setFeedback({ type: 'success', message: 'Task added. You’ve got this!' });
      return true;
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
      return false;
    }
  }

  async function changeTask(task, deleting = false) {
    setBusyIds(previous => [...previous, task._id]); setFeedback(null);
    try {
      const data = await request(`/tasks/${task._id}`, deleting ? { method: 'DELETE' } : { method: 'PATCH', body: JSON.stringify({ completed: !task.completed }) });
      setTasks(previous => deleting ? previous.filter(item => item._id !== task._id) : previous.map(item => item._id === task._id ? data.task : item));
      setFeedback({ type: 'success', message: deleting ? 'Task deleted.' : task.completed ? 'Task marked as pending.' : 'Task completed. Nicely done!' });
    } catch (error) { setFeedback({ type: 'error', message: error.message }); }
    finally { setBusyIds(previous => previous.filter(id => id !== task._id)); }
  }

  const visibleTasks = tasks.filter(task => filter === 'All tasks' || (filter === 'Completed' ? task.completed : !task.completed));
  const completed = tasks.filter(task => task.completed).length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;

  return <div className="app-shell">
    <header className="site-header"><div className="header-inner"><a className="brand" href="/" aria-label="TaskFlow home"><span className="brand-mark"><Check size={24} strokeWidth={3} /></span>TaskFlow<span className="brand-period">.</span></a><span className="header-divider" /><span className="workspace-label">Your personal workspace</span><span className="header-tag"><span />A little more organized</span></div></header>
    <main>
      <div className="page-intro"><div><div className="eyebrow"><span /> A FRESH PERSPECTIVE</div><h1>Your everyday, organized<span>.</span></h1><p>Less on your mind. More in your flow. Let’s make things happen.</p></div><div className="intro-art" aria-hidden="true"><Sprout size={52} strokeWidth={1.4} /><span className="art-spark">✦</span></div></div>
      <Summary tasks={tasks} />
      {feedback && <div className={`feedback ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}><span>{feedback.message}</span><button onClick={() => setFeedback(null)} aria-label="Dismiss message"><X size={17} /></button></div>}
      <div className="workspace-grid"><aside><TaskForm onCreate={createTask} unavailable={loading || loadFailed} /><div className="gentle-note"><Sprout size={22} /><div><strong>Progress over perfection.</strong><p>You don’t have to do it all. Just the next thing.</p></div></div></aside>
        <section className="panel tasks-panel" aria-labelledby="tasks-heading"><div className="task-panel-heading"><div><h2 id="tasks-heading">Your tasks <span className="count-pill">{tasks.length}</span></h2><p>A place for everything on your list.</p></div><button className="refresh-button" aria-label="Refresh tasks" onClick={loadTasks} disabled={loading || busyIds.length > 0}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button></div>
          <div className="filter-bar" aria-label="Filter tasks">{['All tasks', 'Pending', 'Completed'].map(item => <button key={item} aria-pressed={filter === item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
          {loading ? <div className="empty-state" role="status"><LoaderCircle size={30} className="spin" /><h3>Getting things in order…</h3><p>Loading your tasks.</p></div> : loadFailed ? <div className="empty-state"><RefreshCw size={30} /><h3>Let’s try that again</h3><p>Your tasks couldn’t be loaded.</p><button className="secondary-button" onClick={loadTasks}>Retry</button></div> : visibleTasks.length ? <ul className="task-list">{visibleTasks.map(task => <TaskItem key={task._id} task={task} busy={busyIds.includes(task._id)} onToggle={changeTask} onDelete={task => changeTask(task, true)} />)}</ul> : <div className="empty-state"><span className="empty-icon"><LayoutGrid size={28} strokeWidth={1.4} /></span><h3>{tasks.length ? 'All clear here' : 'A little space for big things'}</h3><p>{tasks.length ? `No ${filter.toLowerCase()} tasks right now.` : 'Add your first task and find your flow.'}</p>{!tasks.length && <span className="empty-arrow">Your next step starts on the left <ArrowUpRight size={14} /></span>}</div>}
          <div className="list-footer"><span>{completed} of {tasks.length} tasks completed</span><div className="progress-track" role="progressbar" aria-label="Tasks completed" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><strong>{progress}%</strong></div>
        </section></div>
      <footer><span>TaskFlow <span className="footer-dot">·</span> Small steps. Clearer days.</span><span>Built to keep things simple <span className="footer-leaf">✦</span></span></footer>
    </main>
  </div>;
}
