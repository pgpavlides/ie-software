import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {
  FiBold,
  FiItalic,
  FiCode,
  FiList,
  FiAlignLeft,
  FiMinus,
  FiCornerDownLeft,
  FiImage,
} from 'react-icons/fi';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  toolbarPosition?: 'internal' | 'external';
  externalToolbarRef?: React.MutableRefObject<Editor | null>;
  onImageUpload?: (file: File) => Promise<string | null>;
}

// Image upload handler ref for toolbar access
let globalImageUploadHandler: ((file: File) => Promise<string | null>) | null = null;

// Toolbar Button Component
const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}> = ({ onClick, active, disabled, title, children, size = 'md' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`${size === 'sm' ? 'p-1.5' : 'p-2.5'} rounded-lg transition-all duration-200 ${
      active
        ? 'bg-[#ea2127] text-white shadow-lg shadow-[#ea2127]/20'
        : 'text-[#8b8b9a] hover:text-white hover:bg-[#2a2a35]'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

// Divider Component
const ToolbarDivider = () => (
  <div className="w-px h-7 bg-[#2a2a35] mx-2" />
);

// Exportable Toolbar Component
export const TiptapToolbar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setHeading = useCallback(
    (level: 1 | 2 | 3) => {
      editor?.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    if (globalImageUploadHandler) {
      const url = await globalImageUploadHandler(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-[#141418] border-b border-[#2a2a35] flex-wrap">
      {/* Text Formatting Group */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-[#1a1a23] rounded-lg">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <FiBold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <FiItalic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span className="text-sm font-medium line-through">S</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        >
          <FiCode className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Headings Group */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-[#1a1a23] rounded-lg">
        <ToolbarButton
          onClick={() => setHeading(1)}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <span className="text-sm font-bold">H1</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setHeading(2)}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <span className="text-sm font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setHeading(3)}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <span className="text-sm font-bold">H3</span>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Paragraph & Lists Group */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-[#1a1a23] rounded-lg">
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph') && !editor.isActive('heading')}
          title="Paragraph"
        >
          <FiAlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <FiList className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <span className="text-sm font-medium">1.</span>
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Block Elements Group */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-[#1a1a23] rounded-lg">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <span className="text-lg font-serif leading-none">"</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <span className="text-xs font-mono">{'{ }'}</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <FiMinus className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHardBreak().run()}
          title="Line Break"
        >
          <FiCornerDownLeft className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Media Group */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-[#1a1a23] rounded-lg">
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
          disabled={!globalImageUploadHandler}
        >
          <FiImage className="w-4 h-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder: _placeholder = 'Start writing...',
  minHeight = '300px',
  toolbarPosition = 'internal',
  externalToolbarRef,
  onImageUpload,
}) => {
  void _placeholder; // Reserved for future Placeholder extension
  // Register global image upload handler
  useEffect(() => {
    globalImageUploadHandler = onImageUpload || null;
    return () => {
      globalImageUploadHandler = null;
    };
  }, [onImageUpload]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Expose editor to parent via ref
  useEffect(() => {
    if (externalToolbarRef) {
      externalToolbarRef.current = editor;
    }
  }, [editor, externalToolbarRef]);

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div
        className="bg-[#0f0f12] border border-[#2a2a35] rounded-xl overflow-hidden animate-pulse"
        style={{ minHeight }}
      >
        {toolbarPosition === 'internal' && (
          <div className="h-14 bg-[#141418] border-b border-[#2a2a35]" />
        )}
        <div className="p-6">
          <div className="h-4 bg-[#2a2a35] rounded w-3/4 mb-3" />
          <div className="h-4 bg-[#2a2a35] rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f0f12] border border-[#2a2a35] rounded-xl overflow-hidden focus-within:border-[#ea2127]/30 transition-colors">
      {/* Internal Toolbar (when not using external) */}
      {toolbarPosition === 'internal' && <TiptapToolbar editor={editor} />}

      {/* Bubble Menu for quick formatting on selection */}
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 px-2 py-1.5 bg-[#1a1a23] border border-[#2a2a35] rounded-xl shadow-xl"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
          size="sm"
        >
          <FiBold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
          size="sm"
        >
          <FiItalic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
          size="sm"
        >
          <span className="text-xs font-medium line-through">S</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Code"
          size="sm"
        >
          <FiCode className="w-3.5 h-3.5" />
        </ToolbarButton>
      </BubbleMenu>

      {/* Editor Content */}
      <div className="px-6 py-4 text-white">
        <EditorContent editor={editor} />
      </div>

      {/* Editor Styles */}
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: ${minHeight};
        }

        .ProseMirror p {
          margin: 0.5em 0;
          color: #ffffff;
        }

        .ProseMirror h1 {
          font-size: 2em;
          font-weight: 700;
          margin: 0.75em 0 0.5em;
          color: #ffffff;
        }

        .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.75em 0 0.5em;
          color: #ffffff;
        }

        .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 0.75em 0 0.5em;
          color: #ffffff;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror li {
          margin: 0.25em 0;
          color: #ffffff;
        }

        .ProseMirror blockquote {
          border-left: 3px solid #ea2127;
          padding-left: 1em;
          margin: 1em 0;
          color: #8b8b9a;
          font-style: italic;
        }

        .ProseMirror code {
          background: #2a2a35;
          color: #ea2127;
          padding: 0.15em 0.4em;
          border-radius: 0.25em;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.9em;
        }

        .ProseMirror pre {
          background: #141418;
          border: 1px solid #2a2a35;
          border-radius: 0.5em;
          padding: 1em;
          margin: 1em 0;
          overflow-x: auto;
        }

        .ProseMirror pre code {
          background: none;
          color: #e0e0e0;
          padding: 0;
          border-radius: 0;
        }

        .ProseMirror hr {
          border: none;
          border-top: 1px solid #2a2a35;
          margin: 1.5em 0;
        }

        .ProseMirror s {
          text-decoration: line-through;
          color: #6b6b7a;
        }

        .ProseMirror strong {
          font-weight: 700;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #5a5a68;
          float: left;
          height: 0;
          pointer-events: none;
        }

        .ProseMirror img.editor-image {
          max-width: 100%;
          height: auto;
          border-radius: 0.5em;
          margin: 1em 0;
          display: block;
        }

        .ProseMirror img.editor-image.ProseMirror-selectednode {
          outline: 2px solid #ea2127;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default TiptapEditor;
