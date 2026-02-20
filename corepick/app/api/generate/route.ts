import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// URL判定
function isYouTubeUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

// ===== YouTube専用処理 =====
async function handleYouTube(url: string) {
  let title = "YouTube動画";

  // oEmbedでタイトル取得（そのまま流用）
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      title = data.title;
    }
  } catch (e) {
    console.error("YouTube oEmbed error:", e);
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
あなたは優秀な要約アシスタントです。
以下のYouTube動画の内容を理解し、JSON形式で出力してください。

【動画URL】
${url}

【動画タイトル】
${title}

【出力フォーマット】
{
  "title": "${title}",
  "summary": ["要点1", "要点2", "要点3"],
  "nextSteps": ["ステップ1", "ステップ2", "ステップ3"]
}

【重要ルール】
1. summary: 「この動画は〜」は禁止。結論や主張を3つ。
2. nextSteps: 視聴後に取るべき具体的行動。
3. 日本語で。
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ===== 記事専用処理（ほぼ元コード） =====
async function handleWebPage(url: string) {
  let title = "";

  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  const html = await response.text();
  const $ = cheerio.load(html);

  // ノイズ除去（元コードそのまま）
  $("script, style, nav, header, footer, aside, iframe, noscript, .menu, .sidebar, .ad, [role='navigation'], [role='banner']").remove();

  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";

  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 15000);

  if (!title) {
    title =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      "No Title";
  }

  const combinedText = `
【タイトル】: ${title}
【概要・メタ情報】: ${metaDesc} ${ogDesc}
【本文】: ${bodyText}
`;

  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
あなたは優秀な要約アシスタントです。
以下のWebコンテンツの内容を深く理解し、JSON形式で出力してください。

【解析対象テキスト】
${combinedText}

【出力フォーマット】
{
  "title": "${title}",
  "summary": ["要点1", "要点2", "要点3"],
  "nextSteps": ["ステップ1", "ステップ2", "ステップ3"]
}

【重要ルール】
1. summary: 「この記事は〜」は禁止。結論・主張を3つ。
2. nextSteps: 次に取るべき具体的行動。
3. 日本語で。
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ===== メインAPI =====
export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URLが必要です" }, { status: 400 });
    }

    const isYouTube = isYouTubeUrl(url);
    let responseText = "";

    if (isYouTube) {
      responseText = await handleYouTube(url);
    } else {
      responseText = await handleWebPage(url);
    }

    // JSON整形（元コード流用）
    let jsonStr = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");

    try {
      const data = JSON.parse(jsonStr);
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({
        title: "解析エラー",
        summary: ["読み取りに失敗しました", "別のURLで試してください"],
        nextSteps: []
      });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "解析失敗" }, { status: 500 });
  }
}
