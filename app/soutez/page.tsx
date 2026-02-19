"use client";

import { useState, useEffect } from "react";
import { players } from "@/lib/players";
import { submitTip, checkTipsOpen } from "@/app/actions/tips";
import { translations, type Lang } from "@/lib/translations";

function LangSwitcher({
  lang,
  setLang,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setLang("cs")}
        className={`text-2xl cursor-pointer transition-all rounded-md px-1 py-0.5 ${
          lang === "cs"
            ? "ring-2 ring-amber-400 scale-110"
            : "opacity-50 hover:opacity-80"
        }`}
        title="Čeština"
      >
        🇨🇿
      </button>
      <button
        type="button"
        onClick={() => setLang("de")}
        className={`text-2xl cursor-pointer transition-all rounded-md px-1 py-0.5 ${
          lang === "de"
            ? "ring-2 ring-amber-400 scale-110"
            : "opacity-50 hover:opacity-80"
        }`}
        title="Deutsch"
      >
        🇩🇪
      </button>
    </div>
  );
}

export default function SoutezPage() {
  const [lang, setLang] = useState<Lang>("cs");
  const t = translations[lang];

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [speed, setSpeed] = useState("");
  const [viewerName, setViewerName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [tipsOpen, setTipsOpen] = useState<boolean | null>(null);

  // Check on load + poll every 5s so closing tips is reflected in real time
  useEffect(() => {
    checkTipsOpen().then(setTipsOpen);
    const interval = setInterval(() => {
      checkTipsOpen().then(setTipsOpen);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function validate(): string | null {
    const errors: Record<string, boolean> = {};

    if (!selectedPlayer) errors.player = true;
    if (!speed) errors.speed = true;
    if (!viewerName.trim()) errors.name = true;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return t.errFillAll;
    }

    const speedNum = Number(speed);
    if (isNaN(speedNum) || speedNum <= 0 || speedNum > 300) {
      errors.speed = true;
      setFieldErrors(errors);
      return t.errInvalidSpeed;
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const error = validate();
    if (error) {
      setErrorMessage(error);
      setStatus("error");
      return;
    }

    const player = players.find((p) => p.name === selectedPlayer);
    if (!player) return;

    setStatus("loading");

    // Re-check right before submitting (user might have had page open)
    const stillOpen = await checkTipsOpen();
    if (!stillOpen) {
      setTipsOpen(false);
      setStatus("error");
      setErrorMessage(t.errJustClosed);
      return;
    }

    const result = await submitTip({
      viewerName: viewerName.trim(),
      playerName: player.name,
      playerClub: player.club,
      guessedSpeed: Number(speed),
    });

    if (result.success) {
      setStatus("success");
    } else {
      setStatus("error");
      // Map server error to localized message
      if (result.error === "Tipování je momentálně uzavřeno") {
        setErrorMessage(t.errTipsClosed);
        setTipsOpen(false);
      } else {
        setErrorMessage(result.error || t.errGeneric);
      }
    }
  }

  const inputBase =
    "w-full bg-white/10 border text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition-all";
  const inputOk = "border-white/20";
  const inputErr = "border-red-400 ring-1 ring-red-400/50";

  // Loading state
  if (tipsOpen === null) {
    return (
      <div className="min-h-dvh bg-[#1253CC] flex items-center justify-center p-4">
        <div className="text-white text-lg">{t.loading}</div>
      </div>
    );
  }

  // Tips closed
  if (tipsOpen === false) {
    return (
      <div className="min-h-dvh bg-[#1253CC] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="flex justify-center mb-4">
            <LangSwitcher lang={lang} setLang={setLang} />
          </div>
          <div className="text-7xl mb-4">&#9917;</div>
          <h1 className="text-2xl font-extrabold text-white mb-2">
            {t.title}
          </h1>
          <p className="text-blue-100 mb-4">{t.subtitle}</p>
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 mb-4">
            <p className="text-red-200 font-semibold text-lg">
              {t.tipsClosed}
            </p>
            <p className="text-red-200/70 text-sm mt-1">
              {t.tipsClosedSub}
            </p>
          </div>
          <button
            onClick={async () => {
              const open = await checkTipsOpen();
              setTipsOpen(open);
            }}
            className="text-blue-200 text-sm underline cursor-pointer hover:text-white transition-colors"
          >
            {t.checkAgain}
          </button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-dvh bg-[#1253CC] flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="flex justify-center mb-4">
            <LangSwitcher lang={lang} setLang={setLang} />
          </div>
          <div className="text-7xl mb-4">&#9917;</div>
          <h2 className="text-2xl font-bold text-white mb-2">{t.tipSent}</h2>
          <p className="text-blue-100">{t.tipSentSub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#1253CC] flex items-center justify-center px-4 py-8">
      <div className="max-w-sm w-full">
        {/* Language switcher */}
        <div className="flex justify-center mb-4">
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">&#9917;</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.title}
          </h1>
          <p className="text-blue-100 mt-1 text-base font-medium">
            {t.subtitle}
          </p>
          <p className="text-blue-100/80 text-sm mt-3 max-w-xs mx-auto leading-relaxed">
            {t.description}
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white/10 backdrop-blur-lg border border-white/15 rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          {/* Player select */}
          <div>
            <label className="block text-blue-100 text-sm font-semibold mb-1.5">
              {t.labelPlayer}
            </label>
            <select
              value={selectedPlayer}
              onChange={(e) => {
                setSelectedPlayer(e.target.value);
                if (e.target.value) setFieldErrors((p) => ({ ...p, player: false }));
              }}
              className={`${inputBase} ${fieldErrors.player ? inputErr : inputOk} appearance-none cursor-pointer`}
            >
              <option value="">{t.playerPlaceholder}</option>
              {players.map((player) => (
                <option key={player.name} value={player.name}>
                  {player.club} &ndash; {player.name}
                </option>
              ))}
            </select>
          </div>

          {/* Speed input */}
          <div>
            <label className="block text-blue-100 text-sm font-semibold mb-1.5">
              {t.labelSpeed}
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={speed}
                onChange={(e) => {
                  setSpeed(e.target.value);
                  if (e.target.value) setFieldErrors((p) => ({ ...p, speed: false }));
                }}
                placeholder=""
                min="1"
                max="300"
                step="1"
                className={`${inputBase} pr-16 ${fieldErrors.speed ? inputErr : inputOk} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-200 font-semibold">
                km/h
              </span>
            </div>
          </div>

          {/* Viewer name */}
          <div>
            <label className="block text-blue-100 text-sm font-semibold mb-1.5">
              {t.labelName}
            </label>
            <input
              type="text"
              value={viewerName}
              onChange={(e) => {
                setViewerName(e.target.value);
                if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, name: false }));
              }}
              placeholder={t.namePlaceholder}
              maxLength={100}
              autoComplete="name"
              className={`${inputBase} ${fieldErrors.name ? inputErr : inputOk}`}
            />
          </div>

          {/* Error message */}
          {status === "error" && errorMessage && (
            <div className="bg-red-500/20 border border-red-400/40 rounded-xl p-3 text-red-200 text-sm text-center">
              {errorMessage}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:bg-amber-400/50 disabled:cursor-not-allowed text-black font-bold py-3.5 px-6 rounded-xl transition-all text-lg cursor-pointer"
          >
            {status === "loading" ? t.submitting : t.submit}
          </button>
        </form>

        <p className="text-center text-blue-300/50 text-xs mt-6">
          {t.footer} &copy; 2025
        </p>
      </div>
    </div>
  );
}
