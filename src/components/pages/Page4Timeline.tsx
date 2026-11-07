import React, { useState } from 'react';
import { Calendar, Plus, MessageSquare, Eye, Lightbulb, Trash2, Edit2, Filter, Check, Tag } from 'lucide-react';
import { PersonDossier, TimelineEntry, ObservationType, ObservationSource } from '../../types/dossier';

interface Page4TimelineProps {
  dossier: PersonDossier;
  onUpdateDossier: (updated: Partial<PersonDossier>) => void;
}

export const Page4Timeline: React.FC<Page4TimelineProps> = ({ dossier, onUpdateDossier }) => {
  const [timeline, setTimeline] = useState<TimelineEntry[]>(dossier.timeline || []);
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<ObservationType>('incident');
  const [noteSource, setNoteSource] = useState<ObservationSource>('seen');
  const [noteTagInput, setNoteTagInput] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const typeConfig: Record<ObservationType, { label: string; icon: any; color: string }> = {
    incident: { label: 'واقعة / حدث', icon: Calendar, color: 'bg-rose-100 text-rose-900 border-rose-300' },
    conversation: { label: 'محادثة', icon: MessageSquare, color: 'bg-blue-100 text-blue-900 border-blue-300' },
    impression: { label: 'انطباع / استنتاج', icon: Lightbulb, color: 'bg-amber-100 text-amber-900 border-amber-300' },
  };

  const sourceConfig: Record<ObservationSource, { label: string; color: string }> = {
    seen: { label: 'عاينته بنفسي', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    inferred: { label: 'استنتجته تحليلياً', color: 'bg-purple-100 text-purple-900 border-purple-300' },
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const tags = noteTagInput
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const newEntry: TimelineEntry = {
      id: `note-${Date.now()}`,
      date: noteDate || new Date().toISOString().split('T')[0],
      text: noteText.trim(),
      type: noteType,
      source: noteSource,
      tags: tags.length > 0 ? tags : undefined,
    };

    const updated = [newEntry, ...timeline];
    setTimeline(updated);
    onUpdateDossier({ timeline: updated });

    setNoteText('');
    setNoteTagInput('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    const updated = timeline.filter((n) => n.id !== id);
    setTimeline(updated);
    onUpdateDossier({ timeline: updated });
  };

  // Filter & sort chronologically (newest first)
  const filteredTimeline = timeline
    .filter((entry) => {
      if (filterType !== 'all' && entry.type !== filterType) return false;
      if (filterSource !== 'all' && entry.source !== filterSource) return false;
      if (searchQuery.trim() && !entry.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bg-vintage-paper border-2 border-[#bfa57d] rounded-lg p-6 sm:p-8 min-h-[600px] shadow-sm relative font-arabic-body text-[#2c1d11]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b-2 border-[#8c6b45]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black font-typewriter tracking-wide text-[#2b1b10]">
              TIMELINE LOG
            </h1>
            <span className="text-xl sm:text-2xl font-bold font-arabic-hand text-[#8c1d18]">
              • سجل الملاحظات الزمني
            </span>
          </div>
          <p className="text-xs text-[#705238] mt-1">
            توثيق زمني مستمر للوقائع والمحادثات والانطباعات الميدانية؛ اللبنة الأساسية لتحليل السلوك.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="mt-3 sm:mt-0 px-4 py-2 bg-[#8c1d18] hover:bg-[#731713] text-[#fbf7ee] text-xs font-bold rounded shadow transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة ملاحظة جديدة</span>
        </button>
      </div>

      {/* Add Note Card Form */}
      {isAdding && (
        <form
          onSubmit={handleAddNote}
          className="mb-6 p-4 bg-[#f4ecd8] border-2 border-[#8c6b45] rounded-lg shadow-md animate-in fade-in duration-200"
        >
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#cca779]">
            <span className="stamp-black text-xs">قيد زمني جديد</span>
            <span className="text-xs font-bold text-[#5c4028]">تدوين ملاحظة جديدة في الملف</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-bold text-[#5c4028] mb-1 font-typewriter">
                التاريخ / DATE:
              </label>
              <input
                type="date"
                required
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="w-full bg-[#faf5eb] border border-[#a68660] text-xs p-2 rounded focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5c4028] mb-1 font-typewriter">
                نوع الملاحظة:
              </label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as ObservationType)}
                className="w-full bg-[#faf5eb] border border-[#a68660] text-xs p-2 rounded focus:outline-none"
              >
                <option value="incident">واقعة / حدث ملموس</option>
                <option value="conversation">محادثة أو حوار مباشر</option>
                <option value="impression">انطباع واستنتاج سلوكي</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#5c4028] mb-1 font-typewriter">
                المصدر والموثوقية:
              </label>
              <select
                value={noteSource}
                onChange={(e) => setNoteSource(e.target.value as ObservationSource)}
                className="w-full bg-[#faf5eb] border border-[#a68660] text-xs p-2 rounded focus:outline-none"
              >
                <option value="seen">عاينته بنفسي (شاهد عيان)</option>
                <option value="inferred">استنتجته تحليلياً</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-bold text-[#5c4028] mb-1 font-typewriter">
              نص الملاحظة والتفاصيل:
            </label>
            <textarea
              rows={3}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="اكتب ما حدث بدقة وموضوعية: الموقف، تصرفه، رد فعله، ما قاله بالضبط..."
              className="w-full bg-white border border-[#a68660] p-2.5 text-xs font-arabic-body rounded focus:outline-none"
            />
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-bold text-[#5c4028] mb-1 font-typewriter">
              وسوم تصنيفية (اختياري - مفصولة بفواصل):
            </label>
            <input
              type="text"
              value={noteTagInput}
              onChange={(e) => setNoteTagInput(e.target.value)}
              placeholder="مثال: عمل، تفاوض، أزمة، وفاء..."
              className="w-full bg-[#faf5eb] border border-[#a68660] text-xs p-2 rounded focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#cca779]">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-stone-600 border border-stone-300 rounded hover:bg-stone-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#8c1d18] hover:bg-[#731713] text-white text-xs font-bold rounded shadow transition"
            >
              حفظ في السجل
            </button>
          </div>
        </form>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 bg-[#f2e7d0] border border-[#cca779] rounded-md text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#5c4028]" />
          <span className="font-bold text-[#5c4028]">تصفية:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#faf5eb] border border-[#a68660] px-2 py-1 rounded text-xs"
          >
            <option value="all">كل الأنواع</option>
            <option value="incident">وقائع وأحداث</option>
            <option value="conversation">محادثات</option>
            <option value="impression">انطباعات</option>
          </select>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="bg-[#faf5eb] border border-[#a68660] px-2 py-1 rounded text-xs"
          >
            <option value="all">كل المصادر</option>
            <option value="seen">معاينة شخصية</option>
            <option value="inferred">استنتاج تحليلي</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الملاحظات..."
            className="bg-[#faf5eb] border border-[#a68660] px-2.5 py-1 rounded text-xs focus:outline-none"
          />
          <span className="font-typewriter text-[#7a5f45]">
            ({filteredTimeline.length} قيد)
          </span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-4 relative">
        {filteredTimeline.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8c745c] border-2 border-dashed border-[#cca779] rounded-lg">
            لا توجد ملاحظات تطابق معايير البحث الحالية.
          </div>
        ) : (
          filteredTimeline.map((item) => {
            const typeInfo = typeConfig[item.type] || typeConfig.incident;
            const sourceInfo = sourceConfig[item.source] || sourceConfig.seen;
            const Icon = typeInfo.icon;

            return (
              <div
                key={item.id}
                className="bg-[#faf5ec] border border-[#d6be90] rounded-md p-4 shadow-sm hover:shadow-md transition relative group"
              >
                {/* Note Header: Date & Badges */}
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2 pb-2 border-b border-[#e5d4b5]">
                  <div className="flex items-center gap-2">
                    <span className="font-typewriter text-xs font-bold text-[#8c1d18] bg-[#f2e7d0] px-2 py-0.5 rounded border border-[#cca779]">
                      [ {item.date} ]
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${typeInfo.color}`}>
                      <Icon className="w-3 h-3" />
                      <span>{typeInfo.label}</span>
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${sourceInfo.color}`}>
                      {sourceInfo.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-stone-400 hover:text-rose-600 transition p-1 opacity-70 group-hover:opacity-100"
                    title="حذف الملاحظة"
                    aria-label="حذف الملاحظة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Note Content */}
                <p className="text-xs sm:text-sm font-arabic-body text-[#24170e] leading-relaxed">
                  {item.text}
                </p>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5 pt-1.5 border-t border-[#f0e2c8]">
                    {item.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-[#f0e4cd] text-[#5c4028] px-2 py-0.2 rounded-full border border-[#cca779] flex items-center gap-1"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
