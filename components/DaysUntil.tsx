'use client';

import { useState, useEffect } from 'react';

export default function DaysUntil() {
    const [targetDate, setTargetDate] = useState('');
    const [result, setResult] = useState('');
    const [excludeWeekends, setExcludeWeekends] = useState(false);
    const [holidays, setHolidays] = useState<Record<string, string>>({});
    const [selectedHoliday, setSelectedHoliday] = useState('');
    const [days, setDays] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        const year = new Date().getFullYear();
        const today = new Date();
        const map: Record<string, string> = {};

        const fixed = [
            { name: "🎆 New Year's Day", month: 0, day: 1 },
            { name: "💖 Valentine's Day", month: 1, day: 14 },
            { name: "🎇 Independence Day", month: 6, day: 4 },
            { name: "🎃 Halloween", month: 9, day: 31 },
            { name: "🎄 Christmas", month: 11, day: 25 },
        ];

        fixed.forEach(({ name, month, day }) => {
            let d = new Date(year, month, day);
            if (d < today) d.setFullYear(year + 1);
            // Format date properly to avoid timezone issues
            const year_str = d.getFullYear();
            const month_str = String(d.getMonth() + 1).padStart(2, '0');
            const day_str = String(d.getDate()).padStart(2, '0');
            map[name] = `${year_str}-${month_str}-${day_str}`;
        });

        const easter = getEaster(year);
        if (easter < today) easter.setFullYear(year + 1);
        map['🐣 Easter'] = easter.toISOString().split('T')[0];

        const thanksgiving = getNthWeekdayOfMonth(year, 10, 4, 4);
        if (thanksgiving < today) thanksgiving.setFullYear(year + 1);
        map['🦃 Thanksgiving'] = thanksgiving.toISOString().split('T')[0];

        const memorial = getLastWeekdayOfMonth(year, 4, 1);
        if (memorial < today) memorial.setFullYear(year + 1);
        map['🪖 Memorial Day'] = memorial.toISOString().split('T')[0];

        const labor = getNthWeekdayOfMonth(year, 8, 1, 1);
        if (labor < today) labor.setFullYear(year + 1);
        map['⚙️ Labor Day'] = labor.toISOString().split('T')[0];

        setHolidays(map);
    }, []);

    function calculateDays() {
        if (!targetDate) {
            setResult('Please select a date first.');
            setDays(null);
            return;
        }

        setIsCalculating(true);

        setTimeout(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Parse the date correctly to avoid timezone issues
            const [year, month, day] = targetDate.split('-').map(Number);
            let target = new Date(year, month - 1, day);
            target.setHours(0, 0, 0, 0);

            // Only advance to next year if date has completely passed
            if (target < today) {
                target.setFullYear(target.getFullYear() + 1);
            }

            let calculatedDays = 0;
            if (excludeWeekends) {
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

            setDays(calculatedDays);
            setResult(`until ${target.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
            setIsCalculating(false);
        }, 400);
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

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 overflow-hidden">
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
                    <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mb-3">
                        Days Until
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Track the countdown to your most important moments
                    </p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 shadow-2xl">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <span className="text-lg">📅</span>
                            Select Date
                        </label>
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => {
                                setTargetDate(e.target.value);
                                setSelectedHoliday('');
                                setDays(null);
                            }}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-3">Popular Holidays</label>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(holidays).map(([name, date]) => (
                                <button
                                    key={name}
                                    onClick={() => {
                                        setTargetDate(date);
                                        setSelectedHoliday(name);
                                        setDays(null);
                                    }}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                                        selectedHoliday === name
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                                            : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-blue-500/50 hover:bg-slate-800 hover:scale-105'
                                    }`}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                        <input
                            type="checkbox"
                            id="weekends"
                            checked={excludeWeekends}
                            onChange={() => setExcludeWeekends(!excludeWeekends)}
                            className="w-5 h-5 accent-blue-500 cursor-pointer"
                        />
                        <label htmlFor="weekends" className="text-slate-300 text-sm cursor-pointer select-none flex items-center gap-2">
                            <span className="text-base">⏰</span>
                            Exclude weekends from count
                        </label>
                    </div>

                    <button
                        onClick={calculateDays}
                        disabled={isCalculating}
                        className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 hover:from-blue-600 hover:via-purple-600 hover:to-emerald-600 text-white font-bold py-4 rounded-xl text-lg shadow-2xl shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
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
                                    Calculate Countdown
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </button>

                    {days !== null && (
                        <div className="mt-8 text-center">
                            <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 border border-blue-500/20 rounded-2xl p-8 backdrop-blur-sm">
                                <div className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                                    {days}
                                </div>
                                <div className="text-2xl md:text-3xl font-semibold text-slate-300 mb-2">
                                    {days === 1 ? 'Day' : 'Days'}
                                </div>
                                <div className="text-slate-400 text-sm md:text-base">
                                    {result}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="text-center mt-8 text-slate-500 text-sm">
                    <p>© {new Date().getFullYear()} Days Until • Make every moment count</p>
                </div>
            </div>
        </div>
    );
}