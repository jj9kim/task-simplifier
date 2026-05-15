import { useState, type FormEvent, type ChangeEvent, useEffect } from 'react';
import LZString from 'lz-string';

type PlanResult = {
    subtasks: string[];
    milestones: string[];
    priorities: string[];
    effortEstimates: string[];
    dependencies: string[];
    suggestedOrder: string[];
    raw: string;
    developerTasks: string[];
    qaTasks: string[];
    documentationTasks: string[];
    timeline: {
        phases: Array<{
            name: string;
            startDate: string;
            endDate: string;
            tasks: string[];
            assignedRoles: string[];
        }>;
        totalEstimatedWeeks: number;
    };
    teamStructure: {
        roles: string[];
        estimatedTeamSize: number;
        collaborationTools: string[];
        meetingCadence: string;
    };
    trackingMetrics: string[];
    jiraFormat: {
        epicName: string;
        issues: Array<{
            summary: string;
            type: string;
            priority: string;
            assignee: string;
        }>;
    };
};

const initialResult: PlanResult = {
    subtasks: [],
    milestones: [],
    priorities: [],
    effortEstimates: [],
    dependencies: [],
    suggestedOrder: [],
    raw: '',
    developerTasks: [],
    qaTasks: [],
    documentationTasks: [],
    timeline: { phases: [], totalEstimatedWeeks: 0 },
    teamStructure: { roles: [], estimatedTeamSize: 0, collaborationTools: [], meetingCadence: '' },
    trackingMetrics: [],
    jiraFormat: { epicName: '', issues: [] }
};

type TabId = 'summary' | 'tasks' | 'progress' | 'timeline' | 'team' | 'jira';

const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'summary', label: 'Summary', icon: '📋' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'progress', label: 'My Progress', icon: '📈' },
    { id: 'timeline', label: 'Timeline', icon: '📅' },
    { id: 'team', label: 'Team', icon: '👥' },
    { id: 'jira', label: 'Jira Export', icon: '🔧' },
];

function App() {
    const [projectText, setProjectText] = useState('Build a web app');
    const [result, setResult] = useState<PlanResult>(initialResult);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<TabId>('summary');
    const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
    const [completedDevTasks, setCompletedDevTasks] = useState<Set<number>>(new Set());
    const [completedQaTasks, setCompletedQaTasks] = useState<Set<number>>(new Set());
    const [completedDocTasks, setCompletedDocTasks] = useState<Set<number>>(new Set());
    const [shareUrl, setShareUrl] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);

    // Edit/Delete/Add state
    const [editingTaskType, setEditingTaskType] = useState<string | null>(null);
    const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
    const [editingTaskValue, setEditingTaskValue] = useState('');
    const [editingPriority, setEditingPriority] = useState('');
    const [editingEffort, setEditingEffort] = useState('');

    const [newTaskValue, setNewTaskValue] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [newTaskEffort, setNewTaskEffort] = useState('Medium');
    const [showAddTask, setShowAddTask] = useState<string | null>(null);

    // Load plan from URL on page load
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const encodedData = params.get('plan');
        const projectFromUrl = params.get('project');

        if (encodedData) {
            try {
                const decoded = LZString.decompressFromEncodedURIComponent(encodedData);
                if (decoded) {
                    const savedResult = JSON.parse(decoded);
                    setResult(savedResult);

                    const completedParam = params.get('completed');
                    if (completedParam) {
                        const completedArray = JSON.parse(atob(completedParam));
                        setCompletedTasks(new Set(completedArray));
                    }
                }
            } catch (e) {
                console.error('Failed to load plan from URL', e);
            }
        } else if (projectFromUrl) {
            setProjectText(projectFromUrl);
            handleAutoGenerate(projectFromUrl);
        }
    }, []);

    const getApiUrl = () => {
        // For both dev and production, use relative path
        return '/api/plan';
    };


    

    const handleAutoGenerate = async (project: string) => {
        setLoading(true);
        try {
            const response = await fetch(getApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: projectText }),
            });
            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setLoading(true);
        setResult(initialResult);
        setCompletedTasks(new Set());
        setCompletedDevTasks(new Set());
        setCompletedQaTasks(new Set());
        setCompletedDocTasks(new Set());
        setActiveTab('summary');

        try {
            const response = await fetch(getApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: projectText }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to generate plan');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    // Edit subtask with priority and effort
    const editSubtask = (index: number, task: string, priority: string, effort: string) => {
        setEditingTaskType('subtask');
        setEditingTaskIndex(index);
        setEditingTaskValue(task);
        setEditingPriority(priority);
        setEditingEffort(effort);
    };

    const saveSubtaskEdit = () => {
        if (editingTaskIndex === null) return;

        setResult(prev => {
            const newResult = { ...prev };
            newResult.subtasks = [...prev.subtasks];
            newResult.priorities = [...prev.priorities];
            newResult.effortEstimates = [...prev.effortEstimates];

            newResult.subtasks[editingTaskIndex] = editingTaskValue;
            newResult.priorities[editingTaskIndex] = editingPriority;
            newResult.effortEstimates[editingTaskIndex] = editingEffort;

            // Also update suggested order if the task name changed
            const oldTaskName = prev.subtasks[editingTaskIndex];
            const newTaskName = editingTaskValue;
            if (oldTaskName !== newTaskName) {
                newResult.suggestedOrder = prev.suggestedOrder.map(task =>
                    task === oldTaskName ? newTaskName : task
                );
            }

            return newResult;
        });

        setEditingTaskType(null);
        setEditingTaskIndex(null);
        setEditingTaskValue('');
        setEditingPriority('');
        setEditingEffort('');
    };

    const deleteSubtask = (index: number) => {
        setResult(prev => {
            const newResult = { ...prev };
            const deletedTask = prev.subtasks[index];

            newResult.subtasks = prev.subtasks.filter((_, i) => i !== index);
            newResult.priorities = prev.priorities.filter((_, i) => i !== index);
            newResult.effortEstimates = prev.effortEstimates.filter((_, i) => i !== index);
            newResult.dependencies = prev.dependencies.filter((_, i) => i !== index);
            newResult.suggestedOrder = prev.suggestedOrder.filter(task => task !== deletedTask);

            return newResult;
        });

        // Remove from completed set
        const newCompleted = new Set(completedTasks);
        newCompleted.delete(index);
        setCompletedTasks(newCompleted);
    };

    const addSubtask = () => {
        if (!newTaskValue.trim()) return;

        setResult(prev => {
            const newResult = { ...prev };
            newResult.subtasks = [...prev.subtasks, newTaskValue];
            newResult.priorities = [...prev.priorities, newTaskPriority];
            newResult.effortEstimates = [...prev.effortEstimates, newTaskEffort];
            newResult.dependencies = [...prev.dependencies, `This task depends on planning`];
            newResult.suggestedOrder = [...prev.suggestedOrder, newTaskValue];
            return newResult;
        });

        setNewTaskValue('');
        setNewTaskPriority('Medium');
        setNewTaskEffort('Medium');
        setShowAddTask(null);
    };

    // Generic task operations for dev/qa/doc
    const editGenericTask = (type: string, index: number, currentValue: string) => {
        setEditingTaskType(type);
        setEditingTaskIndex(index);
        setEditingTaskValue(currentValue);
    };

    const saveGenericEdit = () => {
        if (editingTaskType === null || editingTaskIndex === null) return;

        setResult(prev => {
            const newResult = { ...prev };
            if (editingTaskType === 'dev') {
                newResult.developerTasks = [...prev.developerTasks];
                newResult.developerTasks[editingTaskIndex] = editingTaskValue;
            } else if (editingTaskType === 'qa') {
                newResult.qaTasks = [...prev.qaTasks];
                newResult.qaTasks[editingTaskIndex] = editingTaskValue;
            } else if (editingTaskType === 'doc') {
                newResult.documentationTasks = [...prev.documentationTasks];
                newResult.documentationTasks[editingTaskIndex] = editingTaskValue;
            }
            return newResult;
        });

        setEditingTaskType(null);
        setEditingTaskIndex(null);
        setEditingTaskValue('');
    };

    const deleteGenericTask = (type: string, index: number) => {
        setResult(prev => {
            const newResult = { ...prev };
            if (type === 'dev') {
                newResult.developerTasks = prev.developerTasks.filter((_, i) => i !== index);
            } else if (type === 'qa') {
                newResult.qaTasks = prev.qaTasks.filter((_, i) => i !== index);
            } else if (type === 'doc') {
                newResult.documentationTasks = prev.documentationTasks.filter((_, i) => i !== index);
            }
            return newResult;
        });

        // Remove from completed sets
        if (type === 'dev') {
            const newCompleted = new Set(completedDevTasks);
            newCompleted.delete(index);
            setCompletedDevTasks(newCompleted);
        } else if (type === 'qa') {
            const newCompleted = new Set(completedQaTasks);
            newCompleted.delete(index);
            setCompletedQaTasks(newCompleted);
        } else if (type === 'doc') {
            const newCompleted = new Set(completedDocTasks);
            newCompleted.delete(index);
            setCompletedDocTasks(newCompleted);
        }
    };

    const addGenericTask = (type: string) => {
        if (!newTaskValue.trim()) return;

        setResult(prev => {
            const newResult = { ...prev };
            if (type === 'dev') {
                newResult.developerTasks = [...prev.developerTasks, newTaskValue];
            } else if (type === 'qa') {
                newResult.qaTasks = [...prev.qaTasks, newTaskValue];
            } else if (type === 'doc') {
                newResult.documentationTasks = [...prev.documentationTasks, newTaskValue];
            }
            return newResult;
        });

        setNewTaskValue('');
        setShowAddTask(null);
    };

    const toggleTask = (index: number) => {
        setCompletedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const toggleDevTask = (index: number) => {
        setCompletedDevTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const toggleQaTask = (index: number) => {
        setCompletedQaTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const toggleDocTask = (index: number) => {
        setCompletedDocTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    // Calculate total progress across all task types
    const getTotalProgressPercentage = () => {
        const totalSubtasks = result.subtasks.length;
        const totalDev = result.developerTasks.length;
        const totalQa = result.qaTasks.length;
        const totalDoc = result.documentationTasks.length;
        const totalTasks = totalSubtasks + totalDev + totalQa + totalDoc;

        if (totalTasks === 0) return 0;

        const completedCount = completedTasks.size + completedDevTasks.size + completedQaTasks.size + completedDocTasks.size;
        return Math.round((completedCount / totalTasks) * 100);
    };

    // Get completion stats by priority
    const getPriorityStats = () => {
        const stats = { High: { total: 0, completed: 0 }, Medium: { total: 0, completed: 0 }, Low: { total: 0, completed: 0 } };

        result.subtasks.forEach((_, idx) => {
            const priority = result.priorities[idx] || 'Medium';
            if (priority === 'High') stats.High.total++;
            else if (priority === 'Medium') stats.Medium.total++;
            else if (priority === 'Low') stats.Low.total++;

            if (completedTasks.has(idx)) {
                if (priority === 'High') stats.High.completed++;
                else if (priority === 'Medium') stats.Medium.completed++;
                else if (priority === 'Low') stats.Low.completed++;
            }
        });

        return stats;
    };

    // Get completion by role
    const getRoleStats = () => {
        return {
            dev: { total: result.developerTasks.length, completed: completedDevTasks.size },
            qa: { total: result.qaTasks.length, completed: completedQaTasks.size },
            doc: { total: result.documentationTasks.length, completed: completedDocTasks.size }
        };
    };

    const generateShareableUrl = () => {
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(result));
        const completedArray = Array.from(completedTasks);
        const completedEncoded = btoa(JSON.stringify(completedArray));

        const url = new URL(window.location.href);
        url.searchParams.set('plan', compressed);
        url.searchParams.set('completed', completedEncoded);
        url.searchParams.set('project', projectText);

        setShareUrl(url.toString());
        setShowShareModal(true);
    };

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link copied to clipboard!');
    };

    const shareViaNative = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Project Plan',
                    text: `Check out my plan for: ${projectText}`,
                    url: shareUrl,
                });
            } catch (e) {
                console.log('Sharing canceled');
            }
        } else {
            copyToClipboard();
        }
    };

    const exportToCSV = () => {
        if (!result.jiraFormat.issues.length) return;

        const csv = ['Summary,Type,Priority,Assignee',
            ...result.jiraFormat.issues.map(i => `"${i.summary}",${i.type},${i.priority},${i.assignee}`)
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.jiraFormat.epicName.replace(/\s/g, '_')}_jira_import.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const priorityStats = getPriorityStats();
    const roleStats = getRoleStats();
    const totalProgress = getTotalProgressPercentage();

    return (
        <div className="app-shell">
            <header>
                <h1>Task Simplifier</h1>
                <p>Automatically break a high-level initiative into actionable subtasks, milestones, effort, and priorities.</p>
            </header>

            <main>
                <form onSubmit={handleSubmit} className="project-form">
                    <label htmlFor="project">Project / Task</label>
                    <textarea
                        id="project"
                        value={projectText}
                        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setProjectText(event.target.value)}
                        rows={4}
                    />
                    <div className="form-actions">
                        <button type="submit" disabled={loading}>
                            {loading ? 'Analyzing…' : 'Generate Plan'}
                        </button>
                        {result.raw && (
                            <button type="button" onClick={generateShareableUrl} className="share-button">
                                🔗 Share Plan
                            </button>
                        )}
                    </div>
                    {error && <div className="error">{error}</div>}
                </form>

                {/* Share Modal */}
                {showShareModal && (
                    <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h3>Share Your Plan</h3>
                            <p>Anyone with this link can see your project plan:</p>
                            <input type="text" readOnly value={shareUrl} className="share-url-input" />
                            <div className="modal-buttons">
                                <button onClick={copyToClipboard} className="copy-button">📋 Copy Link</button>
                                <button onClick={shareViaNative} className="share-button">📱 Share</button>
                                <button onClick={() => setShowShareModal(false)} className="close-button">Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Bar - Only show if we have results */}
                {result.raw && (
                    <>
                        <div className="tab-bar">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    <span className="tab-icon">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="tab-content">
                            {/* Summary Tab */}
                            {activeTab === 'summary' && (
                                <div className="tab-pane">
                                    <article className="card">
                                        <h2>Plan Summary</h2>
                                        <pre className="summary-text">{result.raw}</pre>
                                    </article>

                                    <div className="card">
                                        <h3>🎯 Milestones</h3>
                                        <ul>{result.milestones.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                    </div>
                                </div>
                            )}

                            {/* Tasks Tab */}
                            {activeTab === 'tasks' && (
                                <div className="tab-pane">
                                    <div className="card progress-card">
                                        <h3>📊 Overall Progress</h3>
                                        <div className="progress-bar-container">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${totalProgress}%` }}
                                            />
                                        </div>
                                        <p className="progress-stats">
                                            {completedTasks.size + completedDevTasks.size + completedQaTasks.size + completedDocTasks.size} / {result.subtasks.length + result.developerTasks.length + result.qaTasks.length + result.documentationTasks.length} tasks completed ({totalProgress}%)
                                        </p>
                                    </div>

                                    {/* Subtasks Section with Priority & Effort Controls */}
                                    <div className="card">
                                        <div className="card-header">
                                            <h3>✅ Subtasks with Priorities & Effort</h3>
                                            <button onClick={() => setShowAddTask('subtask')} className="add-task-btn">+ Add Subtask</button>
                                        </div>

                                        {/* Add Subtask Form */}
                                        {showAddTask === 'subtask' && (
                                            <div className="add-task-form expanded">
                                                <input
                                                    type="text"
                                                    value={newTaskValue}
                                                    onChange={(e) => setNewTaskValue(e.target.value)}
                                                    placeholder="New subtask..."
                                                    autoFocus
                                                />
                                                <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}>
                                                    <option value="High">🔥 High Priority</option>
                                                    <option value="Medium">⚡ Medium Priority</option>
                                                    <option value="Low">📝 Low Priority</option>
                                                </select>
                                                <select value={newTaskEffort} onChange={(e) => setNewTaskEffort(e.target.value)}>
                                                    <option value="Small">✅ Small Effort</option>
                                                    <option value="Medium">⚙️ Medium Effort</option>
                                                    <option value="Large">🐘 Large Effort</option>
                                                    <option value="XL">🦸‍♂️ XL Effort</option>
                                                </select>
                                                <button onClick={addSubtask} className="save-btn">Add</button>
                                                <button onClick={() => setShowAddTask(null)} className="cancel-btn">Cancel</button>
                                            </div>
                                        )}

                                        <ul className="subtasks-list">
                                            {result.subtasks.map((item, idx) => (
                                                <li key={idx} className={completedTasks.has(idx) ? 'completed-task' : ''}>
                                                    {editingTaskType === 'subtask' && editingTaskIndex === idx ? (
                                                        <div className="edit-mode expanded">
                                                            <input
                                                                type="text"
                                                                value={editingTaskValue}
                                                                onChange={(e) => setEditingTaskValue(e.target.value)}
                                                                autoFocus
                                                            />
                                                            <select value={editingPriority} onChange={(e) => setEditingPriority(e.target.value)}>
                                                                <option value="High">🔥 High Priority</option>
                                                                <option value="Medium">⚡ Medium Priority</option>
                                                                <option value="Low">📝 Low Priority</option>
                                                            </select>
                                                            <select value={editingEffort} onChange={(e) => setEditingEffort(e.target.value)}>
                                                                <option value="Small">✅ Small Effort</option>
                                                                <option value="Medium">⚙️ Medium Effort</option>
                                                                <option value="Large">🐘 Large Effort</option>
                                                                <option value="XL">🦸‍♂️ XL Effort</option>
                                                            </select>
                                                            <button onClick={saveSubtaskEdit} className="save-btn">✓</button>
                                                            <button onClick={() => setEditingTaskType(null)} className="cancel-btn">✗</button>
                                                        </div>
                                                    ) : (
                                                        <label className="task-checkbox">
                                                            <input type="checkbox" checked={completedTasks.has(idx)} onChange={() => toggleTask(idx)} />
                                                            <span className="task-text">
                                                                <strong>{item}</strong>
                                                                <div className="task-meta">
                                                                    <span className={`priority priority-${result.priorities[idx]?.toLowerCase() || 'medium'}`}>
                                                                        🔥 Priority: {result.priorities[idx] || 'Medium'}
                                                                    </span>
                                                                    <span className="effort">
                                                                        ⏱️ Effort: {result.effortEstimates[idx] || 'Medium'}
                                                                    </span>
                                                                </div>
                                                            </span>
                                                            <div className="task-actions">
                                                                <button onClick={() => editSubtask(idx, item, result.priorities[idx] || 'Medium', result.effortEstimates[idx] || 'Medium')} className="edit-btn">✏️</button>
                                                                <button onClick={() => deleteSubtask(idx)} className="delete-btn">🗑️</button>
                                                            </div>
                                                        </label>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="card">
                                        <h3>🔗 Dependencies</h3>
                                        <ul>{result.dependencies.map((item, i) => <li key={i}>{item}</li>)}</ul>
                                    </div>

                                    <div className="card">
                                        <h3>📋 Suggested Order of Execution</h3>
                                        <ol>{result.suggestedOrder.map((item, i) => <li key={i}>{item}</li>)}</ol>
                                    </div>

                                    {/* Developer Tasks */}
                                    <div className="card">
                                        <div className="card-header">
                                            <h3>👨‍💻 Developer Tasks</h3>
                                            <button onClick={() => setShowAddTask('dev')} className="add-task-btn">+ Add Task</button>
                                        </div>
                                        {showAddTask === 'dev' && (
                                            <div className="add-task-form">
                                                <input
                                                    type="text"
                                                    value={newTaskValue}
                                                    onChange={(e) => setNewTaskValue(e.target.value)}
                                                    placeholder="New developer task..."
                                                    onKeyDown={(e) => e.key === 'Enter' && addGenericTask('dev')}
                                                    autoFocus
                                                />
                                                <button onClick={() => addGenericTask('dev')}>Add</button>
                                                <button onClick={() => setShowAddTask(null)}>Cancel</button>
                                            </div>
                                        )}
                                        <ul className="subtasks-list">
                                            {result.developerTasks.map((task, idx) => (
                                                <li key={idx} className={completedDevTasks.has(idx) ? 'completed-task' : ''}>
                                                    {editingTaskType === 'dev' && editingTaskIndex === idx ? (
                                                        <div className="edit-mode">
                                                            <input
                                                                type="text"
                                                                value={editingTaskValue}
                                                                onChange={(e) => setEditingTaskValue(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && saveGenericEdit()}
                                                                autoFocus
                                                            />
                                                            <button onClick={saveGenericEdit} className="save-btn">✓</button>
                                                            <button onClick={() => setEditingTaskType(null)} className="cancel-btn">✗</button>
                                                        </div>
                                                    ) : (
                                                        <label className="task-checkbox">
                                                            <input type="checkbox" checked={completedDevTasks.has(idx)} onChange={() => toggleDevTask(idx)} />
                                                            <span className="task-text">{task}</span>
                                                            <div className="task-actions">
                                                                <button onClick={() => editGenericTask('dev', idx, task)} className="edit-btn">✏️</button>
                                                                <button onClick={() => deleteGenericTask('dev', idx)} className="delete-btn">🗑️</button>
                                                            </div>
                                                        </label>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* QA Tasks */}
                                    <div className="card">
                                        <div className="card-header">
                                            <h3>🧪 QA Tasks</h3>
                                            <button onClick={() => setShowAddTask('qa')} className="add-task-btn">+ Add Task</button>
                                        </div>
                                        {showAddTask === 'qa' && (
                                            <div className="add-task-form">
                                                <input
                                                    type="text"
                                                    value={newTaskValue}
                                                    onChange={(e) => setNewTaskValue(e.target.value)}
                                                    placeholder="New QA task..."
                                                    onKeyDown={(e) => e.key === 'Enter' && addGenericTask('qa')}
                                                    autoFocus
                                                />
                                                <button onClick={() => addGenericTask('qa')}>Add</button>
                                                <button onClick={() => setShowAddTask(null)}>Cancel</button>
                                            </div>
                                        )}
                                        <ul className="subtasks-list">
                                            {result.qaTasks.map((task, idx) => (
                                                <li key={idx} className={completedQaTasks.has(idx) ? 'completed-task' : ''}>
                                                    {editingTaskType === 'qa' && editingTaskIndex === idx ? (
                                                        <div className="edit-mode">
                                                            <input
                                                                type="text"
                                                                value={editingTaskValue}
                                                                onChange={(e) => setEditingTaskValue(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && saveGenericEdit()}
                                                                autoFocus
                                                            />
                                                            <button onClick={saveGenericEdit} className="save-btn">✓</button>
                                                            <button onClick={() => setEditingTaskType(null)} className="cancel-btn">✗</button>
                                                        </div>
                                                    ) : (
                                                        <label className="task-checkbox">
                                                            <input type="checkbox" checked={completedQaTasks.has(idx)} onChange={() => toggleQaTask(idx)} />
                                                            <span className="task-text">{task}</span>
                                                            <div className="task-actions">
                                                                <button onClick={() => editGenericTask('qa', idx, task)} className="edit-btn">✏️</button>
                                                                <button onClick={() => deleteGenericTask('qa', idx)} className="delete-btn">🗑️</button>
                                                            </div>
                                                        </label>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Documentation Tasks */}
                                    <div className="card">
                                        <div className="card-header">
                                            <h3>📚 Documentation Tasks</h3>
                                            <button onClick={() => setShowAddTask('doc')} className="add-task-btn">+ Add Task</button>
                                        </div>
                                        {showAddTask === 'doc' && (
                                            <div className="add-task-form">
                                                <input
                                                    type="text"
                                                    value={newTaskValue}
                                                    onChange={(e) => setNewTaskValue(e.target.value)}
                                                    placeholder="New documentation task..."
                                                    onKeyDown={(e) => e.key === 'Enter' && addGenericTask('doc')}
                                                    autoFocus
                                                />
                                                <button onClick={() => addGenericTask('doc')}>Add</button>
                                                <button onClick={() => setShowAddTask(null)}>Cancel</button>
                                            </div>
                                        )}
                                        <ul className="subtasks-list">
                                            {result.documentationTasks.map((task, idx) => (
                                                <li key={idx} className={completedDocTasks.has(idx) ? 'completed-task' : ''}>
                                                    {editingTaskType === 'doc' && editingTaskIndex === idx ? (
                                                        <div className="edit-mode">
                                                            <input
                                                                type="text"
                                                                value={editingTaskValue}
                                                                onChange={(e) => setEditingTaskValue(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && saveGenericEdit()}
                                                                autoFocus
                                                            />
                                                            <button onClick={saveGenericEdit} className="save-btn">✓</button>
                                                            <button onClick={() => setEditingTaskType(null)} className="cancel-btn">✗</button>
                                                        </div>
                                                    ) : (
                                                        <label className="task-checkbox">
                                                            <input type="checkbox" checked={completedDocTasks.has(idx)} onChange={() => toggleDocTask(idx)} />
                                                            <span className="task-text">{task}</span>
                                                            <div className="task-actions">
                                                                <button onClick={() => editGenericTask('doc', idx, task)} className="edit-btn">✏️</button>
                                                                <button onClick={() => deleteGenericTask('doc', idx)} className="delete-btn">🗑️</button>
                                                            </div>
                                                        </label>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* Progress Tab */}
                            {activeTab === 'progress' && (
                                <div className="tab-pane">
                                    <div className="card">
                                        <h3>📈 Your Progress</h3>

                                        <div className="progress-circle-container">
                                            <div className="progress-circle-simple">
                                                <svg width="160" height="160" viewBox="0 0 160 160">
                                                    <circle cx="80" cy="80" r="70" fill="none" stroke="#2a2a2a" strokeWidth="12" />
                                                    <circle
                                                        cx="80" cy="80" r="70"
                                                        fill="none"
                                                        stroke="#667eea"
                                                        strokeWidth="12"
                                                        strokeLinecap="round"
                                                        strokeDasharray={`${2 * Math.PI * 70}`}
                                                        strokeDashoffset={`${2 * Math.PI * 70 * (1 - totalProgress / 100)}`}
                                                        transform="rotate(-90 80 80)"
                                                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                                                    />
                                                </svg>
                                                <div className="progress-circle-text">
                                                    <span className="progress-percent">{totalProgress}%</span>
                                                    <span className="progress-label">Complete</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="progress-summary">
                                            <p>✅ {completedTasks.size + completedDevTasks.size + completedQaTasks.size + completedDocTasks.size} of {result.subtasks.length + result.developerTasks.length + result.qaTasks.length + result.documentationTasks.length} total tasks completed</p>
                                        </div>


                                        {/* Completion by Role */}
                                        <div className="progress-breakdown">
                                            <h4>Completion by Role</h4>
                                            <div className="role-progress">
                                                <span className="role-label">👨‍💻 Developer</span>
                                                <div className="small-progress-bar">
                                                    <div className="small-progress-fill" style={{ width: `${roleStats.dev.total > 0 ? Math.round((roleStats.dev.completed / roleStats.dev.total) * 100) : 0}%` }} />
                                                </div>
                                                <span className="role-stats">{roleStats.dev.completed}/{roleStats.dev.total}</span>
                                            </div>
                                            <div className="role-progress">
                                                <span className="role-label">🧪 QA</span>
                                                <div className="small-progress-bar">
                                                    <div className="small-progress-fill" style={{ width: `${roleStats.qa.total > 0 ? Math.round((roleStats.qa.completed / roleStats.qa.total) * 100) : 0}%` }} />
                                                </div>
                                                <span className="role-stats">{roleStats.qa.completed}/{roleStats.qa.total}</span>
                                            </div>
                                            <div className="role-progress">
                                                <span className="role-label">📚 Documentation</span>
                                                <div className="small-progress-bar">
                                                    <div className="small-progress-fill" style={{ width: `${roleStats.doc.total > 0 ? Math.round((roleStats.doc.completed / roleStats.doc.total) * 100) : 0}%` }} />
                                                </div>
                                                <span className="role-stats">{roleStats.doc.completed}/{roleStats.doc.total}</span>
                                            </div>
                                        </div>

                                        {/* Next Up */}
                                        <div className="progress-breakdown">
                                            <h4>📌 Next Up</h4>
                                            <ul className="next-up-list">
                                                {result.suggestedOrder
                                                    .filter(task => {
                                                        const taskIndex = result.subtasks.findIndex(t => t === task);
                                                        return taskIndex !== -1 && !completedTasks.has(taskIndex);
                                                    })
                                                    .slice(0, 5)
                                                    .map((task, i) => (
                                                        <li key={i}>• {task}</li>
                                                    ))}
                                                {result.suggestedOrder.length > 0 && completedTasks.size === result.subtasks.length && (
                                                    <li>🎉 All subtasks completed! Great job!</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Timeline Tab */}
                            {activeTab === 'timeline' && (
                                <div className="tab-pane">
                                    <div className="card">
                                        <h3>📅 Timeline (Est. {result.timeline.totalEstimatedWeeks} weeks)</h3>
                                        <div className="timeline-phases">
                                            {result.timeline.phases.map((phase, i) => (
                                                <div key={i} className="phase-card">
                                                    <h4>{phase.name}</h4>
                                                    <div className="phase-dates">{phase.startDate} → {phase.endDate}</div>
                                                    <div className="phase-roles">👥 {phase.assignedRoles.join(', ')}</div>
                                                    <ul>
                                                        {phase.tasks.map((task, j) => <li key={j}>{task}</li>)}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Team Tab */}
                            {activeTab === 'team' && (
                                <div className="tab-pane">
                                    <div className="card">
                                        <h3>👥 Team Structure</h3>
                                        <div className="team-info">
                                            <p><strong>Roles:</strong> {result.teamStructure.roles.join(', ')}</p>
                                            <p><strong>Estimated Team Size:</strong> {result.teamStructure.estimatedTeamSize} people</p>
                                            <p><strong>Collaboration Tools:</strong> {result.teamStructure.collaborationTools.join(', ')}</p>
                                            <p><strong>Meeting Cadence:</strong> {result.teamStructure.meetingCadence}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Jira Export Tab */}
                            {activeTab === 'jira' && (
                                <div className="tab-pane">
                                    <div className="card">
                                        <h3>📋 Jira Import Format</h3>
                                        <p><strong>Epic:</strong> {result.jiraFormat.epicName}</p>

                                        {result.jiraFormat.issues.length > 0 && (
                                            <>
                                                <button className="export-button" onClick={exportToCSV}>
                                                    📥 Export to CSV (Import into Jira)
                                                </button>

                                                <details className="issues-details">
                                                    <summary>View {result.jiraFormat.issues.length} Issues</summary>
                                                    <table className="issues-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Summary</th>
                                                                <th>Type</th>
                                                                <th>Priority</th>
                                                                <th>Assignee</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {result.jiraFormat.issues.map((issue, i) => (
                                                                <tr key={i}>
                                                                    <td>{issue.summary}</td>
                                                                    <td>{issue.type}</td>
                                                                    <td>{issue.priority}</td>
                                                                    <td>{issue.assignee}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </details>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default App;