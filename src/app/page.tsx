import fs from "fs";
import path from "path";
import Generator from "./components/Generator";

export default function Page() {
  const scenesDir = path.join(process.cwd(), "public", "library");
  const sceneFiles = fs.readdirSync(scenesDir);
  const scenes = sceneFiles.map((file) => `/library/${file}`);

  return <Generator scenes={scenes} />;
}