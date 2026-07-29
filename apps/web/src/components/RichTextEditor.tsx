/**
 * RichTextEditor — Jira-style rich text editor built on Tiptap v2.
 *
 * Supported formatting (mirrors Jira's toolbar)
 * ----------------------------------------------
 * Text styles : Bold, Italic, Underline, Strikethrough, Inline Code
 * Headings    : H1, H2, H3
 * Lists       : Bullet list, Ordered list, Task list (checkboxes)
 * Blocks      : Blockquote, Code block (with language label)
 * Inserts     : Horizontal rule, Link (with href input)
 * Table       : Insert 2×3 table; add/remove rows & columns
 * History     : Undo, Redo
 * Limit       : 10 000 characters via CharacterCount extension
 *
 * Props
 * -----
 * value    : string  — current HTML content (controlled)
 * onChange : (html: string) => void
 * placeholder : string (optional)
 * readOnly    : boolean (optional) — renders as read-only viewer
 *
 * Output format
 * -------------
 * editor.getHTML() — sanitised by DOMPurify before being sent to the API.
 */
import React, { useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import DOMPurify from 'dompurify';

const MAX_CHARS = 10_000;

// ---------------------------------------------------------------------------
// Toolbar button helper
// ---------------------------------------------------------------------------
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick, active, disabled, title, children,
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className={[
      'px-2 py-1 rounded text-sm transition-colors select-none',
      active
        ? 'bg-sky-500/20 text-sky-400'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white',
      disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
    ].join(' ')}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Добавьте описание задачи…',
  readOnly = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'bg-slate-800 rounded p-3 text-sm font-mono text-sky-300' } },
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-sky-500 pl-4 text-slate-300 italic' } },
      }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-sky-400 underline' } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount.configure({ limit: MAX_CHARS }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = DOMPurify.sanitize(editor.getHTML(), {
        ALLOWED_TAGS: [
          'p','br','strong','em','u','s','code','pre','h1','h2','h3',
          'ul','ol','li','blockquote','a','hr','table','thead','tbody',
          'tr','th','td','input',
        ],
        ALLOWED_ATTR: ['href','target','rel','type','checked','data-type'],
      });
      onChange(html);
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL ссылки', prev ?? '');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const chars = editor.storage.characterCount.characters();
  const charsLeft = MAX_CHARS - chars;
  const charsWarning = charsLeft < 200;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 overflow-hidden focus-within:border-sky-500 transition-colors">
      {/* ------------------------------------------------------------------ */}
      {/* Toolbar                                                             */}
      {/* ------------------------------------------------------------------ */}
      {!readOnly && (
        <div className="flex flex-wrap gap-0.5 p-2 border-b border-slate-700 bg-slate-800/60">
          {/* History */}
          <ToolbarButton title="Отменить (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>↩</ToolbarButton>
          <ToolbarButton title="Повторить (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>↪</ToolbarButton>

          <span className="w-px bg-slate-700 mx-1" />

          {/* Text styles */}
          <ToolbarButton title="Жирный (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
          <ToolbarButton title="Курсив (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolbarButton>
          <ToolbarButton title="Подчёркнутый (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarButton>
          <ToolbarButton title="Зачёркнутый" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolbarButton>
          <ToolbarButton title="Код (Ctrl+E)" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>{'{}'}</ToolbarButton>

          <span className="w-px bg-slate-700 mx-1" />

          {/* Headings */}
          <ToolbarButton title="Заголовок 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarButton>
          <ToolbarButton title="Заголовок 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
          <ToolbarButton title="Заголовок 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>

          <span className="w-px bg-slate-700 mx-1" />

          {/* Lists */}
          <ToolbarButton title="Маркированный список" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• —</ToolbarButton>
          <ToolbarButton title="Нумерованный список" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolbarButton>
          <ToolbarButton title="Список задач" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>☑</ToolbarButton>

          <span className="w-px bg-slate-700 mx-1" />

          {/* Blocks */}
          <ToolbarButton title="Цитата" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolbarButton>
          <ToolbarButton title="Блок кода" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>&lt;/&gt;</ToolbarButton>
          <ToolbarButton title="Горизонтальная линия" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</ToolbarButton>

          <span className="w-px bg-slate-700 mx-1" />

          {/* Link & Table */}
          <ToolbarButton title="Ссылка" active={editor.isActive('link')} onClick={setLink}>🔗</ToolbarButton>
          <ToolbarButton
            title="Вставить таблицу"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >⊞</ToolbarButton>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Bubble menu — appears on text selection                             */}
      {/* ------------------------------------------------------------------ */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex gap-0.5 rounded-lg border border-slate-600 bg-slate-800 p-1 shadow-xl">
          <ToolbarButton title="Жирный" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></ToolbarButton>
          <ToolbarButton title="Курсив" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolbarButton>
          <ToolbarButton title="Ссылка" active={editor.isActive('link')} onClick={setLink}>🔗</ToolbarButton>
        </div>
      </BubbleMenu>

      {/* ------------------------------------------------------------------ */}
      {/* Editor area                                                         */}
      {/* ------------------------------------------------------------------ */}
      <EditorContent
        editor={editor}
        className={[
          'prose prose-invert prose-sm max-w-none',
          'px-4 py-3 min-h-[160px] text-slate-200',
          '[&_.ProseMirror]:outline-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-500',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:gap-2',
        ].join(' ')}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Character counter                                                   */}
      {/* ------------------------------------------------------------------ */}
      {!readOnly && (
        <div className={`px-3 py-1 text-xs text-right border-t border-slate-700 ${charsWarning ? 'text-amber-400' : 'text-slate-500'}`}>
          {chars} / {MAX_CHARS}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
