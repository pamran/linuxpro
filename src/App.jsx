import { useEffect, useMemo, useRef, useState } from "react";
import {
  AUTHOR,
  categories,
  commands,
  quickTerminalCommands,
  quizQuestions,
  roadmap,
  simulateCommand,
} from "./data";

const levels = ["all", "beginner", "intermediate", "advanced", "pro"];
const progressLevels = ["beginner", "intermediate", "advanced", "pro"];
const progressColors = {
  beginner: "#22c55e",
  intermediate: "#fbbf24",
  advanced: "#ef4444",
  pro: "#a78bfa",
};

function App() {
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [view, setView] = useState("commands");
  const [search, setSearch] = useState("");
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [copied, setCopied] = useState(false);
  const [learned, setLearned] = useState(() => {
    try {
      const saved = window.localStorage.getItem("linuxpro.learned");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [quizSelection, setQuizSelection] = useState(null);
  const [termHistory, setTermHistory] = useState([]);
  const [termHistoryIndex, setTermHistoryIndex] = useState(-1);
  const [termLines, setTermLines] = useState([
    { type: "output", text: "Welcome to LinuxPro Terminal Simulator v1.0" },
    { type: "output", text: "Type commands to see what they do. Try: help, ls, pwd, whoami, date, uname -a" },
    { type: "spacer", text: "" },
  ]);
  const [termInput, setTermInput] = useState("");
  const termBodyRef = useRef(null);

  useEffect(() => {
    window.localStorage.setItem("linuxpro.learned", JSON.stringify([...learned]));
  }, [learned]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  useEffect(() => {
    const body = termBodyRef.current;
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }, [termLines]);

  const filteredCommands = useMemo(() => {
    const query = search.trim().toLowerCase();
    return commands.filter((command) => {
      const matchesLevel = selectedLevel === "all" || command.level === selectedLevel;
      const matchesCategory = selectedCategory === "all" || command.cat === selectedCategory;
      const matchesSearch =
        !query ||
        command.name.toLowerCase().includes(query) ||
        command.desc.toLowerCase().includes(query) ||
        command.tags.some((tag) => tag.toLowerCase().includes(query));

      return matchesLevel && matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory, selectedLevel]);

  const flatCheatsheet = useMemo(
    () =>
      commands.map((command) => ({
        cmd: command.syntax,
        name: command.name,
        desc: `${command.desc.substring(0, 60)}...`,
        level: command.level,
      })),
    [],
  );

  const activeQuiz = quizQuestions[quizIndex % quizQuestions.length];
  const activeCategoryName =
    selectedCategory === "all"
      ? "All Commands"
      : categories.find((category) => category.id === selectedCategory)?.name ?? "";

  function updateCommandsView(nextLevel, nextView = "commands") {
    setSelectedLevel(nextLevel);
    setView(nextView);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    if (view !== "commands") {
      setView("commands");
    }
  }

  function handleCategoryChange(categoryId) {
    setSelectedCategory(categoryId);
    setView("commands");
  }

  function toggleLearned(commandId) {
    setLearned((current) => {
      const next = new Set(current);
      if (next.has(commandId)) {
        next.delete(commandId);
      } else {
        next.add(commandId);
      }
      return next;
    });
  }

  async function copyCommand(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function answerQuiz(index) {
    if (quizSelection !== null) {
      return;
    }

    setQuizSelection(index);
    setQuizTotal((current) => current + 1);

    if (index === activeQuiz.answer) {
      setQuizScore((current) => current + 1);
    }
  }

  function nextQuiz() {
    setQuizSelection(null);
    setQuizIndex((current) => (current + 1) % quizQuestions.length);
  }

  function openQuiz() {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizTotal(0);
    setQuizSelection(null);
    setView("quiz");
  }

  function clearTerminal() {
    setTermLines([]);
  }

  function runTerminalCommand(rawCommand) {
    const command = rawCommand.trim();
    if (!command) {
      return;
    }

    setTermHistory((current) => [command, ...current]);
    setTermHistoryIndex(-1);

    const result = simulateCommand(command);
    if (result.clear) {
      setTermLines([]);
      return;
    }

    setTermLines((current) => [
      ...current,
      { type: "command", text: command },
      ...result.lines.map((line) => ({ type: "output", text: line })),
      { type: "spacer", text: "" },
    ]);
  }

  function handleTerminalKeyDown(event) {
    if (event.key === "Enter") {
      runTerminalCommand(termInput);
      setTermInput("");
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (termHistory.length === 0) {
        return;
      }
      const nextIndex = Math.min(termHistoryIndex + 1, termHistory.length - 1);
      setTermHistoryIndex(nextIndex);
      setTermInput(termHistory[nextIndex] ?? "");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (termHistory.length === 0) {
        return;
      }
      const nextIndex = Math.max(termHistoryIndex - 1, -1);
      setTermHistoryIndex(nextIndex);
      setTermInput(nextIndex === -1 ? "" : termHistory[nextIndex] ?? "");
    }
  }

  function renderCommandsView() {
    if (filteredCommands.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-title">No commands found</div>
          <div className="empty-copy">Try a different search term or filter</div>
        </div>
      );
    }

    return (
      <>
        <div className="section-head">
          <h2>
            🐧 <span className="accent">{activeCategoryName}</span>
          </h2>
          <div className="count-badge">{filteredCommands.length} commands</div>
        </div>
        <div className="cmd-grid">
          {filteredCommands.map((command) => {
            const category = categories.find((entry) => entry.id === command.cat);
            const isLearned = learned.has(command.id);
            return (
              <div className="cmd-card" key={command.id} onClick={() => setSelectedCommand(command)}>
                <div className="card-header">
                  <div className="card-title">
                    <div className="card-icon" style={{ background: `${category?.color ?? "#00d4ff"}22` }}>
                      {category?.icon ?? "⚙️"}
                    </div>
                    <span>{command.name}</span>
                    {isLearned ? <span className="learned-mark">✓ learned</span> : null}
                  </div>
                  <span className={`difficulty diff-${command.level}`}>{command.level}</span>
                </div>
                <div className="card-body">
                  <p>{command.desc}</p>
                  <div className="cmd-snippet">
                    {command.syntax}
                    <button
                      className="copy-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        copyCommand(command.syntax);
                      }}
                      type="button"
                    >
                      copy
                    </button>
                  </div>
                  <div className="cmd-tags">
                    {command.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  function renderRoadmapView() {
    return (
      <>
        <div className="section-head">
          <h2>
            🗺 Learning <span className="accent">Roadmap</span>
          </h2>
          <div className="count-badge">{roadmap.length} stages</div>
        </div>
        <div className="panel-card roadmap-panel">
          <div className="roadmap">
            {roadmap.map((stage) => (
              <div className="road-item" key={stage.num}>
                <div className="road-line" />
                <div className={`road-num ${stage.status} ${stage.status === "active" ? "active-pulse" : ""}`}>
                  {stage.status === "done" ? "✓" : stage.status === "active" ? "▶" : stage.num}
                </div>
                <div className="road-content">
                  <h4 className={stage.status === "locked" ? "muted-title" : ""}>
                    {stage.title}{" "}
                    {stage.status === "done" ? <span className="status-done">Completed</span> : null}
                    {stage.status === "active" ? <span className="status-active">In Progress</span> : null}
                  </h4>
                  <p>{stage.desc}</p>
                  <div className="road-topics">
                    {stage.topics.map((topic) => (
                      <span className="road-topic" key={topic}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function renderCheatsheetView() {
    return (
      <>
        <div className="section-head">
          <h2>
            📋 Quick <span className="accent">Cheatsheet</span>
          </h2>
          <div className="count-badge">{flatCheatsheet.length} entries</div>
        </div>
        <div className="panel-card table-shell">
          <table className="cheat-table">
            <thead>
              <tr>
                <th>Command</th>
                <th>Name</th>
                <th>Description</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {flatCheatsheet.map((row) => (
                <tr key={`${row.name}-${row.cmd}`}>
                  <td className="cmd-cell">{row.cmd}</td>
                  <td className="name-cell">{row.name}</td>
                  <td className="desc-cell">{row.desc}</td>
                  <td>
                    <span className={`difficulty diff-${row.level}`}>{row.level}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderQuizView() {
    const explanation =
      quizSelection === null
        ? ""
        : `${quizSelection === activeQuiz.answer ? "✓ Correct!" : "✗ Wrong."} ${activeQuiz.explain}`;

    return (
      <>
        <div className="section-head">
          <h2>
            🧠 Linux <span className="accent">Quiz</span>
          </h2>
          <div className="count-badge">
            Score: {quizScore}/{quizTotal}
          </div>
        </div>
        <div className="quiz-card">
          <div className="quiz-q">
            Q{quizIndex + 1}. {activeQuiz.question}
          </div>
          <div className="quiz-options">
            {activeQuiz.options.map((option, index) => {
              let className = "quiz-opt";
              if (quizSelection !== null) {
                if (index === activeQuiz.answer) {
                  className += " correct";
                } else if (index === quizSelection) {
                  className += " wrong";
                }
              }

              return (
                <button className={className} key={option} onClick={() => answerQuiz(index)} type="button">
                  <span className="opt-letter">{"ABCD"[index]}</span>
                  {option}
                </button>
              );
            })}
          </div>
          <div className="quiz-footer">
            <div className={`quiz-score ${quizSelection === null ? "" : quizSelection === activeQuiz.answer ? "ok" : "bad"}`}>
              {explanation}
            </div>
            <button className={`quiz-next ${quizSelection !== null ? "show" : ""}`} onClick={nextQuiz} type="button">
              Next Question →
            </button>
          </div>
        </div>
      </>
    );
  }

  function renderTerminalView() {
    return (
      <>
        <div className="section-head">
          <h2>
            💻 Simulated <span className="accent">Terminal</span>
          </h2>
          <div className="count-badge">Try Commands</div>
        </div>
        <div className="terminal">
          <div className="terminal-bar">
            <div className="term-dots">
              <div className="dot r" />
              <div className="dot y" />
              <div className="dot g" />
            </div>
            <div className="terminal-title">user@linux:~$ | LinuxPro Terminal Simulator</div>
            <button className="plain-button" onClick={clearTerminal} type="button">
              clear
            </button>
          </div>
          <div className="terminal-body" ref={termBodyRef}>
            {termLines.map((line, index) => {
              if (line.type === "spacer") {
                return <div className="term-line" key={`space-${index}`} />;
              }

              if (line.type === "command") {
                return (
                  <div className="term-line" key={`cmd-${index}`}>
                    <span className="prompt">user@linux:~$ </span>
                    <span className="cmd-text">{line.text}</span>
                  </div>
                );
              }

              return (
                <div className="term-line" key={`out-${index}`}>
                  <span className="out">{line.text}</span>
                </div>
              );
            })}
          </div>
          <div className="term-input-row">
            <span className="prompt">user@linux:~$</span>
            <input
              className="term-input"
              onChange={(event) => setTermInput(event.target.value)}
              onKeyDown={handleTerminalKeyDown}
              placeholder=" type a command..."
              type="text"
              value={termInput}
            />
          </div>
        </div>
        <div className="panel-card quick-terminal">
          <div className="quick-title">Quick Commands to Try</div>
          <div className="quick-grid">
            {quickTerminalCommands.map((command) => (
              <button
                className="quick-chip"
                key={command}
                onClick={() => runTerminalCommand(command)}
                type="button"
              >
                {command}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  function renderContent() {
    if (view === "roadmap") {
      return renderRoadmapView();
    }
    if (view === "cheatsheet") {
      return renderCheatsheetView();
    }
    if (view === "quiz") {
      return renderQuizView();
    }
    if (view === "terminal") {
      return renderTerminalView();
    }
    return renderCommandsView();
  }

  return (
    <>
      <div className="container">
        <header>
          <div className="logo">
            <div className="logo-icon">🐧</div>
            <div>
              <h1>LinuxPro</h1>
              <span>From Zero to Kernel</span>
            </div>
          </div>
          <div className="header-right">
            <div className="header-stats">
              <div className="hstat">
                <div className="num">{commands.length}</div>
                <div className="lbl">Commands</div>
              </div>
              <div className="hstat">
                <div className="num">{categories.length}</div>
                <div className="lbl">Categories</div>
              </div>
              <div className="hstat">
                <div className="num">{learned.size}</div>
                <div className="lbl">Learned</div>
              </div>
            </div>
            <div className="author-badge" data-author={AUTHOR.name}>
              <div className="author-avatar">{AUTHOR.name[0]}</div>
              <div className="author-info">
                <span className="a-name">{AUTHOR.name}</span>
                <span className="a-role">{AUTHOR.role}</span>
              </div>
              <span className="lock-icon">🔒</span>
            </div>
          </div>
        </header>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            id="search"
            onChange={handleSearchChange}
            placeholder="Search commands, concepts, tools... (e.g. grep, chmod, pipe)"
            type="text"
            value={search}
          />
        </div>

        <div className="level-tabs">
          {levels.map((level) => (
            <button
              className={`tab ${view === "commands" && selectedLevel === level ? "active" : ""}`}
              key={level}
              onClick={() => updateCommandsView(level)}
              type="button"
            >
              {level === "all" ? (
                <span>⚡</span>
              ) : (
                <span className="dot" style={{ background: progressColors[level] }} />
              )}
              {level === "all" ? "All Levels" : `${level.charAt(0).toUpperCase()}${level.slice(1)}`}
            </button>
          ))}
          <button className={`tab utility-tab ${view === "roadmap" ? "active" : ""}`} onClick={() => setView("roadmap")} type="button">
            🗺 Roadmap
          </button>
          <button className={`tab ${view === "cheatsheet" ? "active" : ""}`} onClick={() => setView("cheatsheet")} type="button">
            📋 Cheatsheet
          </button>
          <button className={`tab ${view === "quiz" ? "active" : ""}`} onClick={openQuiz} type="button">
            🧠 Quiz
          </button>
          <button className={`tab ${view === "terminal" ? "active" : ""}`} onClick={() => setView("terminal")} type="button">
            💻 Terminal
          </button>
        </div>

        <div className="main-grid">
          <aside className="sidebar">
            <div className="sidebar-section">
              <h3>
                <span>📁</span> Categories
              </h3>
              <div className="category-list">
                <button
                  className={`cat-item ${selectedCategory === "all" ? "active" : ""}`}
                  onClick={() => handleCategoryChange("all")}
                  type="button"
                >
                  <div className="cat-left">
                    <div className="cat-icon" style={{ background: "rgba(0,212,255,0.1)" }}>
                      ⚡
                    </div>
                    <span>All Commands</span>
                  </div>
                  <span className="badge">{commands.length}</span>
                </button>
                {categories.map((category) => (
                  <button
                    className={`cat-item ${selectedCategory === category.id ? "active" : ""}`}
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    type="button"
                  >
                    <div className="cat-left">
                      <div className="cat-icon" style={{ background: `${category.color}22` }}>
                        {category.icon}
                      </div>
                      <span>{category.name}</span>
                    </div>
                    <span className="badge">{commands.filter((command) => command.cat === category.id).length}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="sidebar-section">
              <h3>
                <span>📈</span> Your Progress
              </h3>
              <div className="progress-wrap">
                {progressLevels.map((level) => {
                  const total = commands.filter((command) => command.level === level).length;
                  const count = [...learned].filter((id) => commands.find((command) => command.id === id && command.level === level)).length;
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div className="prog-item" key={level}>
                      <div className="prog-header">
                        <span className="prog-name">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                        <span className="prog-pct">
                          {count}/{total}
                        </span>
                      </div>
                      <div className="prog-bar">
                        <div className="prog-fill" style={{ width: `${percent}%`, background: progressColors[level] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
          <main className="content-area">{renderContent()}</main>
        </div>
      </div>

      <div className={`modal-overlay ${selectedCommand ? "open" : ""}`} onClick={() => setSelectedCommand(null)} role="presentation">
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          {selectedCommand ? (
            <>
              <div className="modal-head">
                <h2>
                  {categories.find((category) => category.id === selectedCommand.cat)?.icon ?? "⚙️"} {selectedCommand.name}{" "}
                  <span className={`difficulty diff-${selectedCommand.level}`}>{selectedCommand.level}</span>
                </h2>
                <button className="modal-close" onClick={() => setSelectedCommand(null)} type="button">
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>{selectedCommand.desc}</p>
                {selectedCommand.detail.full ? <p className="modal-full">{selectedCommand.detail.full}</p> : null}
                <h4>📟 Examples</h4>
                <div className="modal-code">
                  {selectedCommand.detail.examples.map((example) => (
                    <div className="modal-example" key={`${selectedCommand.id}-${example.cmd}`}>
                      <div className="line">{example.cmd}</div>
                      <div className="comment">{example.comment}</div>
                    </div>
                  ))}
                </div>
                {selectedCommand.detail.tip ? (
                  <div className="tip-box">
                    <div className="tip-icon">💡</div>
                    <div>
                      <strong>Pro Tip:</strong> {selectedCommand.detail.tip}
                    </div>
                  </div>
                ) : null}
                <div className="modal-actions">
                  <button className="success-button" onClick={() => toggleLearned(selectedCommand.id)} type="button">
                    {learned.has(selectedCommand.id) ? "✓ Marked as Learned" : "+ Mark as Learned"}
                  </button>
                  <button className="accent-button" onClick={() => copyCommand(selectedCommand.syntax)} type="button">
                    📋 Copy Syntax
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="container">
        <footer className="site-footer">
          <div className="footer-author" data-author={AUTHOR.name}>
            <div className="fa-avatar">{AUTHOR.name[0]}</div>
            <div className="fa-text">
              <span className="fa-name">{AUTHOR.name}</span>
              <span className="fa-sub">
                {AUTHOR.name} · LinuxPro Dashboard
              </span>
            </div>
            <span className="footer-lock">🔒</span>
          </div>
          <div className="footer-copy">
            © <span>{new Date().getFullYear()}</span> LinuxPro · Built by <span>{AUTHOR.name}</span> · All rights reserved
          </div>
        </footer>
      </div>

      <div className={`notif ${copied ? "show" : ""}`}>✓ Copied to clipboard!</div>
    </>
  );
}

export default App;
