import React, { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Edit2,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { MemoryItem, MemoryCategory } from '../../types/memory';
import { getAllMemories, saveMemory, deleteMemory } from '../../db/memories';
import { MemoryService } from '../../core/memory/memoryService';

const CATEGORIES: { label: string; value: MemoryCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Preferences', value: 'preference' },
  { label: 'Projects', value: 'project' },
  { label: 'Goals', value: 'goal' },
  { label: 'Facts', value: 'fact' },
  { label: 'Instructions', value: 'instruction' },
  { label: 'General', value: 'general' },
];

export const MemoryView: React.FC = () => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);

  // Form states
  const [formKey, setFormKey] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<MemoryCategory>('general');
  const [formTags, setFormTags] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    const list = await getAllMemories();
    setMemories(list);
  };

  const handleOpenAddModal = () => {
    setEditingMemory(null);
    setFormKey('');
    setFormContent('');
    setFormCategory('general');
    setFormTags('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mem: MemoryItem) => {
    setEditingMemory(mem);
    setFormKey(mem.key);
    setFormContent(mem.content);
    setFormCategory(mem.category);
    setFormTags(mem.tags ? mem.tags.join(', ') : '');
    setIsModalOpen(true);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formContent.trim()) return;

    const tags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingMemory) {
      await MemoryService.updateMemory(editingMemory.id, {
        key: formKey.trim(),
        content: formContent.trim(),
        category: formCategory,
        tags,
      });
      setFeedback('Memory updated successfully.');
    } else {
      await MemoryService.createMemory({
        key: formKey.trim(),
        content: formContent.trim(),
        category: formCategory,
        tags,
      });
      setFeedback('New memory created and saved locally.');
    }

    setIsModalOpen(false);
    await loadMemories();
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteMemory = async (id: string, keyName: string) => {
    if (window.confirm(`Permanently delete memory "${keyName}" from local storage?`)) {
      await MemoryService.removeMemory(id, keyName);
      await loadMemories();
      setFeedback(`Deleted "${keyName}".`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const filteredMemories = memories.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      m.key.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    return matchesCat && (q === '' || matchesQuery);
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Local Memory Core</h1>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
              {memories.length} Items
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Private knowledge stored strictly on your device. Only relevant items are shared with Gemini during active requests.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 active:scale-95 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Memory</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories by keyword, title, or category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memories Grid */}
      {filteredMemories.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-base font-semibold text-white">No memory items found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No memories matched "${searchQuery}". Try a different keyword.`
              : 'Add facts, goals, or preferences so MY AGENT remembers your context.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMemories.map((mem) => (
            <div
              key={mem.id}
              className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-4 flex flex-col justify-between hover:border-slate-700/80 transition group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 text-sm">{mem.key}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">
                      {mem.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleOpenEditModal(mem)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                      title="Edit memory"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMemory(mem.id, mem.key)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {mem.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {mem.source === 'ai_suggested' ? 'AI Suggested & Approved' : 'Direct User Note'}
                </span>
                <span>{new Date(mem.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold">
                {editingMemory ? 'Edit Memory' : 'Create New Local Memory'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Identifier / Title</label>
                <input
                  type="text"
                  required
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="e.g. Preferred Language, Coffee Choice, Work Goal"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="preference">Preference</option>
                  <option value="project">Project</option>
                  <option value="goal">Goal</option>
                  <option value="fact">Fact</option>
                  <option value="instruction">Instruction</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Content / Details</label>
                <textarea
                  required
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write the exact details or knowledge for MY AGENT to remember..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="work, personal, habits"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
                >
                  {editingMemory ? 'Update Memory' : 'Save Locally'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
