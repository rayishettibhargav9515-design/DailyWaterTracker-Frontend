
import { useEffect, useState } from "react";
import "./App.css";

const DEFAULT_GOAL = 2000;
const API_URL = "http://localhost:8080/api/water";

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadDailyGoal() {
  try {
    const saved = localStorage.getItem("waterTrackerGoal");
    if (saved === null || saved.trim() === "") {
      return DEFAULT_GOAL;
    }

    const goal = Number(saved);
    return Number.isFinite(goal) && goal >= 250 && goal <= 10000
      ? goal
      : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

function App() {
  const [entries, setEntries] = useState([]);
  const [customAmount, setCustomAmount] = useState("");
  const [dailyGoal, setDailyGoal] = useState(loadDailyGoal);
  const [goalInput, setGoalInput] = useState(
    () => String(loadDailyGoal())
  );
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  // Load today's water records from the Java backend.
  async function loadEntries() {
    try {
      setApiError("");

      const response = await fetch(
        `${API_URL}?date=${getToday()}`
      );

      if (!response.ok) {
        throw new Error("Could not load water records.");
      }

      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      setApiError(
        "Could not connect to the Java backend. Check that Spring Boot is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  const total = entries.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0
  );

  const remaining = Math.max(dailyGoal - total, 0);
  const progress = Math.min((total / dailyGoal) * 100, 100);

  function saveGoal() {
    if (goalInput.trim() === "") {
      alert("Please enter a daily goal.");
      return;
    }

    const newGoal = Number(goalInput);

    if (
      !Number.isFinite(newGoal) ||
      newGoal < 250 ||
      newGoal > 10000
    ) {
      alert("Please enter a goal between 250 and 10000 ml.");
      return;
    }

    const roundedGoal = Math.round(newGoal);

    try {
      localStorage.setItem(
        "waterTrackerGoal",
        String(roundedGoal)
      );

      setDailyGoal(roundedGoal);
      setGoalInput(String(roundedGoal));
      alert("Daily water goal saved successfully!");
    } catch {
      alert("Could not save your goal in browser storage.");
    }
  }

  async function addWater(amount) {
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 10000
    ) {
      alert("Please enter a water amount between 1 and 10000 ml.");
      return;
    }

    try {
      setApiError("");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount),
          date: getToday(),
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save the water record.");
      }

      // Reload records so the screen uses the database response.
      await loadEntries();
      setCustomAmount("");
    } catch {
      setApiError(
        "Could not save your water record. Check the backend and try again."
      );
    }
  }

  async function resetToday() {
    const confirmed = window.confirm(
      "Are you sure you want to clear today's water records?"
    );

    if (!confirmed) return;

    try {
      setApiError("");

      // Delete today's records from the Java backend.
      const results = await Promise.all(
        entries.map((entry) =>
          fetch(`${API_URL}/${entry.id}`, {
            method: "DELETE",
          })
        )
      );

      if (results.some((response) => !response.ok)) {
        throw new Error("Some records could not be deleted.");
      }

      await loadEntries();
    } catch {
      setApiError(
        "Could not reset all records. Please check the backend and try again."
      );
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">💧</span>
          AquaTrack
        </a>

        <span className="today-label">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </header>

      <main className="main-content" id="home">
        <section className="welcome">
          <span className="eyebrow">YOUR DAILY WELLNESS</span>
          <h1>
            Stay hydrated.
            <br />
            Feel your best.
          </h1>
          <p>
            Every glass counts. Keep track of your water intake
            and build a healthier daily habit.
          </p>
        </section>

        {apiError && (
          <div className="card" role="alert">
            <p>{apiError}</p>
            <button className="add-button" onClick={loadEntries}>
              Retry connection
            </button>
          </div>
        )}

        <section className="dashboard">
          <div className="card progress-card">
            <div className="card-heading">
              <div>
                <span className="muted">TODAY'S INTAKE</span>
                <h2>Water progress</h2>
              </div>
              <span className="water-icon">💧</span>
            </div>

            <div className="goal-settings">
              <label className="input-label" htmlFor="dailyGoal">
                Your daily water goal (ml)
              </label>

              <div className="custom-input-row">
                <input
                  id="dailyGoal"
                  type="number"
                  min="250"
                  max="10000"
                  step="50"
                  placeholder="Enter daily goal"
                  value={goalInput}
                  onChange={(event) =>
                    setGoalInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveGoal();
                  }}
                />

                <button className="add-button" onClick={saveGoal}>
                  Save Goal
                </button>
              </div>

              <p className="goal-help">
                Choose a goal between 250 and 10000 ml.
              </p>
            </div>

            <div className="progress-info">
              <div className="total">
                {total.toLocaleString("en-IN")}
                <span> ml</span>
              </div>

              <span className="goal">
                Goal: {dailyGoal.toLocaleString("en-IN")} ml
              </span>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Daily water goal progress"
              aria-valuemin={0}
              aria-valuemax={dailyGoal}
              aria-valuenow={Math.min(total, dailyGoal)}
            >
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="progress-footer">
              <span>{Math.round(progress)}% completed</span>
              <span>
                {remaining > 0
                  ? `${remaining.toLocaleString("en-IN")} ml to go`
                  : "🎉 Daily goal reached!"}
              </span>
            </div>

            <div className="stats">
              <div className="stat-box">
                <span className="stat-icon">🥤</span>
                <span className="stat-number">{entries.length}</span>
                <span className="stat-label">Drinks logged</span>
              </div>

              <div className="stat-box">
                <span className="stat-icon">🎯</span>
                <span className="stat-number">
                  {Math.max(
                    0,
                    Math.ceil(dailyGoal / 250) -
                      Math.floor(total / 250)
                  )}
                </span>
                <span className="stat-label">
                  250 ml glasses left
                </span>
              </div>
            </div>
          </div>

          <div className="card add-card">
            <span className="muted">QUICK ADD</span>
            <h2>Have a glass of water?</h2>
            <p className="card-description">
              Select the amount you just drank.
            </p>

            <div className="quick-buttons">
              <button
                className="amount-button"
                onClick={() => addWater(250)}
                disabled={loading}
              >
                <span>🥛</span>
                <strong>250ml</strong>
                <small>Small glass</small>
              </button>

              <button
                className="amount-button"
                onClick={() => addWater(500)}
                disabled={loading}
              >
                <span>🍶</span>
                <strong>500 ml</strong>
                <small>Large glass</small>
              </button>
            </div>

            <label className="input-label" htmlFor="customAmount">
              Custom amount (ml)
            </label>

            <div className="custom-input-row">
              <input
                id="customAmount"
                type="number"
                min="1"
                max="10000"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(event) =>
                  setCustomAmount(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    addWater(Number(customAmount));
                  }
                }}
              />

              <button
                className="add-button"
                onClick={() => addWater(Number(customAmount))}
                disabled={loading}
              >
                + Add
              </button>
            </div>

            <p className="tip">
              💡 Tip: Drink water regularly throughout the day.
            </p>
          </div>
        </section>

        <section className="card history-card">
          <div className="history-heading">
            <div>
              <span className="muted">YOUR ACTIVITY</span>
              <h2>Today's water log</h2>
            </div>

            <button
              className="reset-button"
              onClick={resetToday}
              disabled={loading || entries.length === 0}
            >
              Reset day
            </button>
          </div>

          {loading ? (
            <div className="empty-state">
              <p>Loading your water records...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <span>💧</span>
              <h3>No water logged yet</h3>
              <p>Add your first glass above to get started.</p>
            </div>
          ) : (
            <div className="history-list">
              {[...entries].reverse().map((entry) => (
                <div className="history-item" key={entry.id}>
                  <span className="history-drop">💧</span>

                  <div className="history-details">
                    <strong>Water intake</strong>
                    <span>
                      {entry.time || entry.date || "Recorded"}
                    </span>
                  </div>

                  <strong className="history-amount">
                    +{entry.amount} ml
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="footer">
          <span>💧 AquaTrack</span>
          <span>Small habits. Healthier days.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
