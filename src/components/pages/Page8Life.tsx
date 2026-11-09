import React, { useState } from 'react';
import { MapPin, Eye, Users, Plus, Trash2, Link2, ExternalLink, ShieldAlert } from 'lucide-react';
import {
  CircleMember,
  FactSource,
  InfluenceLevel,
  KnowledgeItem,
  KnowledgeSource,
  KnowledgeStatus,
  LifeFact,
  LifeFactKind,
  PersonDossier,
} from '../../types/dossier';
import {
  FACT_SOURCE_LABEL,
  INFLUENCE_LABEL,
  KNOWLEDGE_SOURCE_LABEL,
  KNOWLEDGE_STATUS_LABEL,
  LIFE_KIND_LABEL,
  sortCircleByInfluence,
} from '../../utils/dossierLogic';

interface Page8LifeProps {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
  /** Other files in the archive (for linking circle members). */
  linkable?: { id: string; name: string }[];
  onOpenLinked?: (id: string) => void;
}

const STATUS_STYLE: Record<KnowledgeStatus, string> = {
  knows: 'bg-rose-100 text-rose-900 border-rose-400',
  unsure: 'bg-amber-100 text-amber-900 border-amber-400',
  unknown: 'bg-emerald-100 text-emerald-900 border-emerald-400',
};
const INFLUENCE_STYLE: Record<InfluenceLevel, string> = {
  high: 'bg-[#8c1d18] text-white border-[#6b1511]',
  medium: 'bg-amber-100 text-amber-900 border-amber-400',
  low: 'bg-stone-100 text-stone-700 border-stone-300',
};
const STATUS_CYCLE: Record<KnowledgeStatus, KnowledgeStatus> = { knows: 'unsure', unsure: 'unknown', unknown: 'knows' };

const inputCls = 'w-full bg-white border border-[#a68660] text-xs p-2 rounded focus:outline-none';
const selectCls = 'w-full bg-[#faf5eb] border border-[#a68660] text-xs p-2 rounded focus:outline-none';

const CardHeader: React.FC<{ icon: React.ReactNode; title: string; en: string; hint: string; onAdd: () => void }> = ({ icon, title, en, hint, onAdd }) => (
  <div className="mb-3 pb-2 border-b-2 border-[#8c1d18]/40">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-base font-bold text-[#691410]">{title}</h2>
          <p className="font-typewriter text-[10px] text-[#8c1d18]/80 uppercase">{en}</p>
        </div>
      </div>
      <button type="button" onClick={onAdd} className="px-2.5 py-1 bg-[#8c1d18] hover:bg-[#731713] text-[#fbf7ee] text-xs font-bold rounded flex items-center gap-1 shadow transition">
        <Plus className="w-3.5 h-3.5" />
        <span>إضافة</span>
      </button>
    </div>
    <p className="text-xs text-[#705238] mt-2 leading-relaxed">{hint}</p>
  </div>
);

const FormActions: React.FC<{ onCancel: () => void }> = ({ onCancel }) => (
  <div className="flex justify-end gap-2">
    <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-stone-600 border border-stone-300 rounded hover:bg-stone-100">
      إلغاء
    </button>
    <button type="submit" className="px-4 py-1.5 bg-[#8c1d18] hover:bg-[#731713] text-white text-xs font-bold rounded shadow">
      حفظ
    </button>
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-6 text-center text-xs text-[#8c745c] border-2 border-dashed border-[#cca779] rounded-lg">{text}</div>
);

const DeleteBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} className="text-stone-400 hover:text-rose-600 transition p-1 shrink-0" aria-label="حذف" title="حذف">
    <Trash2 className="w-3.5 h-3.5" />
  </button>
);

export const Page8Life: React.FC<Page8LifeProps> = ({ dossier, onUpdateDossier, linkable = [], onOpenLinked }) => {
  const [life, setLife] = useState<LifeFact[]>(dossier.life || []);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(dossier.knowledge || []);
  const [circle, setCircle] = useState<CircleMember[]>(dossier.circle || []);

  const [addingLife, setAddingLife] = useState(false);
  const [addingKnow, setAddingKnow] = useState(false);
  const [addingCircle, setAddingCircle] = useState(false);

  // life form
  const [lKind, setLKind] = useState<LifeFactKind>('place');
  const [lText, setLText] = useState('');
  const [lDetail, setLDetail] = useState('');
  const [lSource, setLSource] = useState<FactSource | ''>('');
  // knowledge form
  const [kText, setKText] = useState('');
  const [kStatus, setKStatus] = useState<KnowledgeStatus>('knows');
  const [kSource, setKSource] = useState<KnowledgeSource | ''>('');
  const [kVia, setKVia] = useState('');
  // circle form
  const [cName, setCName] = useState('');
  const [cRelation, setCRelation] = useState('');
  const [cTie, setCTie] = useState('');
  const [cInfluence, setCInfluence] = useState<InfluenceLevel | ''>('');
  const [cLink, setCLink] = useState('');

  const saveLife = (next: LifeFact[]) => {
    setLife(next);
    onUpdateDossier({ life: next });
  };
  const saveKnowledge = (next: KnowledgeItem[]) => {
    setKnowledge(next);
    onUpdateDossier({ knowledge: next });
  };
  const saveCircle = (next: CircleMember[]) => {
    setCircle(next);
    onUpdateDossier({ circle: next });
  };

  const addLife = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lText.trim()) return;
    saveLife([
      { id: `life-${Date.now()}`, kind: lKind, text: lText.trim(), detail: lDetail.trim() || undefined, source: lSource || undefined },
      ...life,
    ]);
    setLText('');
    setLDetail('');
    setAddingLife(false);
  };

  const addKnowledge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kText.trim()) return;
    saveKnowledge([
      { id: `know-${Date.now()}`, text: kText.trim(), status: kStatus, source: kSource || undefined, via: kVia.trim() || undefined },
      ...knowledge,
    ]);
    setKText('');
    setKVia('');
    setAddingKnow(false);
  };

  const addCircle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;
    saveCircle([
      {
        id: `circ-${Date.now()}`,
        name: cName.trim(),
        relation: cRelation.trim(),
        tieToMe: cTie.trim() || undefined,
        influence: cInfluence || undefined,
        linkedDossierId: cLink || undefined,
      },
      ...circle,
    ]);
    setCName('');
    setCRelation('');
    setCTie('');
    setCInfluence('');
    setCLink('');
    setAddingCircle(false);
  };

  const counts = {
    knows: knowledge.filter((k) => k.status === 'knows').length,
    unsure: knowledge.filter((k) => k.status === 'unsure').length,
    unknown: knowledge.filter((k) => k.status === 'unknown').length,
  };
  const lifeGroups = (Object.keys(LIFE_KIND_LABEL) as LifeFactKind[])
    .map((k) => ({ kind: k, items: life.filter((f) => f.kind === k) }))
    .filter((g) => g.items.length > 0);
  const linkedName = (id?: string) => linkable.find((l) => l.id === id)?.name;

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      <div className="pb-4 mb-6 border-b-2 border-[#8c6b45]">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">LIFE & CIRCLE</h1>
          <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">• حياته ودايرته</span>
        </div>
        <p className="text-xs text-[#705238] mt-1">
          روتينه وأماكنه، وهو عارف إيه عنك، وإيه الناس اللي في حياته وبيسمع كلامهم.
        </p>
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-[#6e5033] bg-[#f2e7d0] border border-[#cca779] rounded px-2 py-1.5">
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>سجّل اللي لاحظته أو هو قاله بس. للأماكن اكتب المنطقة مش العنوان بالتفصيل.</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. Daily life */}
        <div className="bg-[#f7eedc] border-2 border-[#cfa58a] rounded-lg p-4 shadow-sm">
          <CardHeader
            icon={<MapPin className="w-5 h-5 text-[#8c1d18]" />}
            title="حياته اليومية"
            en="DAILY LIFE & PLACES"
            hint="بيسكن في أي منطقة، بيشتغل إيه، روتينه الأسبوعي، وبيروح فين في الأغلب."
            onAdd={() => setAddingLife((v) => !v)}
          />
          {addingLife && (
            <form onSubmit={addLife} className="mb-4 p-3 bg-[#f4ecd8] border border-[#cca779] rounded-md space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={lKind} onChange={(e) => setLKind(e.target.value as LifeFactKind)} className={selectCls}>
                  {(Object.keys(LIFE_KIND_LABEL) as LifeFactKind[]).map((k) => (
                    <option key={k} value={k}>{LIFE_KIND_LABEL[k]}</option>
                  ))}
                </select>
                <input required value={lText} onChange={(e) => setLText(e.target.value)} placeholder="مثال: جيم في المعادي" className={`${inputCls} sm:col-span-2`} />
                <input value={lDetail} onChange={(e) => setLDetail(e.target.value)} placeholder="قد إيه / إمتى؟ مثال: 3 مرات في الأسبوع بعد الشغل" className={`${inputCls} sm:col-span-2`} />
                <select value={lSource} onChange={(e) => setLSource(e.target.value as FactSource | '')} className={selectCls}>
                  <option value="">المصدر؟</option>
                  {(Object.keys(FACT_SOURCE_LABEL) as FactSource[]).map((k) => (
                    <option key={k} value={k}>{FACT_SOURCE_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <FormActions onCancel={() => setAddingLife(false)} />
            </form>
          )}
          {lifeGroups.length === 0 ? (
            <Empty text="لسه مفيش معلومات. أضف بإيدك أو سجّل فويس في صفحة السجل." />
          ) : (
            <div className="space-y-3">
              {lifeGroups.map((g) => (
                <div key={g.kind}>
                  <div className="text-[11px] font-bold text-[#8c1d18] font-typewriter mb-1">{LIFE_KIND_LABEL[g.kind]}</div>
                  <ul className="space-y-1.5">
                    {g.items.map((f) => (
                      <li key={f.id} className="bg-[#faf5ec] border border-[#d6be90] rounded-md p-2.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-[#24170e]">{f.text}</p>
                          {(f.detail || f.source) && (
                            <p className="text-[11px] text-[#7a5f45] mt-0.5">
                              {f.detail}
                              {f.detail && f.source ? ' • ' : ''}
                              {f.source ? FACT_SOURCE_LABEL[f.source] : ''}
                            </p>
                          )}
                        </div>
                        <DeleteBtn onClick={() => saveLife(life.filter((x) => x.id !== f.id))} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. What he knows about me */}
        <div className="bg-[#f7eedc] border-2 border-[#cfa58a] rounded-lg p-4 shadow-sm">
          <CardHeader
            icon={<Eye className="w-5 h-5 text-[#8c1d18]" />}
            title="هو عارف إيه عني"
            en="WHAT HE KNOWS ABOUT ME"
            hint="كل معلومة عنك وحالتها عنده. اضغط على الحالة لتغييرها."
            onAdd={() => setAddingKnow((v) => !v)}
          />
          {knowledge.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-bold">
              {(Object.keys(counts) as KnowledgeStatus[]).map((k) => (
                <span key={k} className={`px-2 py-0.5 rounded border ${STATUS_STYLE[k]}`}>
                  {KNOWLEDGE_STATUS_LABEL[k]}: {counts[k]}
                </span>
              ))}
            </div>
          )}
          {addingKnow && (
            <form onSubmit={addKnowledge} className="mb-4 p-3 bg-[#f4ecd8] border border-[#cca779] rounded-md space-y-2">
              <input required value={kText} onChange={(e) => setKText(e.target.value)} placeholder="مثال: إني غيرت شغلي" className={inputCls} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={kStatus} onChange={(e) => setKStatus(e.target.value as KnowledgeStatus)} className={selectCls}>
                  {(Object.keys(KNOWLEDGE_STATUS_LABEL) as KnowledgeStatus[]).map((k) => (
                    <option key={k} value={k}>{KNOWLEDGE_STATUS_LABEL[k]}</option>
                  ))}
                </select>
                <select value={kSource} onChange={(e) => setKSource(e.target.value as KnowledgeSource | '')} className={selectCls}>
                  <option value="">عرفها إزاي؟</option>
                  {(Object.keys(KNOWLEDGE_SOURCE_LABEL) as KnowledgeSource[]).map((k) => (
                    <option key={k} value={k}>{KNOWLEDGE_SOURCE_LABEL[k]}</option>
                  ))}
                </select>
                <input value={kVia} onChange={(e) => setKVia(e.target.value)} placeholder="عن طريق مين؟" className={inputCls} />
              </div>
              <FormActions onCancel={() => setAddingKnow(false)} />
            </form>
          )}
          {knowledge.length === 0 ? (
            <Empty text="لسه مفيش معلومات. أضف اللي عايز تتابع هو عارفه ولا لأ." />
          ) : (
            <ul className="space-y-1.5">
              {knowledge.map((k) => (
                <li key={k.id} className="bg-[#faf5ec] border border-[#d6be90] rounded-md p-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-[#24170e]">{k.text}</p>
                    {(k.source || k.via) && (
                      <p className="text-[11px] text-[#7a5f45] mt-0.5">
                        {k.source ? KNOWLEDGE_SOURCE_LABEL[k.source] : ''}
                        {k.via ? ` • عن طريق ${k.via}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => saveKnowledge(knowledge.map((x) => (x.id === k.id ? { ...x, status: STATUS_CYCLE[x.status] } : x)))}
                      title="اضغط لتغيير الحالة"
                      className={`px-2 py-0.5 text-[11px] font-bold rounded border ${STATUS_STYLE[k.status]}`}
                    >
                      {KNOWLEDGE_STATUS_LABEL[k.status]} ↺
                    </button>
                    <DeleteBtn onClick={() => saveKnowledge(knowledge.filter((x) => x.id !== k.id))} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 3. Circle */}
        <div className="bg-[#f7eedc] border-2 border-[#cfa58a] rounded-lg p-4 shadow-sm">
          <CardHeader
            icon={<Users className="w-5 h-5 text-[#8c1d18]" />}
            title="دايرته"
            en="HIS CIRCLE & INFLUENCE"
            hint="الناس في حياته اللي ليهم علاقة بيك أو بتأثروا عليه، مرتبين حسب إنه بيسمع كلامهم قد إيه."
            onAdd={() => setAddingCircle((v) => !v)}
          />
          {addingCircle && (
            <form onSubmit={addCircle} className="mb-4 p-3 bg-[#f4ecd8] border border-[#cca779] rounded-md space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input required value={cName} onChange={(e) => setCName(e.target.value)} placeholder="الاسم" className={inputCls} />
                <input value={cRelation} onChange={(e) => setCRelation(e.target.value)} placeholder="علاقته بيه (أخوه، مديره...)" className={inputCls} />
                <input value={cTie} onChange={(e) => setCTie(e.target.value)} placeholder="علاقة الشخص ده بيا (اختياري)" className={inputCls} />
                <select value={cInfluence} onChange={(e) => setCInfluence(e.target.value as InfluenceLevel | '')} className={selectCls}>
                  <option value="">بيسمع كلامه قد إيه؟</option>
                  {(Object.keys(INFLUENCE_LABEL) as InfluenceLevel[]).map((k) => (
                    <option key={k} value={k}>{INFLUENCE_LABEL[k]}</option>
                  ))}
                </select>
                {linkable.length > 0 && (
                  <select value={cLink} onChange={(e) => setCLink(e.target.value)} className={`${selectCls} sm:col-span-2`}>
                    <option value="">اربطه بملف في الأرشيف (اختياري)</option>
                    {linkable.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <FormActions onCancel={() => setAddingCircle(false)} />
            </form>
          )}
          {circle.length === 0 ? (
            <Empty text="لسه مفيش ناس. أضف أقرب الناس ليه، أو سجّل فويس والذكاء الاصطناعي يلقطهم." />
          ) : (
            <ul className="space-y-1.5">
              {sortCircleByInfluence(circle).map((c) => {
                const linked = linkedName(c.linkedDossierId);
                return (
                  <li key={c.id} className="bg-[#faf5ec] border border-[#d6be90] rounded-md p-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-arabic-hand text-base font-bold text-[#24170e]">{c.name}</span>
                        {c.relation && <span className="text-xs text-[#5c4028]">({c.relation})</span>}
                        {c.influence && (
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${INFLUENCE_STYLE[c.influence]}`}>
                            {INFLUENCE_LABEL[c.influence]}
                          </span>
                        )}
                      </div>
                      {c.tieToMe && <p className="text-[11px] text-[#7a5f45] mt-0.5">علاقته بيا: {c.tieToMe}</p>}
                      {linked && (
                        <button
                          type="button"
                          onClick={() => c.linkedDossierId && onOpenLinked?.(c.linkedDossierId)}
                          className="mt-1 text-[11px] font-bold text-[#8c1d18] hover:underline flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3" />
                          ملفه في الأرشيف: {linked}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <DeleteBtn onClick={() => saveCircle(circle.filter((x) => x.id !== c.id))} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
