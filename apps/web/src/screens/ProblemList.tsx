import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { PageHeader } from "../components/AppShell";
import { Icon, Kbd, Meter } from "../components/ui";
import { type Difficulty, PRACTICE, PRACTICE_TOTALS, type PracticeProblem } from "../mock/data";

const DIFFICULTY_LABEL: Record<Difficulty, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };
const DIFFICULTY_BARS: Record<Difficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };

type StatusFilter = "all" | "solved" | "attempted" | "new";

function DifficultyMark({ level }: { level: Difficulty }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted">
      <span aria-hidden="true" className="inline-flex items-end gap-[2px]">
        {[1, 2, 3].map((bar) => (
          <span key={bar} className={`w-[3px] rounded-[1px] ${bar <= DIFFICULTY_BARS[level] ? "bg-fg" : "bg-line-strong"}`} style={{ height: 4 + bar * 3 }} />
        ))}
      </span>
      {DIFFICULTY_LABEL[level]}
    </span>
  );
}

function StatusMark({ status }: { status: PracticeProblem["status"] }) {
  if (status === "solved") return <Icon name="check" className="size-4 text-ok" />;
  if (status === "attempted") return <span title="Attempted" className="block size-2 rounded-full border-[1.5px] border-slow" />;
  return null;
}

export function ProblemList() {
  const navigate = useNavigate();
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [cursor, setCursor] = useState(0);

  const problems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRACTICE.filter((p) => {
      if (difficulty !== "all" && p.difficulty !== difficulty) return false;
      if (status === "solved" && p.status !== "solved") return false;
      if (status === "attempted" && p.status !== "attempted") return false;
      if (status === "new" && p.status !== null) return false;
      return !q || p.title.toLowerCase().includes(q) || p.tags.some((tag) => tag.includes(q));
    });
  }, [query, difficulty, status]);

  useEffect(() => {
    setCursor(0);
  }, [query, difficulty, status]);

  // j/k to move, Enter to open, / to search
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement).closest("input, select, textarea");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        search.current?.focus();
        return;
      }
      if (typing) {
        if (event.key === "Escape") (event.target as HTMLElement).blur();
        return;
      }
      if (event.key === "j" || event.key === "ArrowDown") setCursor((c) => Math.min(problems.length - 1, c + 1));
      else if (event.key === "k" || event.key === "ArrowUp") setCursor((c) => Math.max(0, c - 1));
      else if (event.key === "Enter" && problems[cursor]) navigate(`/problems/${problems[cursor].slug}`);
      else return;
      event.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [problems, cursor, navigate]);

  const solved = (level: Difficulty) => PRACTICE.filter((p) => p.difficulty === level && p.status === "solved").length;

  return (
    <div className="gutter mx-auto flex max-w-[1240px] flex-col gap-8 py-10">
      <PageHeader title="Problems">
        <dl className="grid w-full grid-cols-3 gap-6 sm:w-auto sm:min-w-[420px]">
          {(["EASY", "MEDIUM", "HARD"] as const).map((level) => (
            <div key={level} className="flex flex-col gap-2">
              <dt className="label">{DIFFICULTY_LABEL[level]}</dt>
              <dd className="num text-base">
                {solved(level)}
                <span className="text-faint">/{PRACTICE_TOTALS[level]}</span>
              </dd>
              <Meter value={solved(level)} total={PRACTICE_TOTALS[level]} />
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex min-w-0 flex-1 items-center sm:max-w-sm">
            <span className="sr-only">Search problems</span>
            <Icon name="search" className="pointer-events-none absolute left-2.5 size-4 text-faint" />
            <input
              id="problem-search"
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or tag"
              className="h-9 w-full rounded-sm border border-line bg-raised pr-9 pl-8 text-base placeholder:text-faint focus:border-line-strong focus:outline-none"
            />
            <span className="pointer-events-none absolute right-2 text-faint">
              <Kbd>/</Kbd>
            </span>
          </label>
          <select
            id="difficulty-filter"
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}
            className="h-9 rounded-sm border border-line bg-raised px-2.5 text-base"
          >
            <option value="all">Any difficulty</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <select
            id="status-filter"
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="h-9 rounded-sm border border-line bg-raised px-2.5 text-base"
          >
            <option value="all">Any status</option>
            <option value="new">Not tried</option>
            <option value="attempted">Attempted</option>
            <option value="solved">Solved</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-raised">
                <th scope="col" className="w-10 py-2.5 pl-4"><span className="sr-only">Status</span></th>
                <th scope="col" className="label py-2.5 font-normal">Problem</th>
                <th scope="col" className="label hidden py-2.5 font-normal md:table-cell">First seen</th>
                <th scope="col" className="label py-2.5 font-normal">Difficulty</th>
                <th scope="col" className="label py-2.5 text-right font-normal">Acceptance</th>
                <th scope="col" className="label py-2.5 pr-4 text-right font-normal">Solvers</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem, i) => (
                <tr
                  key={problem.slug}
                  aria-selected={i === cursor}
                  onMouseEnter={() => setCursor(i)}
                  className={`border-b border-line last:border-b-0 ${i === cursor ? "bg-hover" : ""}`}
                >
                  <td className="py-3 pl-4">
                    <StatusMark status={problem.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <Link to={`/problems/${problem.slug}`} className="flex flex-col gap-0.5 outline-offset-4">
                      <span className="text-base font-semibold text-fg">{problem.title}</span>
                      <span className="text-sm text-faint">{problem.tags.join(" · ")}</span>
                    </Link>
                  </td>
                  <td className="hidden py-3 pr-4 text-sm text-muted md:table-cell">{problem.from}</td>
                  <td className="py-3 pr-4 text-sm">
                    <DifficultyMark level={problem.difficulty} />
                  </td>
                  <td className="num py-3 text-right text-sm text-muted">{problem.acceptance}%</td>
                  <td className="num py-3 pr-4 text-right text-sm text-muted">{problem.solvers}</td>
                </tr>
              ))}
              {problems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-base text-muted">
                    Nothing matches “{query}”. Try a tag like <span className="num">dp</span> or <span className="num">graphs</span>.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="hidden items-center gap-3 text-sm text-faint md:flex">
          <Kbd>j</Kbd>
          <Kbd>k</Kbd> to move <Kbd>↵</Kbd> to open <Kbd>/</Kbd> to search
        </p>
      </div>
    </div>
  );
}
