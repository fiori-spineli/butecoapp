import "server-only";

import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

let storageClient: S3Client | undefined;

function configuracao() {
  const endpoint = process.env.R2_ENDPOINT_URL;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicDomain) {
    throw new Error("Cloudflare R2 não está configurado.");
  }
  const publicUrl = new URL(publicDomain.startsWith("http") ? publicDomain : `https://${publicDomain}`);
  if (publicUrl.protocol !== "https:") throw new Error("R2_PUBLIC_DOMAIN deve usar HTTPS.");
  storageClient ??= new S3Client({
    endpoint,
    region: "auto",
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return { client: storageClient, bucket, publicUrl };
}

export function chaveDaImagem(url: string | null | undefined, pasta: "produtos" | "logos", barId: string) {
  if (!url) return null;
  try {
    const { publicUrl } = configuracao();
    const parsed = new URL(url);
    const prefix = `${publicUrl.pathname.replace(/\/$/, "")}/${pasta}/${barId}/`;
    if (parsed.origin !== publicUrl.origin || !parsed.pathname.startsWith(prefix) ||
        parsed.search || parsed.hash || parsed.pathname.includes("..")) return null;
    const key = parsed.pathname.slice(publicUrl.pathname.replace(/\/$/, "").length + 1);
    return /^\w+\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(key) ? key : null;
  } catch { return null; }
}

export async function salvarImagem(arquivo: File, pasta: "produtos" | "logos", barId: string) {
  if (arquivo.size < 1 || arquivo.size > 6 * 1024 * 1024) {
    throw new Error("A imagem deve ter até 6 MB.");
  }
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const image = sharp(bytes, { limitInputPixels: 20_000_000, failOn: "error" });
  const metadata = await image.metadata();
  if (!(["jpeg", "png", "webp", "avif"] as Array<string>).includes(metadata.format || "")) {
    throw new Error("Formato de imagem inválido.");
  }
  const webp = await image.rotate().resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 }).toBuffer();
  const { client, bucket, publicUrl } = configuracao();
  const key = `${pasta}/${barId}/${randomUUID()}.webp`;
  await client.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: webp, ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return new URL(key, `${publicUrl.href.replace(/\/$/, "")}/`).href;
}

export async function apagarImagem(url: string | null | undefined,
  pasta: "produtos" | "logos", barId: string) {
  const key = chaveDaImagem(url, pasta, barId);
  if (!key) return;
  const { client, bucket } = configuracao();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Full pagination prevents deleting a referenced object beyond the first 1000. */
export async function listarObjetos(prefix: string) {
  const { client, bucket } = configuracao();
  const all: { key: string; modified: Date | null }[] = [];
  let continuation: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket, Prefix: prefix, ContinuationToken: continuation,
    }));
    for (const item of page.Contents ?? []) {
      if (item.Key) all.push({ key: item.Key, modified: item.LastModified ?? null });
    }
    continuation = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuation);
  return all;
}

export async function apagarObjeto(key: string) {
  if (!/^(produtos|logos)\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(key)) {
    throw new Error("Chave R2 inválida.");
  }
  const { client, bucket } = configuracao();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
