import { useState, type FormEvent, type ChangeEvent } from 'react';

type PlanResult = {
  subtasks: string[];
  milestones: string[];
  priorities: string[];
  effortEstimates: string[];
  dependencies: string[];
  suggestedOrder: string[];
  raw: string;
};

const initialResult: PlanResult = {
  subtasks: [],
  milestones: [],
  priorities: [],
  effortEstimates: [],
  dependencies: [],
  suggestedOrder: [],
  raw: '',
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
              <section className="card">
                <h3>Milestones</h3>
                <ul>{result.milestones.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>

              <section className="card">
                <h3>Subtasks</h3>
                <ul>{result.subtasks.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>

              <section className="card">
                <h3>Priorities</h3>
                <ul>{result.priorities.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>

              <section className="card">
                <h3>Effort Estimates</h3>
                <ul>{result.effortEstimates.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>

              <section className="card">
                <h3>Dependencies</h3>
                <ul>{result.dependencies.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>

              <section className="card">
                <h3>Suggested Order</h3>
                <ol>{result.suggestedOrder.map((item) => <li key={item}>{item}</li>)}</ol>
              </section>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
