import React from 'react';
import { BatteryCharging, BatteryLow, Eye, EyeOff, HelpCircle, ArrowLeft, Info } from 'lucide-react';
import { PersonDossier } from '../../types/dossier';
import { energyByPerson, PersonEnergy, whatOthersKnow } from '../../utils/selfLogic';

interface Props {
  /** Every other file in the archive. */
  others: PersonDossier[];
  onOpenLinked?: (id: string) => void;
}

const STATUS = {
  knows: { label: 'عارف', icon: Eye, cls: 'bg-emerald-100 border-emerald-400 text-emerald-900' },
  unsure: { label: 'مش متأكد', icon: HelpCircle, cls: 'bg-amber-100 border-amber-400 text-amber-900' },
  unknown: { label: 'مش عارف', icon: EyeOff, cls: 'bg-stone-200 border-stone-400 text-stone-800' },
} as const;

export const Page11PeopleAndMe: React.FC<Props> = ({ others, onOpenLinked }) => {
  const people = others.filter((d) => !d.isSelf);
  const energy = energyByPerson(people);
  const know = whatOthersKnow(people);
  const totalKnow = know.counts.knows + know.counts.unsure + know.counts.unknown;

  const PersonRow = ({ p, tone }: { p: PersonEnergy; tone: 'good' | 'bad' }) => (
    <button
      type="button"
      onClick={() => onOpenLinked?.(p.id)}
      className="w-full text-right flex items-center gap-3 bg-[#fcf9f2] border border-[#cbb184] hover:border-[#8c6b45] rounded-lg px-3 py-2 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{p.name}</div>
        <div className="mt-1 h-1.5 rounded bg-[#e6d6b8] overflow-hidden" aria-hidden>
          <div
            className={`h-full ${tone === 'good' ? 'bg-emerald-600' : 'bg-rose-600'}`}
            style={{ width: `${p.battery.percent}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-typewriter text-[#5c4028]">{p.battery.percent}%</span>
      <ArrowLeft className="w-3.5 h-3.5 text-[#8c6b45]" />
    </button>
  );

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      <div className="pb-4 mb-5 border-b-2 border-[#8c6b45]">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">PEOPLE &amp; ME</h1>
          <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">• الناس وأنا</span>
        </div>
        <p className="text-xs text-[#705238] mt-1">
          الصفحة دي بتتجمّع لوحدها من ملفات الناس التانيين: مين بيشحنك، ومين بيستنزفك، وإيه اللي كل واحد عارفه عنك.
        </p>
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-[#8c745c] text-center py-16">مفيش ملفات تانية لسه. أول ما تعمل ملف لحد هتلاقي هنا الصورة الكاملة.</p>
      ) : (
        <div className="space-y-7">
          {/* Energy */}
          <section>
            <h2 className="text-sm font-bold text-[#3d2716] mb-1 border-b border-[#cca779] pb-1">طاقتك مع الناس</h2>
            <p className="text-[11px] text-[#7a5f45] mb-3 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                من الملاحظات اللي قيّمت أثرها عليك في ملف كل شخص (شحنك / ضايقك / استنزفك). لازم 3 ملاحظات مقيّمة على الأقل لكل شخص عشان يظهر.
              </span>
            </p>
            {energy.charging.length === 0 && energy.draining.length === 0 ? (
              <p className="text-xs text-[#8c745c] py-3">
                لسه مفيش كفاية. قيّم أثر الملاحظات في سجل كل شخص ({energy.unrated} ملف محتاج تقييم أكتر).
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                    <BatteryCharging className="w-4 h-4" /> بيشحنوك
                  </div>
                  <div className="space-y-2">
                    {energy.charging.length === 0 && <div className="text-[11px] text-[#7a5f45]">—</div>}
                    {energy.charging.map((p) => (
                      <PersonRow key={p.id} p={p} tone="good" />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                    <BatteryLow className="w-4 h-4" /> بيتعبوك
                  </div>
                  <div className="space-y-2">
                    {energy.draining.length === 0 && <div className="text-[11px] text-[#7a5f45]">—</div>}
                    {energy.draining.map((p) => (
                      <PersonRow key={p.id} p={p} tone="bad" />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* What they know */}
          <section>
            <h2 className="text-sm font-bold text-[#3d2716] mb-1 border-b border-[#cca779] pb-1">إيه اللي الناس عارفاه عنك</h2>
            {totalKnow === 0 ? (
              <p className="text-xs text-[#8c745c] py-3">
                لسه مفيش حاجة. في صفحة "حياته ودايرته" بتاعة أي شخص فيه قسم "اللي عارفه عني"، سجّل فيه الحاجات اللي هو عارفها أو مش عارفها عنك وهتتجمع هنا.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 my-3 text-[11px]">
                  {(['knows', 'unsure', 'unknown'] as const).map((k) => (
                    <span key={k} className={`px-2 py-1 rounded border font-bold ${STATUS[k].cls}`}>
                      {STATUS[k].label}: {know.counts[k]}
                    </span>
                  ))}
                </div>
                <div className="space-y-3">
                  {know.people.map((person) => (
                    <div key={person.id} className="bg-[#fcf9f2] border border-[#cbb184] rounded-lg p-3">
                      <button
                        type="button"
                        onClick={() => onOpenLinked?.(person.id)}
                        className="text-sm font-bold text-[#8c1d18] hover:underline mb-2 flex items-center gap-1.5"
                      >
                        {person.name} <ArrowLeft className="w-3 h-3" />
                      </button>
                      <ul className="space-y-1.5">
                        {person.items.map((it, i) => {
                          const S = STATUS[it.status];
                          const Icon = S.icon;
                          return (
                            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm">
                              <span className={`mt-0.5 shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold ${S.cls}`}>
                                <Icon className="w-3 h-3" />
                                {S.label}
                              </span>
                              <span className="leading-relaxed">
                                {it.text}
                                {it.via && <span className="text-[11px] text-[#7a5f45]"> (عن طريق {it.via})</span>}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
