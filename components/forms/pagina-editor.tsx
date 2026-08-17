"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type ReactQuillType from "react-quill";
import "react-quill/dist/quill.snow.css";

type PaginaEditorProps = {
  value: string;
  onChange: (value: string) => void;
  uploadEndpoint?: string;
  helperText?: string;
};

export function PaginaEditor({
  value,
  onChange,
  uploadEndpoint = "/api/paginas/upload",
  helperText = "Use a barra acima para formatar e inserir imagens de forma profissional."
}: PaginaEditorProps) {
  const editorRef = useRef<ReactQuillType | null>(null);
  const [QuillComponent, setQuillComponent] = useState<React.ComponentType<any> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const [hasImageSelection, setHasImageSelection] = useState(false);
  const [imageWidth, setImageWidth] = useState(100);
  const [imageAlign, setImageAlign] = useState<"left" | "center" | "right">("center");

  useEffect(() => {
    // Carrega o editor apenas no client para evitar problemas com SSR/ref.
    let active = true;
    const load = async () => {
      const mod = await import("react-quill");
      if (!active) return;
      setQuillComponent(() => mod.default);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const syncEditorHtml = () => {
    const html = editorRef.current?.getEditor()?.root.innerHTML;
    if (html !== undefined) onChange(html);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      let response: Response | null = null;
      try {
        response = await fetch(uploadEndpoint, { method: "POST", body: formData });
      } catch (error) {
        setUploadMsg("Falha de rede ao enviar imagem.");
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUploadMsg(data.error ?? "Erro ao enviar imagem.");
        return;
      }
      if (!data.url) {
        setUploadMsg("Resposta de upload sem URL.");
        return;
      }
      // Mantem URL relativa de uploads para funcionar em localhost e acesso por IP na rede.
      const resolvedUrl = toEditorImageUrl(String(data.url));
      try {
        const check = await fetch(new URL(resolvedUrl, window.location.origin).toString(), { method: "GET" });
        if (!check.ok) {
          setUploadMsg(`Imagem enviada, mas nao encontrada (${check.status}).`);
          return;
        }
      } catch {
        setUploadMsg("Falha ao verificar a imagem enviada.");
        return;
      }
      // Insere a imagem no ponto atual do cursor.
      const quill = editorRef.current?.getEditor();
      if (!quill) {
        setUploadMsg("Editor nao inicializado.");
        return;
      }
      quill.focus();
      const range = quill.getSelection(true);
      const insertIndex = range?.index ?? Math.max(0, quill.getLength() - 1);
      quill.insertEmbed(insertIndex, "image", resolvedUrl, "user");
      const [leaf] = quill.getLeaf(insertIndex);
      const node = leaf?.domNode as HTMLElement | undefined;
      if (node?.tagName === "IMG") {
        updateImageStyle(node as HTMLImageElement, 70, "center");
      }
      quill.setSelection(range.index + 1, 0, "silent");
      syncEditorHtml();
    } finally {
      setUploading(false);
    }
  };

  const updateImageStyle = (node: HTMLImageElement, width: number, align: "left" | "center" | "right") => {
    node.style.width = `${width}%`;
    node.style.display = "block";
    if (align === "left") {
      node.style.marginLeft = "0";
      node.style.marginRight = "auto";
    } else if (align === "right") {
      node.style.marginLeft = "auto";
      node.style.marginRight = "0";
    } else {
      node.style.marginLeft = "auto";
      node.style.marginRight = "auto";
    }
    node.setAttribute("data-align", align);
  };

  const syncSelection = (range: { index: number } | null) => {
    // Sincroniza controles quando uma imagem eh selecionada no editor.
    const quill = editorRef.current?.getEditor();
    if (!quill || !range) {
      selectedImageRef.current = null;
      setHasImageSelection(false);
      return;
    }
    const [leaf] = quill.getLeaf(range.index);
    const node = leaf?.domNode as HTMLElement | undefined;
    if (node?.tagName === "IMG") {
      const img = node as HTMLImageElement;
      selectedImageRef.current = img;
      setHasImageSelection(true);
      const width = parseInt(img.style.width || "100", 10);
      setImageWidth(Number.isFinite(width) ? width : 100);
      const align = (img.getAttribute("data-align") as "left" | "center" | "right") || "center";
      setImageAlign(align);
      return;
    }
    selectedImageRef.current = null;
    setHasImageSelection(false);
  };

  const applyImageWidth = (value: number) => {
    const img = selectedImageRef.current;
    if (!img) return;
    const clamped = Math.min(100, Math.max(20, value));
    setImageWidth(clamped);
    updateImageStyle(img, clamped, imageAlign);
    syncEditorHtml();
  };

  const applyImageAlign = (value: "left" | "center" | "right") => {
    const img = selectedImageRef.current;
    if (!img) return;
    setImageAlign(value);
    updateImageStyle(img, imageWidth, value);
    syncEditorHtml();
  };

  const removeSelectedImage = () => {
    const quill = editorRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection();
    if (!range) return;
    const [leaf] = quill.getLeaf(range.index);
    if (!leaf) return;
    const domNode = leaf.domNode as HTMLElement | undefined;
    if (domNode?.tagName === "IMG") {
      const index = quill.getIndex(leaf);
      quill.deleteText(index, 1, "user");
      syncEditorHtml();
    }
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          [{ align: [] }],
          ["link", "image"],
          ["clean"]
        ],
        handlers: { image: openFilePicker }
      },
      imageResize: false
    }),
    []
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "list",
    "bullet",
    "align",
    "link",
    "image"
  ];

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {QuillComponent ? (
        <QuillComponent
          ref={editorRef}
          theme="snow"
          value={value}
          onChange={onChange}
          onChangeSelection={syncSelection}
          modules={modules}
          formats={formats}
          className="pagina-editor"
        />
      ) : (
        <div className="rounded border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
          Carregando editor...
        </div>
      )}
      {hasImageSelection && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="text-xs text-slate-500">Imagem selecionada</div>
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Largura</span>
            <input
              type="range"
              min={20}
              max={100}
              value={imageWidth}
              onChange={(event) => applyImageWidth(Number(event.target.value))}
            />
            <span className="text-slate-500 w-10 text-right">{imageWidth}%</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Alinhamento</span>
            <select
              className="border rounded px-2 py-1 text-xs"
              value={imageAlign}
              onChange={(event) => applyImageAlign(event.target.value as "left" | "center" | "right")}
            >
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </label>
          <button
            type="button"
            onClick={removeSelectedImage}
            className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:border-brand-300"
          >
            Remover imagem
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={openFilePicker}
          className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:border-brand-300"
          disabled={uploading}
        >
          {uploading ? "Enviando imagem..." : "Inserir imagem"}
        </button>
        <button
          type="button"
          onClick={removeSelectedImage}
          className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:border-brand-300"
        >
          Remover imagem
        </button>
        {uploadMsg && <span className="text-xs text-red-600">{uploadMsg}</span>}
      </div>
      <p className="text-xs text-slate-500">Clique no texto antes de inserir a imagem.</p>
      <p className="text-xs text-slate-500">{helperText}</p>
    </div>
  );
}

function toEditorImageUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.pathname.startsWith("/api/uploads/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}
