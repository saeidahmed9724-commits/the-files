import React from 'react';
import { BatteryCharging, BatteryLow, BatteryWarning } from 'lucide-react';
import { EnergyImpact } from '../types/dossier';

export const ENERGY_UI: Record<EnergyImpact, { label: string; short: string; icon: any; on: string; badge: string }> = {
  positive: {
    label: 'موقف إيجابي (شحنني)',
    short: 'إيجابي',
    icon: BatteryCharging,
    on: 'bg-emerald-700 text-white border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  },
  negative: {
    label: 'موقف سلبي',
    short: 'سلبي',
    icon: BatteryLow,
    on: 'bg-orange-600 text-white border-orange-700',
    badge: 'bg-orange-100 text-orange-900 border-orange-400',
  },
  draining: {
    label: 'موقف مستنزف',
    short: 'مستنزف',
    icon: BatteryWarning,
    on: 'bg-[#8c1d18] text-white border-[#6b1511]',
    badge: 'bg-rose-100 text-rose-900 border-rose-400',
  },
};

interface Props {
  value?: EnergyImpact | null;
  onChange: (v: EnergyImpact | undefined) => void;
  compact?: boolean;
}

/** Three-way toggle (+ "not rated"). Clicking the active option clears it. */
export const EnergyPicker: React.FC<Props> = ({ value, onChange, compact }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label="أثر الموقف على طاقتك">
    {(Object.keys(ENERGY_UI) as EnergyImpact[]).map((k) => {
      const ui = ENERGY_UI[k];
      const Icon = ui.icon;
      const active = value === k;
      return (
        <button
          key={k}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(active ? undefined : k)}
          className={`flex items-center gap-1 rounded border font-bold transition ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          } ${active ? ui.on : 'bg-[#faf5eb] text-[#5c4028] border-[#a68660] hover:bg-[#f0e4cd]'}`}
        >
          <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>{compact ? ui.short : ui.label}</span>
        </button>
      );
    })}
  </div>
);
