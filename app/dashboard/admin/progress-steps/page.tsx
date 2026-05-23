"use client";
import { useState } from "react";
import { useProgressSteps } from "@/hooks/use-firestore-config";
import { addProgressStep, updateProgressStep, deleteProgressStep, reorderProgressSteps } from "@/lib/firestore-services";
import { useAuthStore } from "@/store/auth-store";
import { useOrgStore } from "@/store/org-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  X, Check, Loader2, ChevronUp, ChevronDown, GripVertical,
} from "lucide-react";

const COLOR_OPTIONS = [
  { value: "slate",   label: "Gray",   classes: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "blue",    label: "Blue",   classes: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "amber",   label: "Amber",  classes: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "purple",  label: "Purple", classes: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "emerald", label: "Green",  classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "orange",  label: "Orange", classes: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "rose",    label: "Rose",   classes: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "cyan",    label: "Cyan",   classes: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "indigo",  label: "Indigo", classes: "bg-indigo-50 text-indigo-700 border-indigo-200" },
];

function getColorClasses(color: string) {
  return COLOR_OPTIONS.find((c) => c.value === color)?.classes ?? "bg-gray-100 text-gray-700 border-gray-300";
}

export default function ProgressStepsPage() {
  const { items: steps, loading } = useProgressSteps();
  const currentUser = useAuthStore((s) => s.currentUser);
  const orgId = useOrgStore((s) => s.activeOrg?.orgId ?? "");

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editColor, setEditColor] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const addItem = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await addProgressStep(orgId, { name: newName.trim(), description: newDesc.trim(), color: newColor }, currentUser?.uid ?? "");
      setNewName(""); setNewDesc(""); setNewColor("blue"); setShowAdd(false);
    } finally { setSaving(false); }
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await updateProgressStep(id, { name: editName, description: editDesc, color: editColor });
    } finally { setSaving(false); setEditingId(null); }
  };

  const toggleActive = async (item: any) => {
    setTogglingId(item.id);
    try { await updateProgressStep(item.id, { isActive: !item.isActive }); }
    finally { setTogglingId(null); }
  };

  const deleteItem = async (id: string) => {
    setDeletingId(id);
    try { await deleteProgressStep(id); }
    finally { setDeletingId(null); setDeleteConfirmId(null); }
  };

  const moveStep = async (index: number, direction: "up" | "down") => {
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= steps.length) return;

    setReordering(true);
    try {
      await reorderProgressSteps([
        { id: steps[index].id, order: swapIdx },
        { id: steps[swapIdx].id, order: index },
      ]);
    } finally { setReordering(false); }
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
    setEditColor(item.color ?? "blue");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading progress steps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Progress Steps</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define the journey steps for respondents. Each respondent progresses through these stages.
            Use the arrows to reorder.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} className="mr-1.5" />Add Step
        </Button>
      </div>

      {/* Preview — visual pipeline */}
      <div className="flex items-center gap-1 flex-wrap">
        {steps.filter((s: any) => s.isActive).map((step: any, i: number, arr: any[]) => (
          <div key={step.id} className="flex items-center gap-1">
            <span className={cn(
              "text-[10px] font-semibold px-2.5 py-1 rounded-full border",
              getColorClasses(step.color),
            )}>
              {step.name}
            </span>
            {i < arr.length - 1 && <span className="text-muted-foreground/30 text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showAdd && (
        <Card className="border border-primary/30 shadow-none bg-primary/2">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-foreground mb-3">New Progress Step</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Name *</label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Baptism, Discipleship..." className="h-8 text-sm" autoFocus />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Description</label>
                  <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Short description..." className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setNewColor(c.value)}
                      className={cn(
                        "text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all",
                        c.classes,
                        newColor === c.value ? "ring-2 ring-offset-1 ring-primary/50 scale-105" : "opacity-60 hover:opacity-100",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setNewName(""); setNewDesc(""); }}>Cancel</Button>
                <Button size="sm" disabled={!newName.trim() || saving} onClick={addItem}>
                  {saving ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Check size={13} className="mr-1.5" />}Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border border-border shadow-none overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-2 py-2.5 w-16" />
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-8">#</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-[180px]">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5">Description</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-20">Color</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2.5 w-20">Status</th>
              <th className="px-3 py-2.5 w-24" />
            </tr>
          </thead>
          <tbody>
            {steps.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  No progress steps yet. Add one above to define your respondent journey.
                </td>
              </tr>
            )}
            {steps.map((item: any, index: number) => (
              <tr key={item.id} className="group border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                {/* Reorder buttons */}
                <td className="px-2 py-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={() => moveStep(index, "up")}
                      disabled={index === 0 || reordering}
                      className={cn("p-0.5 rounded hover:bg-muted transition-colors", index === 0 && "opacity-20 cursor-not-allowed")}
                    >
                      <ChevronUp size={12} className="text-muted-foreground" />
                    </button>
                    <GripVertical size={10} className="text-muted-foreground/30" />
                    <button
                      onClick={() => moveStep(index, "down")}
                      disabled={index === steps.length - 1 || reordering}
                      className={cn("p-0.5 rounded hover:bg-muted transition-colors", index === steps.length - 1 && "opacity-20 cursor-not-allowed")}
                    >
                      <ChevronDown size={12} className="text-muted-foreground" />
                    </button>
                  </div>
                </td>

                {/* Order number */}
                <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{index + 1}</td>

                {/* Name */}
                <td className="px-3 py-3">
                  {editingId === item.id ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs" autoFocus />
                  ) : (
                    <span className={cn(
                      "font-semibold text-xs px-2.5 py-1 rounded-full border inline-block",
                      getColorClasses(item.color),
                    )}>
                      {item.name}
                    </span>
                  )}
                </td>

                {/* Description */}
                <td className="px-3 py-3">
                  {editingId === item.id ? (
                    <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-7 text-xs" placeholder="Description..." />
                  ) : (
                    <span className="text-xs text-muted-foreground">{item.description || <span className="italic text-muted-foreground/40">No description</span>}</span>
                  )}
                </td>

                {/* Color */}
                <td className="px-3 py-3">
                  {editingId === item.id ? (
                    <select
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-7 text-xs border rounded px-1.5 bg-background"
                    >
                      {COLOR_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize">{item.color || "—"}</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <button onClick={() => toggleActive(item)} disabled={togglingId === item.id} className="flex items-center gap-1">
                    {togglingId === item.id ? (
                      <Loader2 size={12} className="animate-spin text-muted-foreground" />
                    ) : item.isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                        <ToggleRight size={14} className="text-emerald-500" />Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                        <ToggleLeft size={14} />Inactive
                      </span>
                    )}
                  </button>
                </td>

                {/* Actions */}
                <td className="px-3 py-3">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={saving} onClick={() => saveEdit(item.id)}>
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="text-emerald-600" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X size={12} className="text-muted-foreground" />
                      </Button>
                    </div>
                  ) : deleteConfirmId === item.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-destructive font-medium mr-1">Delete?</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled={deletingId === item.id} onClick={() => deleteItem(item.id)}>
                        {deletingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} className="text-destructive" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteConfirmId(null)}>
                        <X size={12} className="text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => startEdit(item)}>
                        <Pencil size={12} className="text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => setDeleteConfirmId(item.id)}>
                        <Trash2 size={12} className="text-destructive/70" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-muted-foreground">
        {steps.filter((s: any) => s.isActive).length} active / {steps.length} total steps.
        Respondents will progress through active steps in the order shown above.
      </p>
    </div>
  );
}
