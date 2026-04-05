"use client";
import React, { useState } from 'react';
import { 
  useGetCategoriesQuery, 
  useUpdateCategoryMutation, 
  useDeleteCategoryMutation,
  useCreateCategoryMutation
} from '@/store/api';
import { MetricCard, SeverityBadge, StatusBadge, ConfirmModal } from '@/components/common/IndustrialUI';

export default function TaxonomyControl() {
  const { data: categories, isLoading } = useGetCategoriesQuery();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [createCategory] = useCreateCategoryMutation();

  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse font-inter">Initializing Global Taxonomy...</div>;

  const handleUpdate = async (reason: string) => {
    if (!editing) return;
    await updateCategory({ id: editing.id, name: editing.name, slug: editing.slug });
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteCategory(deleting).unwrap();
    } catch (e: any) {
      alert(e.data?.detail || "Node deletion failed. Integrity breach.");
    }
    setDeleting(null);
  };

  const totalNodes = (cats: any[]): number => {
    return cats.reduce((acc, cat) => acc + 1 + (cat.children ? totalNodes(cat.children) : 0), 0);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Taxonomy Control</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter italic tracking-tight">Marketplace Core Hierarchy & Niche Mapping</p>
        </div>
        <div className="flex flex-col items-end">
           <button 
             onClick={() => alert("Add Root Node Triggered")}
             className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
           >
             + Add Root Node
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Total Nodes" value={totalNodes(categories || [])} />
        <MetricCard label="Active Nodes" value={totalNodes(categories || [])} positive={true} />
        <MetricCard label="Hierarchy Depth" value={3} />
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm p-8">
        <div className="space-y-4">
          {categories?.map((cat) => (
            <CategoryRow 
              key={cat.id} 
              category={cat} 
              onEdit={setEditing} 
              onDelete={setDeleting} 
            />
          ))}
        </div>
        
        {categories?.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs font-medium italic">
            Zero taxonomy nodes detected. Marketplace hierarchy is empty.
          </div>
        )}
      </div>

      {editing && (
        <ConfirmModal 
          title="Edit Taxonomy Node"
          message={`Adjusting the mapping for "${editing.name}". Changes reflect globally across navigation nodes.`}
          onConfirm={handleUpdate}
          onCancel={() => setEditing(null)}
          requireReason={false}
        />
      )}

      {deleting && (
        <ConfirmModal 
          title="Confirm Node Deletion"
          message="Deleting a marketplace node is irreversible. Ensure no children exist and all associated Gigs have been remapped."
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
          requireReason={true}
        />
      )}
    </div>
  );
}

function CategoryRow({ category, onEdit, onDelete, depth = 0 }: { category: any, onEdit: any, onDelete: any, depth?: number }) {
  return (
    <div className={`space-y-2 ${depth > 0 ? 'ml-8 border-l border-slate-50 pl-4' : ''}`}>
      <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors group">
        <div className="flex items-center gap-3">
          <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{category.icon || '📁'}</span>
          <div>
            <div className="text-xs font-black text-slate-900 uppercase tracking-tighter">{category.name}</div>
            <div className="text-[10px] text-slate-400 font-mono italic">/{category.slug}</div>
          </div>
          {depth === 0 && <span className="text-[8px] bg-slate-200 text-slate-500 font-black px-1.5 py-0.5 rounded uppercase tracking-widest ml-2">Root Node</span>}
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={() => onEdit(category)}
             className="px-2 py-1 bg-white text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50"
           >
             Edit
           </button>
           <button 
             onClick={() => onDelete(category.id)}
             className="px-2 py-1 bg-white text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-50"
           >
             Delete
           </button>
        </div>
      </div>
      {category.children && category.children.map((child: any) => (
        <CategoryRow 
           key={child.id} 
           category={child} 
           onEdit={onEdit} 
           onDelete={onDelete} 
           depth={depth + 1} 
        />
      ))}
    </div>
  );
}
