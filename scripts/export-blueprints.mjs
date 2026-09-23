#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const metadata = JSON.parse(readFileSync(join(projectRoot, "dist/data/map-metadata.json"), "utf8"));
const maps = metadata.maps;
const requested = process.argv.slice(2);
const selectedMaps = requested.length && !requested.includes("--all")
  ? maps.filter(map => requested.includes(map.id))
  : maps;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputRoot = join(projectRoot, "dist/assets/blueprints");
const workDir = mkdtempSync(join(tmpdir(), "squadbook-blueprints-"));

function attr(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1];
}

function prepareFloorSvg(source, floor) {
  const floorGroup = source.match(new RegExp(`<g[^>]+id=["']Floor\\s+${floor}["'][^>]*>`, "i"))?.[0];
  const imageTag = source.match(new RegExp(`<image[^>]+id=["']${floor}-pic["'][^>]*>`, "i"))?.[0];
  if (!floorGroup || !imageTag) {
    if (/id=["']Floor\s+-?\d+["']/i.test(source)) throw new Error(`Floor ${floor} artwork was not found`);
    return source.replace(/<svg\b([^>]*)>/i, (_, attributes) => {
      const clean = attributes.replace(/\s(?:width|height)=["'][^"']*["']/gi, "");
      return `<svg${clean} width="800" height="800" preserveAspectRatio="xMidYMid meet">`;
    });
  }

  const x = Number(attr(imageTag, "x"));
  const y = Number(attr(imageTag, "y"));
  const width = Number(attr(imageTag, "width"));
  const height = Number(attr(imageTag, "height"));
  const transform = attr(floorGroup, "transform") || "";
  const translate = transform.match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)\s*\)/i);
  const offsetX = Number(translate?.[1] || 0);
  const offsetY = Number(translate?.[2] || 0);
  const margin = Math.max(width, height) * 0.035;
  const viewBox = [x + offsetX - margin, y + offsetY - margin, width + margin * 2, height + margin * 2].join(" ");
  const floorCss = `<style>g[id^="Floor "]{display:none!important}g[id="Floor ${floor}"]{display:inline!important}#stratElements,#cursor,#marker{display:none!important}</style>`;

  return source
    .replace(/<svg\b([^>]*)>/i, (_, attributes) => {
      const clean = attributes
        .replace(/\s(?:width|height|viewBox|preserveAspectRatio)=["'][^"']*["']/gi, "");
      return `<svg${clean} width="800" height="800" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">`;
    })
    .replace(/<\/svg>\s*$/i, `${floorCss}</svg>`);
}

try {
  mkdirSync(outputRoot, { recursive: true });
  for (const map of selectedMaps) {
    const floors = Array.from(
      { length: map.maxFloorNumber - map.minFloorNumber + 1 },
      (_, index) => map.minFloorNumber + index
    );
    const mapOutput = join(outputRoot, map.id);
    if (floors.every(floor => existsSync(join(mapOutput, `${floor}.jpg`)))) {
      process.stdout.write(`Skipping ${map.name}; already exported\n`);
      continue;
    }
    process.stdout.write(`Downloading ${map.name}... `);
    const sourcePath = join(workDir, `${map.id}-source.svg`);
    execFileSync("curl", [
      "--fail",
      "--location",
      "--retry", "3",
      "--max-time", "180",
      "--silent",
      "--show-error",
      "--output", sourcePath,
      `https://www.r6calls.com/img/maps/${map.id}.svg`
    ]);
    const source = readFileSync(sourcePath, "utf8");
    mkdirSync(mapOutput, { recursive: true });

    for (const floor of floors) {
      try {
        const svgPath = join(workDir, `${map.id}-${floor}.svg`);
        const pngPath = join(workDir, `${map.id}-${floor}.png`);
        const jpgPath = join(mapOutput, `${floor}.jpg`);
        writeFileSync(svgPath, prepareFloorSvg(source, floor));
        execFileSync(chrome, [
          "--headless=new",
          "--disable-gpu",
          "--hide-scrollbars",
          "--allow-file-access-from-files",
          `--screenshot=${pngPath}`,
          "--window-size=800,800",
          `file://${svgPath}`
        ], { stdio: "ignore" });
        execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "70", pngPath, "--out", jpgPath], { stdio: "ignore" });
        rmSync(svgPath, { force: true });
        rmSync(pngPath, { force: true });
        process.stdout.write(`${floor} `);
      } catch (error) {
        process.stdout.write(`${floor}(unavailable) `);
      }
    }
    rmSync(sourcePath, { force: true });
    process.stdout.write("done\n");
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
