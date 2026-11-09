import React, { useMemo } from 'react';
import { BatteryCharging, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { PersonDossier } from '../types/dossier';
import { BatteryLevel, BatteryTrend, calculateSocialBattery, ENERGY_VALUE, BATTERY_MIN_RATED } from '../utils/dossierLogic';

const LEVELS: Record<BatteryLevel, { title: string; hint: string; color: string }> = {
  unknown: { title: 'لسه البيانات قليلة', hint: `صنّف ${BATTERY_MIN_RATED} مواقف على الأقل في السجل عشان المقياس يبدأ يشتغل.`, color: '#8c745c' },
  charging: { title: 'القعدة معاه بتشحنك', hint: 'عائد نفسي إيجابي، العلاقة دي بتديك أكتر ما بتاخد.', color: '#2f6b3a' },
  balanced: { title: 'متوازنة', hint: 'لا بتشحنك ولا بتسحب منك بشكل واضح.', color: '#a87f1e' },
  costly: { title: 'بتسحب من طاقتك', hint: 'التكلفة النفسية أعلى من العائد، راقب مدة وموضوعات القعدات.', color: '#b8561e' },
  draining: { title: 'علاقة مرهقة ومستنزفة', hint: 'العائد النفسي سلبي بوضوح بناءً على اللي سجلته.', color: '#8c1d18' },
};

const TREND: Record<BatteryTrend, { text: string; icon: any } | null> = {
  improving: { text: 'بيتحسن في آخر شهر', icon: TrendingUp },
  worsening: { text: 'بيسوء في آخر شهر', icon: TrendingDown },
  stable: { text: 'ثابت تقريبًا', icon: Minus },
  unknown: null,
};

const DOT_COLOR = { positive: '#2f6b3a', negative: '#d9772b', draining: '#8c1d18' } as const;

interface Props {
  dossier: PersonDossier;
  onGoToTimeline?: () => void;
}

export const SocialBatteryMeter: React.FC<Props> = ({ dossier, onGoToTimeline }) => {
  // Recomputed from today's date on every render: the meter moves as entries age.
  const battery = useMemo(() => calculateSocialBattery(dossier.timeline), [dossier.timeline]);
  const lvl = LEVELS[battery.level];
  const trend = TREND[battery.trend];
  const TrendIcon = trend?.icon;

  const filled = battery.lowData ? 0 : Math.max(battery.percent > 0 ? 1 : 0, Math.round(battery.percent / 10));

  const recentDots = useMemo(
    () =>
      (dossier.timeline || [])
        .filter((e) => e.energy && ENERGY_VALUE[e.energy] !== undefined)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-14),
    [dossier.timeline]
  );

  return (
    <div className="mb-6 bg-[#f5ebd6] border-2 border-[#b5956f] p-4 rounded-md">
      <div className="flex justify-between items-center mb-3 pb-1 border-b border-[#cbb184]">
        <div className="flex items-center gap-2">
          <BatteryCharging className="w-4 h-4 text-[#8c1d18]" />
          <span className="font-typewriter font-bold text-xs text-[#4a3422] uppercase tracking-wide">SOCIAL BATTERY & ROI</span>
        </div>
        <span className="text-xs font-bold text-[#8c1d18]">مؤشر الطاقة وتكلفة العلاقة</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Battery graphic */}
        <div className="flex items-center gap-1 shrink-0" dir="ltr" aria-hidden="true">
          <div className="flex gap-1 p-1.5 border-2 border-[#5c4028] rounded-md bg-[#eae0c8]">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-9 rounded-sm transition-colors duration-500"
                style={{ background: i < filled ? lvl.color : '#d6c4a0' }}
              />
            ))}
          </div>
          <div className="w-1.5 h-4 bg-[#5c4028] rounded-r" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
            <span className="text-lg font-bold font-arabic-hand" style={{ color: lvl.color }}>
              {lvl.title}
            </span>
            {!battery.lowData && (
              <span className="font-typewriter text-sm font-bold text-[#3a2617]">{battery.percent}%</span>
            )}
            {trend && TrendIcon && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#5c4028]">
                <TrendIcon className="w-3.5 h-3.5" />
                {trend.text}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6e5033] mt-1 leading-relaxed">{lvl.hint}</p>

          <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-bold">
            <span className="px-2 py-0.5 rounded border bg-emerald-100 text-emerald-900 border-emerald-400">إيجابي: {battery.positive}</span>
            <span className="px-2 py-0.5 rounded border bg-orange-100 text-orange-900 border-orange-400">سلبي: {battery.negative}</span>
            <span className="px-2 py-0.5 rounded border bg-rose-100 text-rose-900 border-rose-400">مستنزف: {battery.draining}</span>
          </div>
        </div>
      </div>

      {recentDots.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-typewriter text-[#7a5f45] shrink-0">آخر المواقف ←</span>
          <div className="flex gap-1 flex-wrap" dir="ltr">
            {recentDots.map((e) => (
              <span
                key={e.id}
                title={`${e.date}: ${e.text.slice(0, 60)}`}
                className="w-3 h-3 rounded-full border border-black/20"
                style={{ background: DOT_COLOR[e.energy!] }}
              />
            ))}
          </div>
        </div>
      )}

      {(battery.stale || battery.unratedCount > 0) && (
        <div className="mt-3 pt-2 border-t border-[#cbb184] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6e5033]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {battery.stale
                ? `آخر موقف مصنّف من ${battery.daysSinceLast} يوم، فالمقياس بيرجع للنص مع الوقت لحد ما تسجل جديد. `
                : ''}
              {battery.unratedCount > 0 ? `${battery.unratedCount} موقف في السجل لسه متصنفش.` : ''}
            </span>
          </div>
          {onGoToTimeline && (
            <button
              type="button"
              onClick={onGoToTimeline}
              className="px-2.5 py-1 bg-[#8c1d18] hover:bg-[#731713] text-[#fbf7ee] font-bold rounded transition"
            >
              افتح السجل
            </button>
          )}
        </div>
      )}
    </div>
  );
};
