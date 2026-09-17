import React, { useState } from 'react';
import type { DateFilterSelection } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Layers, Clock } from 'lucide-react';

interface Props {
  selection: DateFilterSelection;
  onChange: (newSelection: DateFilterSelection) => void;
  title?: string;
  defaultExpanded?: boolean;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const DateRangeCalendarPicker: React.FC<Props> = ({
  selection,
  onChange,
  title = 'Filter Waktu & Kalender',
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // Initialize active viewing month and year from selection.startDate
  const initialDate = new Date(selection.startDate || '2026-09-17');
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear() || 2026);
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth() || 8); // 0-indexed (8 = September)

  // In range picking mode, track whether user is clicking the first (start) date or second (end) date
  const [pickingStage, setPickingStage] = useState<'start' | 'end'>('start');

  const formatDisplayDate = (dStr: string): string => {
    if (!dStr) return '-';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    const day = parseInt(parts[2], 10);
    const month = MONTH_NAMES[parseInt(parts[1], 10) - 1];
    const year = parts[0];
    return `${day} ${month} ${year}`;
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleModeToggle = (newMode: 'single' | 'range') => {
    if (newMode === 'single') {
      onChange({
        mode: 'single',
        startDate: selection.startDate,
        endDate: selection.startDate,
      });
    } else {
      onChange({
        mode: 'range',
        startDate: selection.startDate,
        endDate: selection.endDate || selection.startDate,
      });
      setPickingStage('start');
    }
  };

  const handleDayClick = (dateStr: string) => {
    if (selection.mode === 'single') {
      onChange({
        mode: 'single',
        startDate: dateStr,
        endDate: dateStr,
      });
    } else {
      // Range mode
      if (pickingStage === 'start') {
        onChange({
          mode: 'range',
          startDate: dateStr,
          endDate: dateStr,
        });
        setPickingStage('end');
      } else {
        // picking end date
        if (dateStr < selection.startDate) {
          // If clicked date is before start date, swap them
          onChange({
            mode: 'range',
            startDate: dateStr,
            endDate: selection.startDate,
          });
        } else {
          onChange({
            mode: 'range',
            startDate: selection.startDate,
            endDate: dateStr,
          });
        }
        setPickingStage('start');
      }
    }
  };

  const handlePreset = (preset: 'today' | 'yesterday' | 'tomorrow' | 'month' | 'all') => {
    if (preset === 'today') {
      onChange({ mode: 'single', startDate: '2026-09-17', endDate: '2026-09-17' });
      setViewYear(2026);
      setViewMonth(8);
    } else if (preset === 'yesterday') {
      onChange({ mode: 'single', startDate: '2026-09-16', endDate: '2026-09-16' });
      setViewYear(2026);
      setViewMonth(8);
    } else if (preset === 'tomorrow') {
      onChange({ mode: 'single', startDate: '2026-09-18', endDate: '2026-09-18' });
      setViewYear(2026);
      setViewMonth(8);
    } else if (preset === 'month') {
      onChange({ mode: 'range', startDate: '2026-09-01', endDate: '2026-09-30' });
      setViewYear(2026);
      setViewMonth(8);
    } else if (preset === 'all') {
      onChange({ mode: 'range', startDate: '2026-01-01', endDate: '2026-12-31' });
    }
  };

  // Build calendar matrix for viewYear & viewMonth
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarCells.push({
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const m = viewMonth + 1;
    calendarCells.push({
      dateStr: `${viewYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill out complete grid of 35 or 42 cells
  const remaining = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 1 : viewMonth + 2;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarCells.push({
      dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  const todayStr = '2026-09-17';

  return (
    <div className="calendar-picker-card">
      {/* 1. Header Bar with current selection preview & Toggle */}
      <div className="calendar-summary-bar" onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <CalendarIcon size={16} />
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
              {title} • {selection.mode === 'single' ? 'Satu Tanggal' : 'Rentang Periode'}
            </div>
            <div className="calendar-active-range-text">
              {selection.mode === 'single' ? (
                <span>{formatDisplayDate(selection.startDate)}</span>
              ) : (
                <span>
                  {formatDisplayDate(selection.startDate)} — {formatDisplayDate(selection.endDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
            {isExpanded ? 'Tutup Kalender' : 'Pilih Tanggal'}
          </span>
          {isExpanded ? <ChevronUp size={16} color="var(--color-primary)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {/* 2. Collapsible Calendar Body */}
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
          {/* Mode Switch: Satu Tanggal vs Rentang Tanggal */}
          <div className="calendar-mode-switch">
            <button
              type="button"
              className={`calendar-mode-btn ${selection.mode === 'single' ? 'active' : ''}`}
              onClick={() => handleModeToggle('single')}
            >
              <Clock size={13} />
              <span>Satu Tanggal Saja</span>
            </button>
            <button
              type="button"
              className={`calendar-mode-btn ${selection.mode === 'range' ? 'active' : ''}`}
              onClick={() => handleModeToggle('range')}
            >
              <Layers size={13} />
              <span>Rentang Mulai & Akhir</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="calendar-presets-container">
            <button
              type="button"
              className="role-pill"
              onClick={() => handlePreset('today')}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Hari Ini (17 Sep)
            </button>
            <button
              type="button"
              className="role-pill"
              onClick={() => handlePreset('yesterday')}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Kemarin (16 Sep)
            </button>
            <button
              type="button"
              className="role-pill"
              onClick={() => handlePreset('tomorrow')}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Besok (18 Sep)
            </button>
            <button
              type="button"
              className="role-pill"
              onClick={() => handlePreset('month')}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Bulan Ini (Sep 2026)
            </button>
            <button
              type="button"
              className="role-pill"
              onClick={() => handlePreset('all')}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Semua Waktu
            </button>
          </div>

          {/* Month & Year Navigation Controls */}
          <div className="calendar-nav-bar">
            <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth} title="Bulan sebelumnya">
              <ChevronLeft size={16} />
            </button>

            <div className="calendar-selects-group">
              {/* Month selector */}
              <select
                className="form-select"
                style={{ padding: '5px 10px', fontSize: '12px', fontWeight: 700 }}
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year selector */}
              <select
                className="form-select"
                style={{ padding: '5px 10px', fontSize: '12px', fontWeight: 700 }}
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button type="button" className="calendar-nav-btn" onClick={handleNextMonth} title="Bulan berikutnya">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar Day Grid */}
          <div className="calendar-grid">
            {WEEKDAYS.map((day) => (
              <div key={day} className="calendar-weekday">
                {day}
              </div>
            ))}

            {calendarCells.map((cell) => {
              const isToday = cell.dateStr === todayStr;
              let isSelected = false;
              let isStart = false;
              let isEnd = false;
              let isInRange = false;

              if (selection.mode === 'single') {
                isSelected = cell.dateStr === selection.startDate;
              } else {
                isStart = cell.dateStr === selection.startDate;
                isEnd = cell.dateStr === selection.endDate;
                isInRange =
                  Boolean(selection.startDate && selection.endDate &&
                  cell.dateStr > selection.startDate &&
                  cell.dateStr < selection.endDate);
              }

              let dayClass = 'calendar-day-btn';
              if (!cell.isCurrentMonth) dayClass += ' outside-month';
              if (isToday) dayClass += ' today-indicator';
              if (isSelected) dayClass += ' selected-single';
              if (isStart) dayClass += ' selected-start';
              if (isEnd) dayClass += ' selected-end';
              if (isInRange) dayClass += ' in-range';

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  className={dayClass}
                  onClick={() => handleDayClick(cell.dateStr)}
                  disabled={!cell.isCurrentMonth}
                >
                  {cell.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Footer instruction text */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '4px' }}>
            <span>
              {selection.mode === 'single'
                ? 'Klik salah satu tanggal untuk memfilter.'
                : pickingStage === 'start'
                ? 'Pilih tanggal mulai (Start Date).'
                : 'Pilih tanggal akhir (End Date).'}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setIsExpanded(false)}
              style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
            >
              <Check size={12} />
              <span>Terapkan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
