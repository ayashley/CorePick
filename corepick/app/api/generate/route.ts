import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URLが必要です" }, { status: 400 });

    let title = "";
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

    // 1. YouTube対策：oEmbedで確実なタイトル取得
    if (isYouTube) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          title = data.title;
        }
      } catch (e) {
        console.error("YouTube oEmbed error:", e);
      }
    }

    // 2. スクレイピング（YouTubeならGooglebotに偽装）
    const userAgent = isYouTube
      ? "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

    const response = await fetch(url, { headers: { "User-Agent": userAgent } });
    const html = await response.text();
    const $ = cheerio.load(html);

    // 3. ノイズ除去
    $("script, style, nav, header, footer, aside, iframe, noscript, .menu, .sidebar, .ad, [role='navigation'], [role='banner']").remove();

    const metaDesc = $('meta[name="description"]').attr('content') || "";
    const ogDesc = $('meta[property="og:description"]').attr('content') || "";

    // YouTube以外なら本文も取得
    const bodyText = isYouTube ? "" : $("body").text().replace(/\s+/g, " ").trim().substring(0, 15000);

    if (!title) {
      title = $('meta[property="og:title"]').attr('content') || $("title").text() || "No Title";
    }

    // 4. AI入力用データ
    const combinedText = `
      【タイトル】: ${title}
      【概要・メタ情報】: ${metaDesc} ${ogDesc}
      【本文】: ${bodyText}
    `;

    // 5. Gemini設定
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      あなたは優秀な要約アシスタントです。
      以下のWebコンテンツの内容を深く理解し、ユーザーにとって有益な情報を抽出してJSON形式で出力してください。

      【解析対象テキスト】
      ${combinedText}

      【出力フォーマット】
      以下のJSONスキーマに従ってください。Markdown記法は不要です。
      {
        "title": "${title}",
        "summary": ["要点1", "要点2", "要点3"],
        "nextSteps": ["ステップ1", "ステップ2", "ステップ3"]
      }

      【重要ルール】
      1. summary: 「この記事は〜」という説明は禁止。記事の「結論」「重要な主張」を3つ抽出。
      2. nextSteps: 読者が次に取るべき具体的な行動を最大3つ。
      3. YouTube動画の場合、タイトルと概要から動画の中身（トピックや結論）を推測して書くこと。
      4. 言語は必ず日本語で。
    `;

    // 6. 生成実行
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    try {
      const data = JSON.parse(jsonStr);
      if (!data.title || data.title === "No Title") data.title = title;
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({
        title: title || "解析エラー",
        summary: ["読み取りに失敗しました", "別のURLで試してみてください"],
        nextSteps: []
      });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "解析失敗" }, { status: 500 });
  }
}
