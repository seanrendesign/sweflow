import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

const FILE =
  "/cursor/stores/bc-065ffd2c-4dc7-4151-8ce2-f9beab695deb/media/sweflow-product-walkthrough.mp4";

export async function GET() {
  const info = await stat(FILE);
  const stream = createReadStream(FILE);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(info.size),
      "Content-Disposition":
        'attachment; filename="sweflow-product-walkthrough.mp4"',
    },
  });
}
