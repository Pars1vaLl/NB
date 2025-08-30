"use client";

import { useMemo, useState } from "react";

type Preset = "wb" | "ig-portrait" | "ig-square";

const LIB_SCENES = ["/library/scene1.jpg", "/library/scene2.jpg", "/library/scene3.jpg"];
const LIB_MODELS = ["/library/model1.jpg", "/library/model2.jpg", "/library/model3.jpg"];

export default function Generator() {
  const [mode, setMode] = useState<"scene" | "tryon">("scene");
  const [preset, setPreset] = useState<Preset>("wb");

  const [userImg, setUserImg] = useState<string | null>(null);
  const [libImg, setLibImg] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const libGallery = useMemo(() => (mode === "scene" ? LIB_SCENES : LIB_MODELS), [mode]);

  async function fileToDataURL(file: File) {
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
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
        body: JSON.stringify({
          mode,
          userImageBase64: userImg,
          libImageBase64: libImg,
          preset,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(`data:image/jpeg;base64,${data.imageBase64}`);
    } catch (e: any) {
      setErr(e.message || "Ошибка генерации");
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

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-center">
        <button
          className={`px-3 py-2 rounded-xl border ${mode==="scene"?"bg-black text-white":"bg-white"}`}
          onClick={() => setMode("scene")}
        >Scene-Place</button>
        <button
          className={`px-3 py-2 rounded-xl border ${mode==="tryon"?"bg-black text-white":"bg-white"}`}
          onClick={() => setMode("tryon")}
        >Try-On</button>

        <div className="ml-auto flex gap-2">
          <select className="border rounded-xl px-3 py-2" value={preset} onChange={e => setPreset(e.target.value as Preset)}>
            <option value="wb">Wildberries 3:4</option>
            <option value="ig-portrait">Instagram 1080×1350</option>
            <option value="ig-square">Instagram 1080×1080</option>
          </select>
          <button disabled={busy} onClick={onGenerate}
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white disabled:opacity-50">
            {busy ? "Генерация…" : "Сгенерировать"}
          </button>
          {result && <button onClick={download} className="px-4 py-2 rounded-xl border">Скачать</button>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <section className="space-y-2">
          <h2 className="font-medium">1) Фото пользователя</h2>
          <input type="file" accept="image/*" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setUserImg(await fileToDataURL(f));
          }} />
          {userImg && <img src={userImg} className="rounded-xl border" alt="user" />}
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">2) Наш ассет ({mode==="scene"?"фон/локация":"модель/одежда"})</h2>
          <input type="file" accept="image/*" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setLibImg(await fileToDataURL(f));
          }} />
          <div className="grid grid-cols-3 gap-2">
            {libGallery.map((u) => (
              <button key={u} onClick={() => setLibImg(u)} className="border rounded overflow-hidden">
                <img src={u} alt="asset" />
              </button>
            ))}
          </div>
          {libImg && <img src={libImg} className="rounded-xl border" alt="lib" />}
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">3) Результат</h2>
          {err && <p className="text-red-600">{err}</p>}
          {result ? <img src={result} className="rounded-xl border" alt="result" /> :
            <div className="h-64 border rounded-xl grid place-items-center text-neutral-400">
              Рендер появится здесь
            </div>}
        </section>
      </div>

      <p className="text-xs text-neutral-500">
      </p>
    </div>
  );
}
