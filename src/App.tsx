import { useState, type FormEvent, type ChangeEvent } from 'react';

type PlanResult = {
    // Basic fields (you already have)
    subtasks: string[];
    milestones: string[];
    priorities: string[];
    effortEstimates: string[];
    dependencies: string[];
    suggestedOrder: string[];
    raw: string;

    // NEW: Role-based task breakdown
    developerTasks: string[];
    qaTasks: string[];
    documentationTasks: string[];

    // NEW: Timeline and tracking
    timeline: {
        phases: Array<{
            name: string;
            startDate: string;      // e.g., "Week 1" or "Day 1-3"
            endDate: string;
            tasks: string[];
            assignedRoles: string[];
        }>;
        totalEstimatedWeeks: number;
    };

    // NEW: Team collaboration
    teamStructure: {
        roles: string[];
        estimatedTeamSize: number;
        collaborationTools: string[];  // e.g., ["Slack", "Jira", "GitHub"]
        meetingCadence: string;        // e.g., "Daily standups, weekly planning"
    };

    // NEW: Progress tracking structure
    trackingMetrics: string[];  // e.g., ["Sprint completion %", "Bug count", "Feature velocity"]

    // NEW: Export-ready formats
    jiraFormat: {
        epicName: string;
        issues: Array<{
            summary: string;
            type: string;      // "Task", "Bug", "Story"
            priority: string;
            assignee: string;  // e.g., "Dev", "QA", "Docs"
        }>;
    };
};

const initialResult: PlanResult = {
    // Existing fields
    subtasks: [],
    milestones: [],
    priorities: [],
    effortEstimates: [],
    dependencies: [],
    suggestedOrder: [],
    raw: '',

    // NEW fields to add
    developerTasks: [],
    qaTasks: [],
    documentationTasks: [],

    timeline: {
        phases: [],
        totalEstimatedWeeks: 0
    },

    teamStructure: {
        roles: [],
        estimatedTeamSize: 0,
        collaborationTools: [],
        meetingCadence: ''
    },

    trackingMetrics: [],

    jiraFormat: {
        epicName: '',
        issues: []
    }
};

function App() {
    const [projectText, setProjectText] = useState('Launch a marketing campaign');
    const [result, setResult] = useState<PlanResult>(initialResult);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setLoading(true);
        setResult(initialResult);

        try {
            const response = await fetch('/api/plan', {
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
                    </div>
                    {error && <div className="error">{error}</div>}
                </form>

                {result.raw && (
                    <section className="results">
                        <article>
                            <h2>Plan Summary</h2>
                            <pre>{result.raw}</pre>
                        </article>

                        <div className="cards-grid">
                            {/* Milestones */}
                            <section className="card">
                                <h3>🎯 Milestones</h3>
                                <ul>{result.milestones.map((item) => <li key={item}>{item}</li>)}</ul>
                            </section>

                            {/* Subtasks with Priorities & Effort */}
                            <section className="card">
                                <h3>✅ Subtasks</h3>
                                <ul>
                                    {result.subtasks.map((item, idx) => (
                                        <li key={idx}>
                                            <strong>{item}</strong>
                                            <br />
                                            <small>
                                                Priority: {result.priorities[idx] || 'N/A'} |
                                                Effort: {result.effortEstimates[idx] || 'N/A'}
                                            </small>
                                        </li>
                                    ))}
                                </ul>
                            </section>

                            {/* Dependencies */}
                            <section className="card">
                                <h3>🔗 Dependencies</h3>
                                <ul>{result.dependencies.map((item, idx) => <li key={idx}>{item}</li>)}</ul>
                            </section>

                            {/* Suggested Order */}
                            <section className="card">
                                <h3>📋 Suggested Order of Execution</h3>
                                <ol>{result.suggestedOrder.map((item, idx) => <li key={idx}>{item}</li>)}</ol>
                            </section>

                            {/* Developer Tasks */}
                            <section className="card">
                                <h3>👨‍💻 Developer Tasks</h3>
                                {result.developerTasks && result.developerTasks.length > 0 ? (
                                    <ul>{result.developerTasks.map((task, i) => <li key={i}>{task}</li>)}</ul>
                                ) : (
                                    <p>No developer tasks generated</p>
                                )}
                            </section>

                            {/* QA Tasks */}
                            <section className="card">
                                <h3>🧪 QA Tasks</h3>
                                {result.qaTasks && result.qaTasks.length > 0 ? (
                                    <ul>{result.qaTasks.map((task, i) => <li key={i}>{task}</li>)}</ul>
                                ) : (
                                    <p>No QA tasks generated</p>
                                )}
                            </section>

                            {/* Documentation Tasks */}
                            <section className="card">
                                <h3>📚 Documentation Tasks</h3>
                                {result.documentationTasks && result.documentationTasks.length > 0 ? (
                                    <ul>{result.documentationTasks.map((task, i) => <li key={i}>{task}</li>)}</ul>
                                ) : (
                                    <p>No documentation tasks generated</p>
                                )}
                            </section>

                            {/* Timeline */}
                            <section className="card">
                                <h3>📅 Timeline (Est. {result.timeline?.totalEstimatedWeeks || 0} weeks)</h3>
                                {result.timeline?.phases && result.timeline.phases.length > 0 ? (
                                    result.timeline.phases.map((phase, i) => (
                                        <div key={i} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                            <strong>{phase.name}</strong> ({phase.startDate} - {phase.endDate})
                                            <ul>
                                                {phase.tasks.map((task, j) => <li key={j}>{task}</li>)}
                                            </ul>
                                            <small>👥 Assigned: {phase.assignedRoles?.join(', ') || 'N/A'}</small>
                                        </div>
                                    ))
                                ) : (
                                    <p>No timeline generated</p>
                                )}
                            </section>

                            {/* Team Structure */}
                            <section className="card">
                                <h3>👥 Team Structure</h3>
                                {result.teamStructure ? (
                                    <>
                                        <p><strong>Roles:</strong> {result.teamStructure.roles?.join(', ') || 'N/A'}</p>
                                        <p><strong>Team Size:</strong> {result.teamStructure.estimatedTeamSize || 0} people</p>
                                        <p><strong>Tools:</strong> {result.teamStructure.collaborationTools?.join(', ') || 'N/A'}</p>
                                        <p><strong>Meeting Cadence:</strong> {result.teamStructure.meetingCadence || 'N/A'}</p>
                                    </>
                                ) : (
                                    <p>No team structure generated</p>
                                )}
                            </section>

                            {/* Tracking Metrics */}
                            <section className="card">
                                <h3>📊 Progress Tracking Metrics</h3>
                                {result.trackingMetrics && result.trackingMetrics.length > 0 ? (
                                    <ul>{result.trackingMetrics.map((metric, i) => <li key={i}>{metric}</li>)}</ul>
                                ) : (
                                    <p>No tracking metrics generated</p>
                                )}
                            </section>

                            {/* Jira Export */}
                            <section className="card">
                                <h3>📋 Jira Import Format</h3>
                                {result.jiraFormat ? (
                                    <>
                                        <p><strong>Epic:</strong> {result.jiraFormat.epicName || 'N/A'}</p>
                                        {result.jiraFormat.issues && result.jiraFormat.issues.length > 0 ? (
                                            <>
                                                <details>
                                                    <summary>View {result.jiraFormat.issues.length} Issues</summary>
                                                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginTop: '10px' }}>
                                                        <thead>
                                                            <tr style={{ backgroundColor: '#f0f0f0' }}>
                                                                <th style={{ padding: '8px', textAlign: 'left' }}>Summary</th>
                                                                <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                                                                <th style={{ padding: '8px', textAlign: 'left' }}>Priority</th>
                                                                <th style={{ padding: '8px', textAlign: 'left' }}>Assignee</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {result.jiraFormat.issues.map((issue, i) => (
                                                                <tr key={i} style={{ borderTop: '1px solid #ddd' }}>
                                                                    <td style={{ padding: '8px' }}>{issue.summary}</td>
                                                                    <td style={{ padding: '8px' }}>{issue.type}</td>
                                                                    <td style={{ padding: '8px' }}>{issue.priority}</td>
                                                                    <td style={{ padding: '8px' }}>{issue.assignee}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </details>
                                                <button
                                                    onClick={() => {
                                                        const csv = ['Summary,Type,Priority,Assignee',
                                                            ...result.jiraFormat.issues.map(i => `"${i.summary}",${i.type},${i.priority},${i.assignee}`)
                                                        ].join('\n');
                                                        const blob = new Blob([csv], { type: 'text/csv' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = 'jira_import.csv';
                                                        a.click();
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                    style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}
                                                >
                                                    📥 Export to Jira CSV
                                                </button>
                                            </>
                                        ) : (
                                            <p>No Jira issues generated</p>
                                        )}
                                    </>
                                ) : (
                                    <p>No Jira format generated</p>
                                )}
                            </section>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

export default App;
