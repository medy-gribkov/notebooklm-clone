"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Note } from "@/types";

interface NoteEditorProps {
  note: Note;
  notebookId: string;
  onBack: () => void;
  onUpdate: (note: Note) => void;
  onDelete: (noteId: string) => void;
}

export function NoteEditor({ note, notebookId, onBack, onUpdate, onDelete }: NoteEditorProps) {
  const t = useTranslations("studio");
  const tc = useTranslations("common");
  const [title, setTitle] = useState(note.title);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t("notePlaceholder") }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
    onUpdate: ({ editor: ed }) => {
      debounceSave(title, ed.getHTML());
    },
  });

  const save = useCallback(async (newTitle: string, newContent: string) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        setSaved(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }, [notebookId, note.id, onUpdate]);

  const debounceSave = useCallback((newTitle: string, newContent: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(newTitle, newContent), 2000);
  }, [save]);

  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    if (editor) {
      debounceSave(newTitle, editor.getHTML());
    }
  }

  // Flush any pending debounce and save immediately
  async function flushAndSave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (editor) {
      await save(title, editor.getHTML());
    }
  }

  // Explicit save button handler
  async function handleSaveClick() {
    await flushAndSave();
  }

  // Back: await save completion before navigating
  async function handleBack() {
    await flushAndSave();
    onBack();
  }

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/notes/${note.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDelete(note.id);
        onBack();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {tc("back")}
        </button>
        <span className="text-xs text-muted-foreground">{t("title")} &rsaquo; {t("noteLabel")}</span>
        <div className="flex-1" />

        {/* Save status */}
        {saving && <span className="text-[10px] text-muted-foreground">{t("saving")}</span>}
        {saved && !saving && (
          <span className="text-[10px] text-emerald-500 flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {tc("saved")}
          </span>
        )}

        {/* Save button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveClick}
          disabled={saving}
          className="h-7 text-xs"
        >
          {tc("save")}
        </Button>

        {/* Delete with confirmation */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={deleting}
              className="h-7 text-xs text-destructive hover:text-destructive"
            >
              {deleting ? tc("loading") : tc("delete")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tc("confirmDelete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteNoteConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {tc("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Title input */}
      <div className="px-4 pt-4 pb-1 shrink-0">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onBlur={() => flushAndSave()}
          className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
          placeholder={t("noteTitle")}
        />
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-b shrink-0">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
          >
            <span className="font-bold text-xs">B</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
          >
            <span className="italic text-xs">I</span>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="Bullet list"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="Numbered list"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h8" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            label="Heading"
          >
            <span className="text-xs font-semibold">H</span>
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
