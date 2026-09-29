# Particle Studio

A frontend-only particle scene editor. Design animated text and image formations, tune their look and motion, build a sequence, then export one standalone HTML file.

## Run it locally

Install dependencies with npm install, then start the development server with npm run dev.

Build the static site with npm run build. The output in dist/ can be hosted on any static host. There is no API server, database, or runtime service.

## Make a scene

- **Text:** type up to three lines, pick a serif, sans, or mono face, and toggle italics.
- **Image:** drop in a PNG, JPG, SVG, or WebP. The editor samples its visible pixels into a particle target and can preserve their colors. The image is held in browser storage and embedded into the export.
- **Forms:** choose from a liquid core, spiral galaxy, heart, orbitals, waveform, supernova, or scatter cloud.
- **Sequence:** add shapes as scene cues, select cues to edit them, then play the sequence or loop it.
- **Look:** edit three palette colors, choose a palette, set the background, particle size, glow, intensity, and star field.
- **Motion:** tune assembly time, flow turbulence, ambient movement, pointer repulsion, and film grain.
- **Quality:** choose 20k, 37k, or 65k particles. The internal canvas resolution adapts to frame time and is capped at 1.6 megapixels.

The current project saves to local storage. Use the project menu to download editable .particle.json files or open one again.

## Export

Export code creates a self-contained HTML page with the shader source, project settings, scene cues, and any uploaded image data inline. It has Reform and Play sequence controls and can be opened from disk or deployed as a static file. No npm install or server is required for the exported scene.

Before offering the download, the editor checks that the embedded engine and browser entry script parse and that the renderer and image-target builder are included. The live editor and exported file use the same renderer source.

## Rendering model

The renderer uses WebGL 2 and no rendering framework:

- Text, image, and procedural targets are packed into nearest-filtered floating-point textures.
- Position and velocity live in ping-pong GPU buffers. A transform-feedback pass integrates target springs, damped curl forces, agitation, and cursor repulsion without a CPU loop over particles.
- One points draw renders every particle. A fullscreen triangle draws the procedural backdrop. Particle motion and sizing are independent of the editor's React render cycle.
- Canvas backing resolution adapts to recent frame time, caps device pixel ratio at 2, and limits the internal image to 1.6 megapixels.
- The three quality levels use 144², 192², and 256² particles. Lower particle counts receive intensity normalization.

The browser preview displays live frame-rate and internal-resolution estimates. Headless software renderers are useful for checking that shaders, targets, and exports work; their frame times do not represent an integrated GPU.

## Browser support

The editor and exported scenes need a browser with WebGL 2. Uploaded image pixels are processed locally. Project files and image data stay in the browser unless you choose to download or publish an export.

## License

MIT
