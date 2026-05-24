import { useMemo, useState } from "react";
import "../styles/ManageVisualAids.css";
import "../styles/ManageTeachingStrategies.css";

const TABS = [
  { key: "generate", label: "Generate Teaching Strategies" },
  { key: "view", label: "View Teaching Strategies" },
  { key: "edit", label: "Edit Teaching Strategies" },
  { key: "delete", label: "Delete Teaching Strategies" },
];

const MOCK_STUDENTS = [
  {
    id: 1,
    name: "John Clyde Perez",
    grade: 3,
    goals: ["Reading Comprehension", "Problem-Solving Skills", "Social Skills"],
  },
  {
    id: 2,
    name: "Maria Santos",
    grade: 2,
    goals: ["Daily Routine", "Communication Skills", "Attention Span"],
  },
  {
    id: 3,
    name: "Carlo Reyes",
    grade: 4,
    goals: ["Emotional Regulation", "Following Instructions", "Peer Interaction"],
  },
];

const INITIAL_STRATEGIES = [
  {
    id: 1,
    student: "John Clyde Perez",
    title: "Be Calm and Positive",
    goal: "Social Skills",
    date: "2026-05-20",
    overview:
      "A classroom strategy that helps the student remain calm, participate positively, and respond appropriately during group activities.",
    strategies:
      "Use a speaker token for turn-taking. Provide short prompts before discussions. Pair the student with a supportive peer for modeling.",
    tips: "Use short instructions, visual reminders, and calm verbal reinforcement.",
    implementationTips:
      "Start with small group activities, monitor participation, and record positive responses after each session.",
  },
  {
    id: 2,
    student: "Maria Santos",
    title: "Daily Task Routine",
    goal: "Daily Routine",
    date: "2026-05-18",
    overview:
      "A step-by-step routine support strategy that improves task completion and independence.",
    strategies:
      "Break tasks into three visible steps. Give a checkmark after each completed activity. Review the routine before starting.",
    tips: "Keep the routine consistent and praise each completed step.",
    implementationTips:
      "Use the same task board daily and gradually reduce verbal prompts as the student improves.",
  },
  {
    id: 3,
    student: "Carlo Reyes",
    title: "Emotion Check-In",
    goal: "Emotional Regulation",
    date: "2026-05-15",
    overview:
      "A strategy that encourages the student to identify emotions and choose a calming action before class work.",
    strategies:
      "Use an emotion chart. Ask the student to point to a feeling. Let the student choose one coping action such as breathing or drawing.",
    tips: "Keep the check-in private, short, and predictable.",
    implementationTips:
      "Do the check-in at the start of class and after transitions for two weeks.",
  },
];

function GenerateTab({ onSave }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [generated, setGenerated] = useState(null);

  const toggleGoal = (goal) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setSelectedGoals([]);
    setGenerated(null);
  };

  const handleGenerate = () => {
    if (!selectedStudent || selectedGoals.length === 0) return;
    const goalText = selectedGoals.join(", ");
    setGenerated({
      title: "Be Calm and Positive",
      goal: goalText,
      overview:
        `This teaching strategy supports ${selectedStudent.name} with ${goalText.toLowerCase()} through structured prompts, peer modeling, and guided reflection.`,
      strategies:
        "Use visual scaffolding, short instructions, choice-based activities, and guided questioning. Allow the student to explain answers before moving to the next activity.",
      tips:
        "Keep directions brief, model the expected behavior, and give immediate positive feedback.",
      implementationTips:
        "Apply the strategy during small group work first, then gradually use it during whole-class activities. Track progress after each session.",
    });
  };

  const handleSave = () => {
    if (!generated || !selectedStudent) return;
    onSave({
      id: Date.now(),
      student: selectedStudent.name,
      title: generated.title,
      goal: generated.goal,
      date: new Date().toISOString().slice(0, 10),
      overview: generated.overview,
      strategies: generated.strategies,
      tips: generated.tips,
      implementationTips: generated.implementationTips,
    });
    alert("Teaching strategy saved successfully.");
  };

  return (
    <div className="va-generate">
      <div className="va-card">
        <p className="va-card-title ts-centered-title">Step 1 — Select a Student</p>
        <div className="va-student-list">
          {MOCK_STUDENTS.map((student) => (
            <div
              key={student.id}
              className={`va-student-row ts-student-row ${selectedStudent?.id === student.id ? "selected" : ""}`}
            >
              <div className="va-student-avatar" />
              <div className="va-student-info ts-student-info">
                <span className="va-student-name">{student.name}</span>
                <span className="va-student-grade">Grade – {student.grade}</span>
              </div>
              <button className="va-select-btn" onClick={() => selectStudent(student)}>
                {selectedStudent?.id === student.id ? "Selected" : "Select"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedStudent && (
        <div className="va-card">
          <p className="va-card-title">Step 2 — Select Student IEP Goal/s</p>
          <div className="ts-goal-list">
            {selectedStudent.goals.map((goal) => (
              <label key={goal} className="ts-goal-item">
                <input
                  type="checkbox"
                  checked={selectedGoals.includes(goal)}
                  onChange={() => toggleGoal(goal)}
                />
                <span>{goal}</span>
              </label>
            ))}
          </div>
          <div className="va-actions ts-center-actions">
            <button
              className="btn btn-submit"
              onClick={handleGenerate}
              disabled={selectedGoals.length === 0}
            >
              Generate Teaching Strategy
            </button>
          </div>
        </div>
      )}

      {generated && (
        <div className="va-card ts-detail-card">
          <h3>{generated.title}</h3>
          <p><strong>Overview:</strong> {generated.overview}</p>
          <p><strong>Strategies:</strong> {generated.strategies}</p>
          <p><strong>Tips:</strong> {generated.tips}</p>
          <p><strong>Implementation Tips:</strong> {generated.implementationTips}</p>
          <div className="va-actions ts-center-actions">
            <button className="btn btn-submit" onClick={handleSave}>Save Strategy</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyDetails({ strategy, onBack }) {
  return (
    <div className="va-card ts-detail-card">
      <h2>{strategy.title}</h2>
      <div className="ts-detail-grid">
        <section>
          <h4>Overview</h4>
          <p>{strategy.overview}</p>
        </section>
        <section>
          <h4>Tips:</h4>
          <p>{strategy.tips}</p>
        </section>
        <section className="ts-wide">
          <h4>Strategies:</h4>
          <p>{strategy.strategies}</p>
        </section>
        <section className="ts-wide">
          <h4>Implementation Tips</h4>
          <p>{strategy.implementationTips}</p>
        </section>
      </div>
      <div className="ts-page-actions">
        <button className="btn btn-back" onClick={onBack}>BACK</button>
        <button className="btn btn-submit">EXPORT</button>
      </div>
    </div>
  );
}

function ViewTab({ strategies }) {
  const [selected, setSelected] = useState(null);
  if (selected) return <StrategyDetails strategy={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="va-card">
      <p className="va-card-title ts-centered-title">Saved Teaching Strategies</p>
      <table className="va-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Strategy Title</th>
            <th>Goal</th>
            <th>Date Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((strategy) => (
            <tr key={strategy.id}>
              <td>{strategy.student}</td>
              <td>{strategy.title}</td>
              <td><span className="va-badge">{strategy.goal}</span></td>
              <td>{strategy.date}</td>
              <td><button className="va-view-btn" onClick={() => setSelected(strategy)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditTab({ strategies, onUpdate }) {
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);

  const openEdit = (strategy) => {
    setSelected(strategy);
    setForm({ ...strategy });
  };

  const saveEdit = () => {
    onUpdate(form);
    setSelected(null);
    setForm(null);
    alert("Teaching strategy updated successfully.");
  };

  if (selected && form) {
    return (
      <div className="va-card ts-edit-card">
        <h2>{selected.title}</h2>
        <div className="ts-form-grid">
          <label>
            Strategy Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label>
            Overview
            <textarea value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} />
          </label>
          <label>
            Strategies
            <textarea value={form.strategies} onChange={(e) => setForm({ ...form, strategies: e.target.value })} />
          </label>
          <label>
            Tips
            <textarea value={form.tips} onChange={(e) => setForm({ ...form, tips: e.target.value })} />
          </label>
          <label>
            Implementation Tips
            <textarea value={form.implementationTips} onChange={(e) => setForm({ ...form, implementationTips: e.target.value })} />
          </label>
        </div>
        <div className="ts-page-actions">
          <button className="btn btn-back" onClick={() => setSelected(null)}>BACK</button>
          <button className="btn btn-submit" onClick={saveEdit}>SAVE</button>
        </div>
      </div>
    );
  }

  return (
    <div className="va-card">
      <p className="va-card-title ts-centered-title">Edit Teaching Strategies</p>
      <table className="va-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Strategy Title</th>
            <th>Goal</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((strategy) => (
            <tr key={strategy.id}>
              <td>{strategy.student}</td>
              <td>{strategy.title}</td>
              <td><span className="va-badge">{strategy.goal}</span></td>
              <td><button className="va-view-btn" onClick={() => openEdit(strategy)}>Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeleteTab({ strategies, onDelete }) {
  const [toDelete, setToDelete] = useState(null);
  const item = useMemo(
    () => strategies.find((strategy) => strategy.id === toDelete),
    [strategies, toDelete]
  );

  const confirmDelete = () => {
    onDelete(toDelete);
    setToDelete(null);
  };

  return (
    <div className="va-card">
      <p className="va-card-title ts-centered-title">Delete Teaching Strategies</p>
      <table className="va-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Strategy Title</th>
            <th>Goal</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map((strategy) => (
            <tr key={strategy.id}>
              <td>{strategy.student}</td>
              <td>{strategy.title}</td>
              <td><span className="va-badge">{strategy.goal}</span></td>
              <td>
                <button className="va-delete-btn" onClick={() => setToDelete(strategy.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {toDelete && (
        <div className="va-modal-overlay">
          <div className="va-modal">
            <p className="va-modal-title">Delete Teaching Strategy?</p>
            <p className="va-modal-body">
              Are you sure you want to delete <strong>{item?.title}</strong>? This action cannot be undone.
            </p>
            <div className="va-modal-actions">
              <button className="btn btn-back" onClick={() => setToDelete(null)}>Cancel</button>
              <button className="btn va-btn-danger" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageTeachingStrategies() {
  const [activeTab, setActiveTab] = useState("generate");
  const [strategies, setStrategies] = useState(INITIAL_STRATEGIES);

  const saveStrategy = (strategy) => {
    setStrategies((prev) => [strategy, ...prev]);
  };

  const updateStrategy = (updated) => {
    setStrategies((prev) => prev.map((strategy) => strategy.id === updated.id ? updated : strategy));
  };

  const deleteStrategy = (id) => {
    setStrategies((prev) => prev.filter((strategy) => strategy.id !== id));
  };

  return (
    <div className="page-content">
      <div className="va-header ts-header">
        <span className="va-header-title">Manage Teaching Strategies</span>
        <div className="va-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`va-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="va-body">
        {activeTab === "generate" && <GenerateTab onSave={saveStrategy} />}
        {activeTab === "view" && <ViewTab strategies={strategies} />}
        {activeTab === "edit" && <EditTab strategies={strategies} onUpdate={updateStrategy} />}
        {activeTab === "delete" && <DeleteTab strategies={strategies} onDelete={deleteStrategy} />}
      </div>
    </div>
  );
}
