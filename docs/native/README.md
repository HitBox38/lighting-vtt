# Thumbnail native libraries

`convex/lib/vulkanLoader.generated.ts` embeds unmodified ARM64 shared libraries
from official Ubuntu packages. `scripts/package-thumbnail-libraries.mjs` records
exact package URLs and SHA-256 hashes, verifies downloads, extracts only the
selected library and copyright notice, then writes compressed assets with an
additional per-library checksum. Regenerate with Node and bsdtar (`tar` on Windows).

| Library | Package version | Source |
|---|---|---|
| Vulkan loader | 1.3.204.1-2 | [Ubuntu vulkan-loader](https://launchpad.net/ubuntu/+source/vulkan-loader/1.3.204.1-2) |
| libdrm | 2.4.113-2~ubuntu0.22.04.1 | [Ubuntu libdrm](https://launchpad.net/ubuntu/+source/libdrm/2.4.113-2~ubuntu0.22.04.1) |
| zlib | 1.2.11.dfsg-2ubuntu9.2 | [Ubuntu zlib](https://launchpad.net/ubuntu/+source/zlib/1:1.2.11.dfsg-2ubuntu9.2) |
| zstd | 1.4.8+dfsg-3build1 | [Ubuntu libzstd](https://launchpad.net/ubuntu/+source/libzstd/1.4.8+dfsg-3build1) |
| libudev | 249.11-0ubuntu3.22 | [Ubuntu systemd](https://launchpad.net/ubuntu/+source/systemd/249.11-0ubuntu3.22) |

The adjacent `*-copyright.txt` files preserve the packages' notices. Full
Apache-2.0 and LGPL-2.1 texts referenced by those notices are included here.
The libraries are loaded dynamically from temporary files, without modifications;
the source-package links provide the corresponding source and packaging.

Mesa lavapipe is downloaded at runtime from the official
[vgpu release](https://github.com/vercel-labs/vgpu/releases/tag/lavapipe-v25.0.7-vgpu.1),
using vgpu's pinned archive and individual-file integrity checks. Dawn and the
adapter retain their own package licenses in the external Node dependencies.

Reassess these pinned versions and rerun the deployed gate when updating the
renderer or native dependencies; do not silently substitute architecture/builds.
