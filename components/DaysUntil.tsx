'use client';

import { useState, useEffect, useRef } from 'react';

export default function DaysUntil() {
    type Event = {
        id: number;
        name: string;
        date: string;
        excludeWeekends: boolean;
        selectedHoliday?: string;
    };
    type Countdown = {
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    };
    // Array of events
    const [events, setEvents] = useState<Event[]>([]);
    // Per-event states
    const [results, setResults] = useState<Record<number, string>>({});
    const [daysMap, setDaysMap] = useState<Record<number, number | null>>({});
    const [isCalculating, setIsCalculating] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [holidays, setHolidays] = useState<Record<string, string>>({});
    // Per-event: countdown, progress, selectedHoliday
    const [countdowns, setCountdowns] = useState<Record<number, Countdown | null>>({});
    const [progresses, setProgresses] = useState<Record<number, number>>({});
    const [selectedHolidays, setSelectedHolidays] = useState<Record<number, string>>({});
    // Per-event countdown intervals
    const countdownIntervals = useRef<Record<number, NodeJS.Timeout | null>>({});
    const confettiTimeouts = useRef<Record<number, NodeJS.Timeout | null>>({});

    // Load from localStorage and URL params on mount
    useEffect(() => {
        // Try to load events from localStorage
        let loadedEvents: Event[] = [];
        const storedEvents = localStorage.getItem('events');
        const storedDarkMode = localStorage.getItem('darkMode') === 'true';
        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        const urlEvents = params.get('events');
        if (urlEvents) {
            // Events array encoded as JSON in URL param
            try {
                loadedEvents = JSON.parse(decodeURIComponent(urlEvents));
            } catch {}
        } else if (storedEvents) {
            try {
                loadedEvents = JSON.parse(storedEvents);
            } catch {}
        } else {
            // Fallback: try to load old single event params
            const urlEvent = params.get('event');
            const urlDate = params.get('date');
            const urlExcludeWeekends = params.get('excludeWeekends');
            const storedEventName = localStorage.getItem('eventName') || '';
            const storedDate = localStorage.getItem('targetDate') || '';
            const storedExcludeWeekends = localStorage.getItem('excludeWeekends') === 'true';
            loadedEvents = [{
                id: Date.now(),
                name: urlEvent !== null ? urlEvent : storedEventName,
                date: urlDate !== null ? urlDate : storedDate,
                excludeWeekends: urlExcludeWeekends !== null ? urlExcludeWeekends === 'true' : storedExcludeWeekends,
            }];
        }
        // Ensure every event has a name field that is a string (empty if falsy)
        loadedEvents = loadedEvents.map(ev => ({ ...ev, name: ev.name || '' }));
        // If no events, create an empty one
        if (!loadedEvents || loadedEvents.length === 0) {
            loadedEvents = [{
                id: Date.now(),
                name: '',
                date: '',
                excludeWeekends: false,
            }];
        }
        setEvents(loadedEvents);
        setDarkMode(storedDarkMode);
    }, []);

    // Save events to localStorage
    useEffect(() => {
        localStorage.setItem('events', JSON.stringify(events));
    }, [events]);

    useEffect(() => {
        localStorage.setItem('darkMode', darkMode.toString());
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [darkMode]);

    // Initialize holidays on mount
    useEffect(() => {
        const now = new Date();
        const year = now.getFullYear();
        const map: Record<string, string> = {};

        // Fixed-date holidays, ensure month is 0-based (Jan=0)
        const fixed = [
            { name: "🎆 New Year's Day", month: 0, day: 1 },
            { name: "💖 Valentine's Day", month: 1, day: 14 },
            { name: "🎇 Independence Day", month: 6, day: 4 },
            { name: "🎃 Halloween", month: 9, day: 31 },
            { name: "🎄 Christmas", month: 11, day: 25 },
            { name: "🖤 Juneteenth", month: 5, day: 19 },
            { name: "🎖️ Veterans Day", month: 10, day: 11 },
            { name: "🎉 New Year's Eve", month: 11, day: 31 },
        ];

        fixed.forEach(({ name, month, day }) => {
            // Always use now at execution time
            const now = new Date();
            const year = now.getFullYear();
            let d = new Date(year, month, day);
            if (d.getTime() < now.getTime()) d.setFullYear(year + 1);
            // Format as YYYY-MM-DD
            const year_str = d.getFullYear();
            const month_str = String(d.getMonth() + 1).padStart(2, '0');
            const day_str = String(d.getDate()).padStart(2, '0');
            map[name] = `${year_str}-${month_str}-${day_str}`;
        });

        // Dynamic holidays: always compute using now at execution time
        // Easter
        {
            const now = new Date();
            let easter = getEaster(now.getFullYear());
            if (easter.getTime() < now.getTime()) easter = getEaster(now.getFullYear() + 1);
            map['🐣 Easter'] = easter.toISOString().split('T')[0];
        }
        // Thanksgiving (4th Thursday in November)
        {
            const now = new Date();
            let thanksgiving = getNthWeekdayOfMonth(now.getFullYear(), 10, 4, 4);
            if (thanksgiving.getTime() < now.getTime()) thanksgiving = getNthWeekdayOfMonth(now.getFullYear() + 1, 10, 4, 4);
            map['🦃 Thanksgiving'] = thanksgiving.toISOString().split('T')[0];
        }
        // Memorial Day (last Monday in May)
        {
            const now = new Date();
            let memorial = getLastWeekdayOfMonth(now.getFullYear(), 4, 1);
            if (memorial.getTime() < now.getTime()) memorial = getLastWeekdayOfMonth(now.getFullYear() + 1, 4, 1);
            map['🪖 Memorial Day'] = memorial.toISOString().split('T')[0];
        }
        // Labor Day (first Monday in September)
        {
            const now = new Date();
            let labor = getNthWeekdayOfMonth(now.getFullYear(), 8, 1, 1);
            if (labor.getTime() < now.getTime()) labor = getNthWeekdayOfMonth(now.getFullYear() + 1, 8, 1, 1);
            map['⚙️ Labor Day'] = labor.toISOString().split('T')[0];
        }

        setHolidays(map);
    }, []);

    // Clear all intervals on unmount
    useEffect(() => {
        return () => {
            Object.values(countdownIntervals.current).forEach((interval) => {
                if (interval) clearInterval(interval);
            });
            Object.values(confettiTimeouts.current).forEach((timeout) => {
                if (timeout) clearTimeout(timeout);
            });
        };
    }, []);

    // Calculate days and start live countdown for all events
    function calculateDays() {
        setIsCalculating(true);
        setTimeout(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const newResults: Record<number, string> = {};
            const newDaysMap: Record<number, number | null> = {};
            const newCountdowns: Record<number, Countdown | null> = {};
            const newProgresses: Record<number, number> = {};
            events.forEach((event) => {
                // Accept: (1) date set, and (2) either name is filled OR a holiday is selected for this event
                const selectedHoliday = selectedHolidays[event.id];
                if (
                    !event.date ||
                    (
                        !event.name.trim() &&
                        (!selectedHoliday || selectedHoliday === '')
                    )
                ) {
                    newResults[event.id] = 'Please enter an event name or select a holiday, and select a date first.';
                    newDaysMap[event.id] = null;
                    newCountdowns[event.id] = null;
                    newProgresses[event.id] = 0;
                    // Clear interval if running
                    if (countdownIntervals.current[event.id]) clearInterval(countdownIntervals.current[event.id]!);
                    return;
                }
                // Parse date
                const [year, month, day] = event.date.split('-').map(Number);
                let target = new Date(year, month - 1, day);
                target.setHours(0, 0, 0, 0);
                // Only advance to next year if date has completely passed
                if (target < today) {
                    target.setFullYear(target.getFullYear() + 1);
                }
                let calculatedDays = 0;
                if (event.excludeWeekends) {
                    let temp = new Date(today);
                    while (temp < target) {
                        temp.setDate(temp.getDate() + 1);
                        const d = temp.getDay();
                        if (d !== 0 && d !== 6) calculatedDays++;
                    }
                } else {
                    const diff = target.getTime() - today.getTime();
                    calculatedDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
                }
                newDaysMap[event.id] = calculatedDays;
                newResults[event.id] = `until ${target.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
                // Setup live countdown
                if (countdownIntervals.current[event.id]) clearInterval(countdownIntervals.current[event.id]!);
                // Capture values for closure
                const startDate = new Date(today);
                const totalDays = calculatedDays;
                function updateCountdownLocal() {
                    const now = new Date();
                    const diffMs = target.getTime() - now.getTime();
                    if (diffMs <= 0) {
                        setCountdowns(prev => ({ ...prev, [event.id]: { days: 0, hours: 0, minutes: 0, seconds: 0 } }));
                        setProgresses(prev => ({ ...prev, [event.id]: 100 }));
                        triggerConfetti(event.id);
                        if (countdownIntervals.current[event.id]) {
                            clearInterval(countdownIntervals.current[event.id]!);
                            countdownIntervals.current[event.id] = null;
                        }
                        return;
                    }
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
                    const diffSeconds = Math.floor((diffMs / 1000) % 60);
                    setCountdowns(prev => ({
                        ...prev,
                        [event.id]: {
                            days: diffDays,
                            hours: diffHours,
                            minutes: diffMinutes,
                            seconds: diffSeconds,
                        }
                    }));
                    // Calculate progress: how far through the countdown we are
                    const totalMs = target.getTime() - startDate.getTime();
                    const elapsedMs = now.getTime() - startDate.getTime();
                    let progressPercent = (elapsedMs / totalMs) * 100;
                    if (progressPercent < 0) progressPercent = 0;
                    if (progressPercent > 100) progressPercent = 100;
                    setProgresses(prev => ({ ...prev, [event.id]: progressPercent }));
                }
                updateCountdownLocal();
                countdownIntervals.current[event.id] = setInterval(updateCountdownLocal, 1000);
            });
            setResults(newResults);
            setDaysMap(newDaysMap);
            setIsCalculating(false);
        }, 400);
    }

    // Confetti effect using canvas-confetti via CDN
    function triggerConfetti(eventId: number) {
        if (typeof window === 'undefined') return;
        // Load confetti script if not loaded
        if (!(window as any).confetti) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
            script.async = true;
            script.onload = () => {
                runConfetti(eventId);
            };
            document.body.appendChild(script);
        } else {
            runConfetti(eventId);
        }
    }
    function runConfetti(eventId: number) {
        const confetti = (window as any).confetti;
        if (!confetti) return;
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
        });
        // Stop confetti after 5 seconds
        if (confettiTimeouts.current[eventId]) clearTimeout(confettiTimeouts.current[eventId]!);
        confettiTimeouts.current[eventId] = setTimeout(() => {
            // No explicit stop needed, confetti runs once
        }, 5000);
    }

    // Share a single countdown event
    function shareSingleCountdown(event: Event) {
        if (!event.date) return;
        const url = new URL(window.location.href);
        url.search = '';
        const eventName = event.name.trim().replace(/\s+/g, '+');
        url.searchParams.set('event', eventName);
        url.searchParams.set('date', event.date);
        url.searchParams.set('excludeWeekends', event.excludeWeekends.toString());
        navigator.clipboard.writeText(url.toString())
            .then(() => alert(`Link for ${event.name || 'your event'} copied to clipboard!`))
            .catch(() => alert('Failed to copy link.'));
    }

    function getEaster(year: number) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    }

    function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number) {
        const date = new Date(year, month, 1);
        let count = 0;
        while (true) {
            if (date.getDay() === weekday) count++;
            if (count === n) return date;
            date.setDate(date.getDate() + 1);
        }
    }

    function getLastWeekdayOfMonth(year: number, month: number, weekday: number) {
        const date = new Date(year, month + 1, 0);
        while (date.getDay() !== weekday) date.setDate(date.getDate() - 1);
        return date;
    }

    // Add new event
    function addEvent() {
        setEvents(prev => [
            ...prev,
            {
                id: Date.now() + Math.floor(Math.random() * 100000),
                name: '',
                date: '',
                excludeWeekends: false,
            }
        ]);
    }
    // Remove event by id
    function removeEvent(id: number) {
        setEvents(prev => prev.filter(e => e.id !== id));
        setResults(prev => {
            const n = { ...prev };
            delete n[id];
            return n;
        });
        setDaysMap(prev => {
            const n = { ...prev };
            delete n[id];
            return n;
        });
        setCountdowns(prev => {
            const n = { ...prev };
            delete n[id];
            return n;
        });
        setProgresses(prev => {
            const n = { ...prev };
            delete n[id];
            return n;
        });
        setSelectedHolidays(prev => {
            const n = { ...prev };
            delete n[id];
            return n;
        });
        // Clear interval/confetti
        if (countdownIntervals.current[id]) {
            clearInterval(countdownIntervals.current[id]!);
            countdownIntervals.current[id] = null;
        }
        if (confettiTimeouts.current[id]) {
            clearTimeout(confettiTimeouts.current[id]!);
            confettiTimeouts.current[id] = null;
        }
    }

    // Automatically recalculate countdown when events or selected holidays change
    useEffect(() => {
        if (events.length > 0) {
            calculateDays();
        }
    }, [events, selectedHolidays]);

    return (
        <div className={`relative flex flex-col items-center justify-center min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900'} overflow-hidden`}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="relative z-10 w-[95%] max-w-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4">
                        <span className="text-xl">✨</span>
                        <span className="text-blue-300 text-sm font-medium">Event Countdown</span>
                    </div>
                    <h1 className={`text-5xl md:text-6xl font-bold ${darkMode ? 'bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400' : 'bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400'} bg-clip-text text-transparent mb-3`}>
                        Days Until
                    </h1>
                    <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-400'}`}>
                        Track the countdown to your most important moments
                    </p>
                </div>

                <div className={`${darkMode ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-900/50 border-slate-800/50'} backdrop-blur-xl border rounded-3xl p-8 shadow-2xl`}>
                    {/* Multiple events input groups */}
                    {events.map((event, idx) => (
                        <div key={event.id} className={`mb-12 pb-6 border-b border-slate-700/30 last:border-b-0 last:mb-0 last:pb-0`}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <span className="text-lg">📝</span>
                                    Event Name
                                </label>
                                {events.length > 1 && (
                                    <button
                                        aria-label="Remove Event"
                                        onClick={() => removeEvent(event.id)}
                                        className="ml-2 px-2 py-1 rounded hover:bg-red-500/20 text-red-400 transition-all"
                                    >
                                        🗑️ Remove
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={event.name}
                                onChange={e => {
                                    setEvents(prev =>
                                        prev.map(ev => ev.id === event.id ? { ...ev, name: e.target.value } : ev)
                                    );
                                    setDaysMap(prev => ({ ...prev, [event.id]: null }));
                                    setCountdowns(prev => ({ ...prev, [event.id]: null }));
                                    setResults(prev => ({ ...prev, [event.id]: '' }));
                                    setSelectedHolidays(prev => ({ ...prev, [event.id]: '' }));
                                }}
                                placeholder="Enter your event name"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all mb-6"
                            />
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <span className="text-lg">📅</span>
                                Select Date
                            </label>
                            <input
                                type="date"
                                value={event.date}
                                onChange={e => {
                                    setEvents(prev =>
                                        prev.map(ev => ev.id === event.id ? { ...ev, date: e.target.value } : ev)
                                    );
                                    setSelectedHolidays(prev => ({ ...prev, [event.id]: '' }));
                                    setDaysMap(prev => ({ ...prev, [event.id]: null }));
                                    setCountdowns(prev => ({ ...prev, [event.id]: null }));
                                    setResults(prev => ({ ...prev, [event.id]: '' }));
                                }}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all mb-6"
                            />
                            <label className="block text-sm font-medium text-slate-300 mb-3">Popular Holidays</label>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {Object.entries(holidays).map(([name, date]) => (
                                    <button
                                        key={name}
                                        onClick={() => {
                                            // Remove emoji(s) from the holiday name for the event name
                                            const holidayNameNoEmoji = name.replace(/^[^\p{L}\p{N}]+/u, '').trim();
                                            setEvents(prev =>
                                                prev.map(ev => ev.id === event.id ? { ...ev, date, name: holidayNameNoEmoji } : ev)
                                            );
                                            setSelectedHolidays(prev => ({ ...prev, [event.id]: name }));
                                            setDaysMap(prev => ({ ...prev, [event.id]: null }));
                                            setCountdowns(prev => ({ ...prev, [event.id]: null }));
                                            setResults(prev => ({ ...prev, [event.id]: '' }));
                                            // No setTimeout/calculateDays here; handled by effect
                                        }}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                                            (selectedHolidays[event.id] === name)
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                                : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-blue-500/50 hover:bg-slate-800 hover:scale-105'
                                        }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 mb-6 p-4 rounded-xl border border-slate-700/50" style={{ backgroundColor: darkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(71, 85, 105, 0.15)' }}>
                                <input
                                    type="checkbox"
                                    id={`weekends-${event.id}`}
                                    checked={event.excludeWeekends}
                                    onChange={() => setEvents(prev =>
                                        prev.map(ev => ev.id === event.id ? { ...ev, excludeWeekends: !ev.excludeWeekends } : ev)
                                    )}
                                    className="w-5 h-5 accent-blue-500 cursor-pointer"
                                />
                                <label htmlFor={`weekends-${event.id}`} className="text-slate-300 text-sm cursor-pointer select-none flex items-center gap-2">
                                    <span className="text-base">⏰</span>
                                    Exclude weekends from count
                                </label>
                            </div>
                            {/* Countdown result for this event */}
                            {daysMap[event.id] !== null && (
                                <div className="mt-8 text-center">
                                    <div className={`bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 border rounded-2xl p-8 backdrop-blur-sm ${darkMode ? 'border-blue-400/40' : 'border-blue-500/20'}`}>
                                        <div className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                                            {countdowns[event.id]
                                                ? `${countdowns[event.id]!.days}d ${String(countdowns[event.id]!.hours).padStart(2, '0')}h ${String(countdowns[event.id]!.minutes).padStart(2, '0')}m ${String(countdowns[event.id]!.seconds).padStart(2, '0')}s`
                                                : daysMap[event.id]}
                                        </div>
                                        <div className="text-2xl md:text-3xl font-semibold text-slate-300 mb-2">
                                            {countdowns[event.id] ? 'Remaining' : daysMap[event.id] === 1 ? 'Day' : 'Days'}
                                        </div>
                                        <div className="text-slate-400 text-sm md:text-base mb-4">
                                            {results[event.id] ? `${event.name} ${results[event.id]}` : ''}
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                                            <div
                                                className="h-4 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 transition-all duration-500"
                                                style={{ width: `${progresses[event.id] ?? 0}%` }}
                                            ></div>
                                        </div>
                                        {/* Per-event Share button */}
                                        <button
                                            onClick={() => shareSingleCountdown(event)}
                                            disabled={!event.date}
                                            className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white font-semibold text-sm shadow-md transition-all"
                                        >
                                            🔗 Share This Countdown
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Validation error message */}
                            {results[event.id] && daysMap[event.id] === null && (
                                <div className="text-red-400 mt-4 text-sm">{results[event.id]}</div>
                            )}
                        </div>
                    ))}
                    {/* Add event button */}
                    <div className="flex justify-between items-center mb-6 mt-4">
                        <button
                            onClick={addEvent}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:from-emerald-600 hover:to-blue-600 font-semibold shadow-md transition-all"
                        >
                            ➕ Add Event
                        </button>
                        <div className="flex gap-3">
                            <button
                                onClick={calculateDays}
                                disabled={isCalculating || events.length === 0 || events.every(ev => !ev.name.trim() || !ev.date)}
                                className={`px-6 py-2 ${isCalculating || events.length === 0 || events.every(ev => !ev.name.trim() || !ev.date) ? 'opacity-50 cursor-not-allowed' : ''} bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 hover:from-blue-600 hover:via-purple-600 hover:to-emerald-600 text-white font-bold rounded-xl text-lg shadow-2xl shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/50 relative overflow-hidden group`}
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {isCalculating ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Calculating...
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-xl">✨</span>
                                            Calculate
                                        </>
                                    )}
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-center mt-8 gap-6 items-center text-sm text-slate-400">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={darkMode}
                                onChange={() => setDarkMode(!darkMode)}
                                className="w-5 h-5 accent-blue-500 cursor-pointer"
                            />
                            Dark Mode
                        </label>
                    </div>
                </div>

                <div className={`text-center mt-8 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <p>© {new Date().getFullYear()} Days Until Date • Questions or feedback? <a href="mailto:berlity@gmail.com" className="text-blue-400 hover:underline">Email me</a></p>
                </div>
            </div>
        </div>
    );
}