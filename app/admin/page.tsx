"use client";

import { useState, useCallback } from "react";
import { players } from "@/lib/players";
import {
  getTips,
  archiveTips,
  getArchivedTips,
  setTipsOpen,
  type Tip,
} from "@/app/actions/tips";

interface EvalResult extends Tip {
  correctWinner: boolean;
  speedDiff: number;
  score: number;
}

type Tab = "current" | "evaluate" | "history";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("cs", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("current");
  const [tips, setTips] = useState<Tip[]>([]);
  const [archivedTips, setArchivedTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(false);
  const [tipsOpen, setTipsOpenState] = useState(true);
  const [adminError, setAdminError] = useState("");

  // Evaluation
  const [evalWinner, setEvalWinner] = useState("");
  const [evalSpeed, setEvalSpeed] = useState("");
  const [evalResults, setEvalResults] = useState<EvalResult[]>([]);
  const [showEvalResults, setShowEvalResults] = useState(false);

  const loadTips = useCallback(async () => {
    setLoading(true);
    const result = await getTips(password);
    if (result.data) setTips(result.data);
    if (result.tipsOpen !== undefined) setTipsOpenState(result.tipsOpen);
    setLoading(false);
  }, [password]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAuthError("");
    const result = await getTips(password);
    if (result.error) {
      setAuthError(result.error);
    } else {
      setIsAuthenticated(true);
      setTips(result.data || []);
      if (result.tipsOpen !== undefined) setTipsOpenState(result.tipsOpen);
    }
    setLoading(false);
  }

  async function handleToggleTips() {
    const newState = !tipsOpen;
    setAdminError("");
    setLoading(true);
    try {
      const result = await setTipsOpen(password, newState);
      if (result.success) {
        setTipsOpenState(newState);
      } else {
        setAdminError(result.error || "Nepodařilo se změnit stav tipování");
      }
    } catch {
      setAdminError("Chyba při komunikaci se serverem");
    }
    setLoading(false);
  }

  async function handleReset() {
    if (tips.length === 0) return;
    if (
      !confirm(
        "Opravdu obnovit? Aktuální tipy budou přesunuty do historie a začne nové kolo."
      )
    )
      return;
    setLoading(true);
    const result = await archiveTips(password);
    if (result.success) {
      setTips([]);
      setEvalResults([]);
      setShowEvalResults(false);
      setEvalWinner("");
      setEvalSpeed("");
      setTipsOpenState(true);
    }
    setLoading(false);
  }

  async function handleLoadHistory() {
    setActiveTab("history");
    setLoading(true);
    const result = await getArchivedTips(password);
    if (result.data) setArchivedTips(result.data);
    setLoading(false);
  }

  function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    if (!evalWinner || !evalSpeed) return;

    const actualSpeed = Number(evalSpeed);

    const results: EvalResult[] = tips.map((tip) => {
      const correctWinner = tip.player_name === evalWinner;
      const speedDiff = Math.abs(tip.guessed_speed - actualSpeed);
      return {
        ...tip,
        correctWinner,
        speedDiff,
        score: (correctWinner ? 1000 : 0) + Math.max(0, 200 - speedDiff),
      };
    });

    // Sort: correct player first, then by speed difference (closest wins)
    results.sort((a, b) => {
      if (a.correctWinner !== b.correctWinner) return a.correctWinner ? -1 : 1;
      return a.speedDiff - b.speedDiff;
    });

    setEvalResults(results);
    setShowEvalResults(true);
  }

  function groupByPlayer(tipsList: Tip[]) {
    const groups: Record<string, Tip[]> = {};
    for (const tip of tipsList) {
      const key = `${tip.player_club} – ${tip.player_name}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tip);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "cs"));
  }

  // ── Login screen ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">&#9917;</div>
            <h1 className="text-2xl font-bold text-gray-900">Admin panel</h1>
            <p className="text-gray-500 text-sm mt-1">
              Grand Prix Šitbořice
            </p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Zadejte heslo"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {authError && (
            <p className="text-red-500 text-sm mb-4 text-center">
              {authError}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-bold py-3 rounded-xl transition-all cursor-pointer"
          >
            {loading ? "Ověřuji..." : "Přihlásit"}
          </button>
        </form>
      </div>
    );
  }

  // ── Authenticated admin ──
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Red banner when tips are stopped */}
      {!tipsOpen && (
        <div className="bg-red-600 text-white text-center py-3 px-4 font-bold text-lg">
          &#9888; Tipování je zastaveno
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">
              &#9917; Admin &ndash; Grand Prix Šitbořice
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={loadTips}
              disabled={loading}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            >
              &#8635; Načíst tipy
            </button>
            {tipsOpen ? (
              <button
                type="button"
                onClick={handleToggleTips}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
              >
                &#9632; Zastavit tipování
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleTips}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer"
              >
                &#9654; Pokračovat v tipování
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || tips.length === 0}
              className="bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            >
              Obnovit kolo
            </button>
          </div>
        </div>
      </div>

      {/* Admin error */}
      {adminError && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-800 text-center py-2 px-4 text-sm font-medium">
          {adminError}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex gap-1 px-4 sm:px-6 overflow-x-auto">
          {(
            [
              {
                id: "current" as Tab,
                label: `Aktuální tipy (${tips.length})`,
                onClick: () => {
                  setActiveTab("current");
                  loadTips();
                },
              },
              {
                id: "evaluate" as Tab,
                label: "Vyhodnocení",
                onClick: () => setActiveTab("evaluate"),
              },
              {
                id: "history" as Tab,
                label: "Historie",
                onClick: () => handleLoadHistory(),
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {loading && (
          <div className="text-center text-gray-500 py-12">Načítám...</div>
        )}

        {/* ── Current Tips ── */}
        {activeTab === "current" && !loading && (
          <div>
            {tips.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <div className="text-5xl mb-4">&#128237;</div>
                <p className="text-lg">Zatím žádné tipy</p>
                <p className="text-sm mt-1">
                  Čekáme na tipy od diváků...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupByPlayer(tips).map(([playerKey, playerTips]) => (
                  <div
                    key={playerKey}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-green-50 px-4 py-3 border-b border-green-100">
                      <h3 className="font-bold text-green-800">
                        {playerKey}
                      </h3>
                      <p className="text-sm text-green-600">
                        {playerTips.length}{" "}
                        {playerTips.length === 1 ? "tip" : "tipů"}
                      </p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {playerTips.map((tip) => (
                        <div
                          key={tip.id}
                          className="px-4 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900">
                              {tip.viewer_name}
                            </span>
                            <span className="text-gray-300">&rarr;</span>
                            <span className="text-amber-600 font-bold">
                              {tip.guessed_speed} km/h
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums">
                            {formatTime(tip.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Evaluate ── */}
        {activeTab === "evaluate" && !loading && (
          <div className="space-y-6">
            {tips.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <p className="text-lg">Nejsou žádné tipy k vyhodnocení</p>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleEvaluate}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Zadejte skutečné výsledky
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vítěz turnaje
                      </label>
                      <select
                        value={evalWinner}
                        onChange={(e) => setEvalWinner(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Vyberte vítěze...</option>
                        {players.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.club} &ndash; {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nejvyšší rychlost střely
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={evalSpeed}
                          onChange={(e) => setEvalSpeed(e.target.value)}
                          placeholder="např. 70"
                          min="1"
                          max="300"
                          className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-16 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                          km/h
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl transition-all cursor-pointer"
                  >
                    Vyhodnotit
                  </button>
                </form>

                {showEvalResults && evalResults.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
                      <h2 className="text-lg font-bold text-amber-800">
                        &#127942; Výsledky tipovačky
                      </h2>
                      <p className="text-sm text-amber-600 mt-1">
                        Vítěz:{" "}
                        <strong>
                          {
                            players.find((p) => p.name === evalWinner)
                              ?.club
                          }{" "}
                          &ndash; {evalWinner}
                        </strong>{" "}
                        | Nejvyšší rychlost:{" "}
                        <strong>{evalSpeed} km/h</strong>
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                            <th className="px-4 py-3 text-left font-semibold">
                              #
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Tipér
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                              Tip &ndash; hráč
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Tip &ndash; rychlost
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Rozdíl
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Čas tipu
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let correctRank = 0;
                            let shownDivider = false;
                            return evalResults.map((result) => {
                              const isCorrect = result.correctWinner;
                              if (isCorrect) correctRank++;
                              const medal =
                                isCorrect && correctRank === 1
                                  ? "\u{1F947}"
                                  : isCorrect && correctRank === 2
                                    ? "\u{1F948}"
                                    : isCorrect && correctRank === 3
                                      ? "\u{1F949}"
                                      : null;
                              const showDivider =
                                !isCorrect && !shownDivider;
                              if (showDivider) shownDivider = true;
                              return (
                                <tr
                                  key={result.id}
                                  className={`border-b border-gray-100 ${
                                    isCorrect && correctRank <= 3
                                      ? correctRank === 1
                                        ? "bg-amber-50 font-bold"
                                        : "bg-amber-50/50"
                                      : ""
                                  } ${showDivider ? "border-t-4 border-t-gray-300" : ""}`}
                                >
                                  <td className="px-4 py-3 text-lg">
                                    {medal ??
                                      (isCorrect
                                        ? `${correctRank}.`
                                        : "\u274C")}
                                  </td>
                                  <td className="px-4 py-3">
                                    {result.viewer_name}
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {result.player_name}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono">
                                    {result.guessed_speed} km/h
                                    <span className="text-gray-400 ml-1">
                                      (&plusmn;{result.speedDiff.toFixed(0)})
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold">
                                    {isCorrect ? (
                                      <span className="text-green-600">
                                        {result.speedDiff === 0
                                          ? "PŘESNĚ!"
                                          : `\u00B1${result.speedDiff.toFixed(0)} km/h`}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">
                                        &mdash;
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right text-xs text-gray-400 tabular-nums">
                                    {formatTime(result.created_at)}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── History ── */}
        {activeTab === "history" && !loading && (
          <div>
            {archivedTips.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <div className="text-5xl mb-4">&#128194;</div>
                <p className="text-lg">Zatím žádná historie</p>
                <p className="text-sm mt-1">
                  Archivované tipy se zobrazí zde
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  archivedTips.reduce<Record<string, Tip[]>>(
                    (groups, tip) => {
                      const key = tip.archived_at
                        ? formatTime(tip.archived_at)
                        : "Neznámé datum";
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(tip);
                      return groups;
                    },
                    {}
                  )
                ).map(([date, dateTips]) => (
                  <div
                    key={date}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-bold text-gray-700">
                        &#128197; Archivováno: {date}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {dateTips.length} tipů
                      </p>
                    </div>
                    <div>
                      {groupByPlayer(dateTips).map(
                        ([playerKey, playerTips]) => (
                          <div key={playerKey}>
                            <div className="px-4 py-2 bg-green-50/70 border-b border-gray-100">
                              <span className="text-sm font-semibold text-green-700">
                                {playerKey}
                              </span>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {playerTips.map((tip) => (
                                <div
                                  key={tip.id}
                                  className="px-4 py-2 pl-8 flex items-center justify-between text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-700">
                                      {tip.viewer_name}
                                    </span>
                                    <span className="text-gray-300">
                                      &rarr;
                                    </span>
                                    <span className="text-amber-600 font-medium">
                                      {tip.guessed_speed} km/h
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400 tabular-nums">
                                    {formatTime(tip.created_at)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
