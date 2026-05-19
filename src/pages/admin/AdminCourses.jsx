import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Pencil, Trash2, BookOpen, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import BackLink from "@/components/BackLink";

// Text-letter icons (2 chars) — matches the rest of the app (e.g. "AB", "BC", "P1", "CS").
const ICON_OPTIONS = ["AB","BC","P1","P2","CM","EM","CP","CA","ST","PC","CH","BI","EN","HS","WH","US","EC","PS","AR","MU"];
const COLOR_OPTIONS = ["#2563EB","#7C3AED","#DC2626","#B91C1C","#EA580C","#C026D3","#059669","#0891B2","#A855F7","#F59E0B","#10B981","#6366F1","#EC4899","#14B8A6","#0EA5E9"];

const EMPTY_FORM = { name: "", code: "", description: "", color: "#2563EB", icon: "AB", exam_date: "", is_active: true };

export default function AdminCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadCourses = () =>
    base44.entities.Course.list().then(c => { setCourses(c); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => { loadCourses(); }, []);

  if (user && user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const openAdd = () => {
    setEditingCourse(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditingCourse(c);
    setForm({ name: c.name, code: c.code, description: c.description || "", color: c.color || "#2563EB", icon: c.icon || "AB", exam_date: c.exam_date || "", is_active: c.is_active !== false });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true);
    if (editingCourse) {
      await base44.entities.Course.update(editingCourse.id, form);
    } else {
      await base44.entities.Course.create(form);
    }
    await loadCourses();
    setSaving(false);
    setShowForm(false);
    setEditingCourse(null);
  };

  const deleteCourse = async (id) => {
    await base44.entities.Course.delete(id);
    setDeleteConfirm(null);
    loadCourses();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <BackLink to="/admin" label="Back to Admin" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Course Manager</h1>
          <p className="text-muted-foreground mt-1">Create and manage AP courses available to students</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Add Course
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No courses yet. Click "Add Course" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {courses.map(course => (
            <Card key={course.id} className="border-border/50 overflow-hidden group hover:shadow-lg transition-all">
              <div className="h-1.5 w-full" style={{ backgroundColor: course.color }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-display font-bold text-white shadow-sm"
                    style={{ backgroundColor: course.color }}>
                    {course.icon}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(course)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirm(course)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-display font-bold text-foreground text-sm leading-tight mb-1">{course.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{course.code}</span>
                  <Badge className={course.is_active !== false
                    ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border-0 text-xs"
                    : "bg-muted text-muted-foreground border-0 text-xs"}>
                    {course.is_active !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {course.exam_date && (
                  <p className="text-xs text-muted-foreground mt-2">Exam: {new Date(course.exam_date).toLocaleDateString()}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg space-y-5 p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{editingCourse ? "Edit Course" : "Add New Course"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Course Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. AP Calculus AB" />
              </div>
              <div className="space-y-1.5">
                <Label>Course Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. AP_CALC_AB" />
              </div>
              <div className="space-y-1.5">
                <Label>Exam Date</Label>
                <Input type="date" value={form.exam_date} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief course description" />
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-7 h-7 rounded-lg border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: form.color === c ? "#000" : "transparent" }}>
                    {form.color === c && <Check className="w-3.5 h-3.5 text-white mx-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon picker — text letters (e.g. AB, BC, P1) */}
            <div className="space-y-2">
              <Label>Icon (2 letters)</Label>
              <Input
                value={form.icon}
                maxLength={3}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value.toUpperCase() }))}
                placeholder="e.g. AB"
                className="w-32 font-display font-bold"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ICON_OPTIONS.map(ic => (
                  <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                    className={`w-10 h-9 rounded-lg font-display text-sm font-bold flex items-center justify-center border-2 transition-all ${form.icon === ic ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-display font-bold text-white" style={{ backgroundColor: form.color }}>
                {form.icon}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{form.name || "Course Name"}</p>
                <p className="text-xs text-muted-foreground font-mono">{form.code || "COURSE_CODE"}</p>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.is_active ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? "left-5" : "left-1"}`} />
              </button>
              <Label className="cursor-pointer" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
                {form.is_active ? "Active (visible to students)" : "Inactive (hidden)"}
              </Label>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={save} disabled={saving || !form.name.trim() || !form.code.trim()} className="flex-1">
                {saving ? "Saving…" : editingCourse ? "Save Changes" : "Create Course"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold text-foreground">Delete Course?</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => deleteCourse(deleteConfirm.id)} className="flex-1">Delete</Button>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}