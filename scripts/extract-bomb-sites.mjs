#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const metadata = JSON.parse(readFileSync(join(projectRoot, "dist/data/map-metadata.json"), "utf8"));
const requested = process.argv.slice(2);
const maps = requested.length && !requested.includes("--all")
  ? metadata.maps.filter(map => requested.includes(map.id))
  : metadata.maps;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const workDir = mkdtempSync(join(tmpdir(), "squadbook-sites-"));
const results = {};

// Familiar in-game callouts are clearer than a geometric nearest-label match.
// Keys use the stable floor/site number emitted by the source blueprint.
const labelOverrides = {
  bank: {
    "1-2": ["Open Area", "Staff Room"],
    "1-3": ["Tellers", "Archives"],
    "2-1": ["CEO Office", "Executive Lounge"]
  },
  border: { "2-4": ["Armory", "Archives"] },
  club: {
    "0-4": ["Church", "Arsenal"],
    "2-1": ["Gym", "Bedroom"],
    "2-2": ["CCTV", "Cash"]
  },
  coastline: {
    "1-3": ["Kitchen", "Service Entrance"],
    "1-4": ["Blue Bar", "Sunrise Bar"],
    "2-1": ["Billiards", "Hookah Lounge"],
    "2-2": ["Penthouse", "Theater"]
  },
  consulate: {
    "0-4": ["Cafeteria", "Garage"],
    "1-2": ["Exposition", "Piano"],
    "2-1": ["Consul Office", "Meeting"]
  },
  oregon: {
    "1-2": ["Kitchen", "Dining"],
    "1-3": ["Meeting Hall", "Kitchen"],
    "2-1": ["Kids Dorms", "Dorms Main Hall"]
  }
};

const extractor = String.raw`
  <script type="application/ecmascript"><![CDATA[
    addEventListener("load", () => {
      const svg = document.documentElement;
      const center = element => {
        const box = element.getBBox();
        const matrix = element.getCTM();
        const point = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(matrix);
        return { x: point.x, y: point.y };
      };
      const floors = [...svg.querySelectorAll(":scope > g[id^='Floor ']")].map(floorGroup => {
        floorGroup.style.display = "inline";
        const floor = Number(floorGroup.id.replace("Floor ", ""));
        const bombLayer = floorGroup.querySelector("[id='" + floor + "-bmb']");
        const textLayer = floorGroup.querySelector("[id='" + floor + "-txt']");
        if (!bombLayer || !textLayer) return { floor, sites: [] };
        bombLayer.style.display = "inline";
        textLayer.style.display = "inline";
        const rooms = [...textLayer.querySelectorAll("text")]
          .map(element => ({ element, name: element.textContent.trim().replace(/\s+/g, " ") }))
          .filter(room => room.name && !/^\d+[AB]$/.test(room.name))
          .filter(room => !/(Hallway|Corridor|Stairs|Roof|Balcony|Catwalk)$/i.test(room.name))
          .map(room => ({ name: room.name, ...center(room.element) }));
        const bombs = [...bombLayer.querySelectorAll("[id^='bomb-']")]
          .map(element => ({ element, marker: element.id.replace("bomb-", "") }))
          .filter(bomb => /^\d+[AB]$/.test(bomb.marker))
          .map(bomb => {
            const point = center(bomb.element);
            const candidates = rooms.map(room => ({ name: room.name, distance: Math.hypot(room.x - point.x, room.y - point.y) })).sort((a, b) => a.distance - b.distance).slice(0, 8);
            return { marker: bomb.marker, candidates };
          });
        const groups = {};
        for (const bomb of bombs) (groups[bomb.marker.slice(0, -1)] ||= []).push(bomb);
        const sites = Object.entries(groups)
          .filter(([, group]) => group.length >= 2)
          .map(([number, group]) => {
            const pair = group.sort((a, b) => a.marker.localeCompare(b.marker)).slice(0, 2);
            let best = null;
            for (const first of pair[0].candidates) {
              for (const second of pair[1].candidates) {
                if (first.name === second.name) continue;
                const score = first.distance + second.distance;
                if (!best || score < best.score) best = { score, rooms: [first.name, second.name] };
              }
            }
            return { number, rooms: best?.rooms || pair.map(bomb => bomb.candidates[0]?.name || "Unknown") };
          });
        return { floor, sites };
      });
      const encoded = encodeURIComponent(JSON.stringify(floors));
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute("data-result", encoded);
    });
  ]]></script>
`;

try {
  for (const map of maps) {
    const sourcePath = join(workDir, `${map.id}.svg`);
    const instrumentedPath = join(workDir, `${map.id}-instrumented.svg`);
    execFileSync("curl", ["--fail", "--location", "--retry", "3", "--max-time", "180", "--silent", "--show-error", "--output", sourcePath, `https://www.r6calls.com/img/maps/${map.id}.svg`]);
    const source = readFileSync(sourcePath, "utf8");
    writeFileSync(instrumentedPath, source.replace(/<\/svg>\s*$/i, `${extractor}</svg>`));
    const dumped = execFileSync(chrome, ["--headless=new", "--disable-gpu", "--allow-file-access-from-files", "--virtual-time-budget=2500", "--dump-dom", `file://${instrumentedPath}`], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
    const encoded = dumped.match(/data-result="([^"]+)"/)?.[1];
    if (!encoded) throw new Error(`${map.name}: extraction failed`);
    results[map.id] = JSON.parse(decodeURIComponent(encoded.replaceAll("&amp;", "&")));
    process.stdout.write(`${map.name}: ${results[map.id].reduce((sum, floor) => sum + floor.sites.length, 0)} sites\n`);
  }
  const compact = {};
  for (const map of metadata.maps) {
    const extracted = results[map.id];
    if (!extracted) continue;
    compact[map.id] = extracted.flatMap(({ floor, sites }) => sites.map(site => {
      const rooms = labelOverrides[map.id]?.[`${floor}-${site.number}`] || site.rooms;
      return {
        id: `${floor}-${site.number}`,
        label: `${floor === -1 ? "SB" : floor === 0 ? "B" : `${floor}F`} ${rooms.join(" / ")}`,
        floor,
        rooms
      };
    }));
  }
  writeFileSync(join(projectRoot, "dist/data/bomb-sites.json"), `${JSON.stringify(compact, null, 2)}\n`);
  process.stdout.write(`Saved ${Object.values(compact).reduce((sum, sites) => sum + sites.length, 0)} bomb sites to dist/data/bomb-sites.json\n`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
