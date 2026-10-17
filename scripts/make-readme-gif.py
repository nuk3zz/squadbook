"""Encode actual browser captures into the README walkthrough (requires Pillow)."""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--frames', type=Path, default=root / 'work/readme-demo/frames')
parser.add_argument('--output', type=Path, default=root / 'docs/media/walkthrough.gif')
args = parser.parse_args()
steps = [
    ('01-map.png', 'Choose a map', 2400),
    ('02-site.png', 'Filter the bomb site', 2200),
    ('03-plan.png', 'Review the visual plan', 3000),
    ('04-blueprint.png', 'Open the floor blueprint', 2600),
]

def font(size, bold=False):
    names = ['C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',
             '/System/Library/Fonts/Supplemental/Arial.ttf',
             '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
    for name in names:
        if Path(name).is_file():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default(size=size)

frames = []
capture_size = None
for index, (filename, title, _) in enumerate(steps):
    with Image.open(args.frames / filename) as screenshot:
        screenshot = screenshot.convert('RGB')
    capture_size = capture_size or screenshot.size
    # Some browser captures omit the scrollbar or apply a small device scale.
    # Fit without stretching so every GIF frame shares a stable canvas.
    screenshot = ImageOps.pad(screenshot, capture_size, method=Image.Resampling.LANCZOS,
                              color='#0b0d10')
    canvas = Image.new('RGB', (screenshot.width, screenshot.height + 62), '#0b0d10')
    canvas.paste(screenshot, (0, 62))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 7), title, fill='#e8ff52', font=font(19, bold=True))
    draw.text((12, 33), 'SQUADBOOK  /  LOCAL DEMO', fill='#a5adb8', font=font(11))
    draw.text((canvas.width - 48, 15), f'{index + 1} / 4', fill='#a5adb8', font=font(12))
    draw.line((0, 61, canvas.width, 61), fill='#30363e')
    frames.append(canvas)

assert len({frame.size for frame in frames}) == 1, 'Capture every step at the same viewport size.'
contact = Image.new('RGB', (frames[0].width * len(frames), frames[0].height))
for index, frame in enumerate(frames):
    contact.paste(frame, (index * frame.width, 0))
palette = contact.quantize(colors=256)
encoded = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
args.output.parent.mkdir(parents=True, exist_ok=True)
encoded[0].save(args.output, save_all=True, append_images=encoded[1:], loop=0,
                duration=[step[2] for step in steps], disposal=2, optimize=True)
with Image.open(args.output) as result:
    assert result.n_frames == 4
    assert result.info['loop'] == 0
print(f'Wrote {args.output}: {len(frames)} steps, {args.output.stat().st_size:,} bytes')
