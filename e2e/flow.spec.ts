import { expect, test, type Page } from "@playwright/test";

const ROOM_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Programmatically generate a fixture "book page" PNG:
 * white paper, black sentence, red underline beneath the target word.
 */
async function makeFixturePng(page: Page, word: string): Promise<string> {
  return page.evaluate((targetWord) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 320;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111111";
    ctx.font = "24px Georgia";
    const prefix = "Reading brings moments of ";
    ctx.fillText(prefix + targetWord + " to every page.", 40, 150);
    const prefixWidth = ctx.measureText(prefix).width;
    const wordWidth = ctx.measureText(targetWord).width;
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40 + prefixWidth, 160);
    ctx.lineTo(40 + prefixWidth + wordWidth, 160);
    ctx.stroke();
    return canvas.toDataURL("image/png");
  }, word);
}

test("pages respond with 200", async ({ request }) => {
  for (const path of ["/", "/viewer", "/camera", "/words"]) {
    const res = await request.get(path);
    expect(res.status(), `${path} should return 200`).toBe(200);
  }
});

test("underline → viewer card → 알아요 → gone after reload", async ({
  browser,
}) => {
  const viewerCtx = await browser.newContext();
  const cameraCtx = await browser.newContext();
  const viewer = await viewerCtx.newPage();
  const camera = await cameraCtx.newPage();

  // 1. Viewer creates a room and shows the pairing code.
  await viewer.goto("/viewer");
  await expect(viewer.getByTestId("room-code")).toHaveText(ROOM_CODE_RE, {
    timeout: 20_000,
  });
  const roomCode = (await viewer.getByTestId("room-code").innerText()).trim();

  // 2. Camera joins via the QR-style deep link.
  await camera.goto(`/camera?room=${roomCode}`);
  await expect(camera.getByTestId("room-input")).toHaveValue(roomCode);
  await camera.getByTestId("join-button").click();
  await expect(camera.getByTestId("status-indicator")).toBeVisible();

  // 3. A red-underlined fixture frame is posted (mock mode maps it to a word).
  const image = await makeFixturePng(camera, "serendipity");
  const res = await camera.request.post("/api/frame", {
    data: { room: roomCode, image, mockWords: ["serendipity"] },
  });
  expect(res.ok()).toBeTruthy();

  // 4. The word card appears on the viewer within 5s, with a Korean meaning.
  const card = viewer.getByTestId("word-card-serendipity");
  await expect(card).toBeVisible({ timeout: 5_000 });
  await expect(card).toContainText("뜻밖의 행운");

  // 5. Mark as known -> card disappears immediately.
  await viewer.getByTestId("know-button-serendipity").click();
  await expect(card).toBeHidden();

  // 6. Reload; the same frame arrives again; the word must NOT come back.
  await viewer.reload();
  await expect(viewer.getByTestId("room-code")).toHaveText(roomCode, {
    timeout: 20_000,
  });
  const res2 = await camera.request.post("/api/frame", {
    data: { room: roomCode, image, mockWords: ["serendipity"] },
  });
  expect(res2.ok()).toBeTruthy();
  await viewer.waitForTimeout(3_000);
  await expect(viewer.getByTestId("word-card-serendipity")).toHaveCount(0);

  await viewerCtx.close();
  await cameraCtx.close();
});

test("page turn starts a new current-page section", async ({ browser }) => {
  const viewerCtx = await browser.newContext();
  const viewer = await viewerCtx.newPage();
  await viewer.goto("/viewer");
  await expect(viewer.getByTestId("room-code")).toHaveText(ROOM_CODE_RE, {
    timeout: 20_000,
  });
  const roomCode = (await viewer.getByTestId("room-code").innerText()).trim();

  await viewer.request.post("/api/frame", {
    data: { room: roomCode, mockWords: ["ephemeral"] },
  });
  await expect(viewer.getByTestId("word-card-ephemeral")).toBeVisible({
    timeout: 5_000,
  });

  // Page turn + a new word: old word moves to the "older pages" section.
  await viewer.request.post("/api/frame", {
    data: { room: roomCode, mockWords: ["meticulous"], pageChanged: true },
  });
  await expect(viewer.getByTestId("word-card-meticulous")).toBeVisible({
    timeout: 5_000,
  });
  const olderSection = viewer.getByLabel("earlier page words");
  await expect(
    olderSection.getByTestId("word-card-ephemeral"),
  ).toBeVisible();

  await viewerCtx.close();
});
