"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";

type Preset = "wb" | "ig-portrait" | "ig-square";

const LIB_SCENES = ["/library/scene1.jpg", "/library/scene2.jpg", "/library/scene3.jpg"];
const LIB_MODELS = ["/library/model1.jpg", "/library/model2.jpg", "/library/model3.jpg"];

export default function Page() {
  const [mode, setMode] = useState<"scene" | "tryon">("scene");
  const [preset, setPreset] = useState<Preset>("wb");

  const [userImg, setUserImg] = useState<string | null>(null);
  const [libImg, setLibImg] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const userFileRef = useRef<HTMLInputElement>(null);
  const libGallery = useMemo(() => (mode === "scene" ? LIB_SCENES : LIB_MODELS), [mode]);

  async function fileToDataURL(file: File) {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  async function urlToDataURL(u: string) {
    const blob = await fetch(u).then(r => r.blob());
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(blob);
    });
  }

  async function onGenerate() {
    setErr(null);
    setResult(null);
    if (!userImg || !libImg) { setErr("Загрузите оба изображения."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, userImageBase64: userImg, libImageBase64: libImg, preset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(`data:image/jpeg;base64,${data.imageBase64}`);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message || "Ошибка генерации");
      } else {
        setErr("Ошибка генерации");
      }
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `render-${preset}.jpg`;
    a.click();
  }

  // DnD для фото пользователя
  const onUserDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setUserImg(await fileToDataURL(f));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-neutral-100 text-neutral-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-800">MVP: Try-On & Scene-Place</h1>
          <p className="text-neutral-600 max-w-2xl mx-auto">Upload your photo and choose from our asset library to create stunning compositions</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex gap-2">
              <button
                className={`px-6 py-3 rounded-xl font-medium  ${mode === "scene"
                    ? "bg-neutral-900 text-white shadow-lg"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                onClick={() => setMode("scene")}
              >
                Scene-Place
              </button>
              <button
                className={`px-6 py-3 rounded-xl font-medium  ${mode === "tryon"
                    ? "bg-neutral-900 text-white shadow-lg"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                onClick={() => setMode("tryon")}
              >
                Try-On
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto">
              <select
                className="border border-neutral-300 rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                value={preset}
                onChange={e => setPreset(e.target.value as Preset)}
              >
                <option value="wb">Wildberries 3:4</option>
                <option value="ig-portrait">Instagram 1080×1350</option>
                <option value="ig-square">Instagram 1080×1080</option>
              </select>
              <button
                disabled={busy}
                onClick={onGenerate}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed  shadow-lg hover:shadow-xl"
              >
                {busy ? "Генерация…" : "Сгенерировать"}
              </button>
              {result && (
                <button
                  onClick={download}
                  className="px-6 py-3 rounded-xl border-2 border-neutral-300 text-neutral-700 font-medium hover:border-neutral-400 hover:bg-neutral-50 "
                >
                  Скачать
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 1) Фото пользователя */}
          <section className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">1</div>
              <h2 className="text-lg font-semibold text-neutral-800">Фото пользователя</h2>
            </div>

            <input
              ref={userFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setUserImg(await fileToDataURL(f));
              }}
            />

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-3 rounded-xl border-2 border-neutral-300 bg-white text-neutral-700 font-medium hover:border-blue-500 hover:bg-blue-50 "
                onClick={() => userFileRef.current?.click()}
              >
                📁 Загрузить фото
              </button>
              {userImg && (
                <button
                  className="px-4 py-3 rounded-xl border-2 border-red-300 text-red-600 font-medium hover:bg-red-50 "
                  onClick={() => setUserImg(null)}
                >
                  🗑️
                </button>
              )}
            </div>

            {!userImg ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onUserDrop}
                className="h-64 border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center text-neutral-500 hover:border-blue-400 hover:bg-blue-50/30  cursor-pointer"
                title="Перетащите файл сюда"
                onClick={() => userFileRef.current?.click()}
              >
                <div className="text-4xl mb-3">📸</div>
                <p className="text-center text-sm font-medium">Перетащите фото сюда</p>
                <p className="text-center text-xs text-neutral-400 mt-1">или нажмите для выбора файла</p>
              </div>
            ) : (
              <div className="relative">
                <Image
                  src={userImg}
                  className="rounded-2xl border-2 border-neutral-200 w-full h-auto max-h-64 object-contain bg-neutral-50"
                  alt="user"
                  width={400}
                  height={400}
                />
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => setUserImg(null)}
                    className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm hover:bg-red-600 "
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 2) Наш ассет */}
          <section className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold text-sm">2</div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-800">Наш ассет</h2>
                <p className="text-sm text-neutral-500">({mode === "scene" ? "фон/локация" : "модель/одежда"})</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-neutral-600">
                <span>Choose File</span>
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 file:cursor-pointer"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setLibImg(await fileToDataURL(f));
                  }}
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-700">no file selected</p>
                <div className="grid grid-cols-3 gap-3">
                  {libGallery.map((u) => (
                    <button
                      key={u}
                      onClick={async () => setLibImg(await urlToDataURL(u))}
                      className="aspect-square border-2 border-neutral-200 rounded-xl overflow-hidden hover:border-emerald-400 hover:shadow-lg"
                      title="Использовать этот ассет"
                    >
                      <Image
                        src={u}
                        alt="asset"
                        width={120}
                        height={120}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {libImg && (
                <div className="relative">
                  <Image
                    src={libImg}
                    className="rounded-2xl border-2 border-neutral-200 w-full h-auto max-h-64 object-contain bg-neutral-50"
                    alt="lib"
                    width={400}
                    height={400}
                  />
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => setLibImg(null)}
                      className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm hover:bg-red-600 "
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 3) Результат */}
          <section className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center font-semibold text-sm">3</div>
              <h2 className="text-lg font-semibold text-neutral-800">Результат</h2>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 font-medium flex items-center gap-2">
                  <span className="text-red-500">⚠️</span>
                  {err}
                </p>
              </div>
            )}

            {result ? (
              <div className="space-y-4">
                <Image
                  src={result}
                  className="rounded-2xl border-2 border-neutral-200 w-full h-auto max-h-96 object-contain bg-neutral-50 shadow-lg"
                  alt="result"
                  width={400}
                  height={400}
                />
                <button
                  onClick={download}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium hover:from-emerald-600 hover:to-green-700  shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  📥 Скачать результат
                </button>
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center text-neutral-500 bg-neutral-50/50">
                <div className="text-4xl mb-3">🎨</div>
                <p className="text-center font-medium">Рендер появится здесь</p>
                <p className="text-center text-sm text-neutral-400 mt-1">Загрузите изображения и нажмите &quot;Сгенерировать&quot;</p>
              </div>
            )}
          </section>
        </div>

        <div className="bg-neutral-800 rounded-2xl p-6 text-neutral-300">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Инструкция</h3>
              <p className="text-sm leading-relaxed">
                Положи демо-картинки в <code className="bg-neutral-700 px-2 py-1 rounded text-neutral-200">/public/library</code>
                (например, <code className="bg-neutral-700 px-2 py-1 rounded text-neutral-200">/library/scene1.jpg</code>,
                <code className="bg-neutral-700 px-2 py-1 rounded text-neutral-200">/library/model1.jpg</code>).
                Клик по миниатюре автоматически готовит base64 для API; фото пользователя можно загрузить кнопкой или перетащить.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
