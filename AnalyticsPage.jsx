import { useMemo, useState } from "react";
import "../styles/analytics.css";

import { useUserAnalytics } from "../hooks/useUserAnalytics";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import {
  computeSummary,
  filterByDateRange,
  formatShortDateLabel,
  formatTableDate,
  groupByFilePerformance,
  makeIdMap,
  secondsToMMSS,
} from "../utils/analytics";

function percent(n) {
  return `${Math.round(n)}%`;
}

export default function AnalyticsPage() {
  const { data, loading, error } = useUserAnalytics();

  // Controls like your sketch
  const [dateRange, setDateRange] = useState("7d"); // "7d" | "30d" | "all"
  const [fileId, setFileId] = useState("all");
  const [theme, setTheme] = useState("light"); // "light" | "tint"

  const files = data?.files || [];
  const quizzes = data?.quizzes || [];
  const attempts = data?.attempts || [];

  // For fast lookups: filesById[fileId], quizzesById[quizId]
  const filesById = useMemo(() => makeIdMap(files), [files]);
  const quizzesById = useMemo(() => makeIdMap(quizzes), [quizzes]);

  // Apply filters
  const filteredAttempts = useMemo(() => {
    const byDate = filterByDateRange(attempts, dateRange);
    if (fileId === "all") return byDate;
    return byDate.filter((a) => a.sourceFileId === fileId);
  }, [attempts, dateRange, fileId]);

  // Summary numbers inside the big summary card
  const summary = useMemo(() => computeSummary(filteredAttempts), [filteredAttempts]);

  // Score over time line chart data
  const scoreOverTime = useMemo(() => {
    return filteredAttempts
      .slice()
      .sort((a, b) => +new Date(a.attemptedAt) - +new Date(b.attemptedAt))
      .map((a) => ({
        attemptedAtLabel: formatShortDateLabel(a.attemptedAt),
        scorePercent: a.scorePercent,
      }));
  }, [filteredAttempts]);

  // Avg score by file bar chart data
  const perfByFile = useMemo(() => {
    return groupByFilePerformance(filteredAttempts, filesById);
  }, [filteredAttempts, filesById]);

  // "Amount of quiz finished" data: attempts per quiz
  const attemptsByQuiz = useMemo(() => {
    const map = new Map();
    for (const a of filteredAttempts) {
      const title = quizzesById[a.quizId]?.title || "Quiz";
      const key = a.quizId;
      const existing = map.get(key) || { quizTitle: title, attempts: 0 };
      existing.attempts += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.attempts - a.attempts);
  }, [filteredAttempts, quizzesById]);

  // Recent attempts list for table (top 8)
  const recentRows = useMemo(() => {
    return filteredAttempts
      .slice()
      .sort((a, b) => +new Date(b.attemptedAt) - +new Date(a.attemptedAt))
      .slice(0, 8);
  }, [filteredAttempts]);

  const username = data?.userId ? `@${data.userId}` : "@username";

  if (loading) {
    return (
      <div className={`analyticsShell ${theme}`}>
        <div className="mainArea">
          <div className="stateCard">Loading analytics…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`analyticsShell ${theme}`}>
        <div className="mainArea">
          <div className="stateCard">
            <div className="stateTitle">Couldn’t load analytics</div>
            <div className="stateSub">{error}</div>
            <button className="btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`analyticsShell ${theme}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">QuizForge</div>

        <nav className="nav">
          <a className="navItem" href="/upload">
            Upload
          </a>
          <a className="navItem" href="/quiz">
            Quiz
          </a>
          <a className="navItem active" href="/analytics">
            Analytics
          </a>
        </nav>

        <div className="sidebarFoot">Library</div>
      </aside>

      {/* Main */}
      <main className="mainArea">
        {/* Top row controls (right aligned like your sketch) */}
        <div className="topRow">
          <div className="pageTitleWrap">
            <h1 className="pageTitle">Analytics</h1>
            <div className="pageSub">Your personal learning progress</div>
          </div>

          <div className="controls">
            <button
              className="btn"
              onClick={() => setTheme((t) => (t === "light" ? "tint" : "light"))}
              title="Change background color"
              type="button"
            >
              Change background
            </button>

            <div className="usernamePill">{username}</div>

            <div className="controlBlock">
              <div className="controlLabel">Date range</div>
              <select
                className="select"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7d">7 days</option>
                <option value="30d">1 month</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="controlBlock">
              <div className="controlLabel">Source file</div>
              <select
                className="select"
                value={fileId}
                onChange={(e) => setFileId(e.target.value)}
              >
                <option value="all">All files</option>
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <section className="card summaryCard">
          <div className="cardHead">
            <h2 className="cardTitle">Summary card</h2>
            <div className="cardHint">Overview for selected filters</div>
          </div>

          <div className="summaryGrid">
            <div className="kpi">
              <div className="kpiLabel">Total attempts</div>
              <div className="kpiValue">{summary.totalAttempts}</div>
            </div>
            <div className="kpi">
              <div className="kpiLabel">Average score</div>
              <div className="kpiValue">{percent(summary.avgScore)}</div>
            </div>
            <div className="kpi">
              <div className="kpiLabel">Best score</div>
              <div className="kpiValue">{percent(summary.bestScore)}</div>
            </div>
            <div className="kpi">
              <div className="kpiLabel">Avg time</div>
              <div className="kpiValue">{secondsToMMSS(summary.avgTimeSeconds)}</div>
            </div>
          </div>
        </section>

        {/* 2x2 grid */}
        <section className="grid2x2">
          {/* Score over time */}
          <div className="card">
            <div className="cardHead">
              <h3 className="cardTitle">Score over time</h3>
              <div className="cardHint">Are you improving?</div>
            </div>

            <div className="chartBox">
              <ResponsiveContainer>
                <LineChart data={scoreOverTime} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="attemptedAtLabel" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v) => `${Math.round(Number(v))}%`} />
                  <Line type="monotone" dataKey="scorePercent" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Avg score by file */}
          <div className="card">
            <div className="cardHead">
              <h3 className="cardTitle">Avg score by file</h3>
              <div className="cardHint">Strengths vs struggles</div>
            </div>

            <div className="chartBox">
              <ResponsiveContainer>
                <BarChart data={perfByFile} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fileName" hide />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fileName || ""}
                    formatter={(v) => `${Math.round(Number(v))}%`}
                  />
                  <Bar dataKey="avgScorePercent" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="miniList">
              {perfByFile.slice(0, 4).map((x) => (
                <div className="miniRow" key={x.sourceFileId}>
                  <div className="miniLeft" title={x.fileName}>
                    {x.fileName}
                  </div>
                  <div className="miniRight">
                    {Math.round(x.avgScorePercent)}% · {x.attempts}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent attempts */}
          <div className="card">
            <div className="cardHead">
              <h3 className="cardTitle">Recent attempts</h3>
              <div className="cardHint">Latest activity</div>
            </div>

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Quiz</th>
                    <th>Score</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="mutedCell">
                        No attempts yet.
                      </td>
                    </tr>
                  ) : (
                    recentRows.map((a) => {
                      const quizTitle = quizzesById[a.quizId]?.title || "Quiz";
                      return (
                        <tr key={a.id}>
                          <td className="muted">{formatTableDate(a.attemptedAt)}</td>
                          <td className="muted">{quizTitle}</td>
                          <td className="strong">{Math.round(a.scorePercent)}%</td>
                          <td className="muted">{secondsToMMSS(a.timeTakenSeconds)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount of quiz finished */}
          <div className="card">
            <div className="cardHead">
              <h3 className="cardTitle">Amount of quiz finished</h3>
              <div className="cardHint">Attempts per quiz</div>
            </div>

            <div className="chartBox">
              <ResponsiveContainer>
                <BarChart data={attemptsByQuiz} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quizTitle" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.quizTitle || ""}
                    formatter={(v) => `${Number(v)} attempts`}
                  />
                  <Bar dataKey="attempts" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="miniList">
              {attemptsByQuiz.slice(0, 4).map((x) => (
                <div className="miniRow" key={x.quizTitle}>
                  <div className="miniLeft" title={x.quizTitle}>
                    {x.quizTitle}
                  </div>
                  <div className="miniRight">{x.attempts}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}