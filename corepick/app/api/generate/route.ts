import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// 1. Geminiの準備
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    // 2. リクエストからURLを取り出す
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URLが必要です" }, { status: 400 });
    }

    // 3. ページ取得（YouTube対策込み）
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // 4. ノイズ除去
    $("script, style, nav, header, footer, aside, iframe, noscript, .menu, .sidebar, .ad, [role='navigation'], [role='banner']").remove();

    // 本文抽出
    const metaDescription = $('meta[name="description"]').attr('content') || "";
    const ogDescription = $('meta[property="og:description"]').attr('content') || "";
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();

    const combinedText = `
      【メタ情報・概要】: ${metaDescription} ${ogDescription}
      【ページ本文】: ${bodyText}
    `.substring(0, 20000);

    // 5. AIの設定
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
        "title": "記事または動画のタイトル",
        "summary": ["要点1", "要点2", "要点3"],
        "nextSteps": ["ステップ1", "ステップ2", "ステップ3"]
      }

      【重要ルール】
      1. summary: 「この記事は〜」という説明は禁止。記事の「結論」「重要な主張」を3つ抽出。
      2. nextSteps: 読者が次に取るべき具体的な行動を最大3つ。
      3. 言語は必ず日本語で。
    `;

    // 6. 生成実行
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("📦 Raw AI Response:", responseText);

    // 7. JSONの掃除（エラー対策）
    let jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    // 末尾のカンマエラーを消す魔法のコード
    // 例: ["a", "b",] -> ["a", "b"]
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    try {
      const data = JSON.parse(jsonStr);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error("💥 JSON Parse Error:", parseError);
      console.error("💥 Failed JSON:", jsonStr);
      // 万が一失敗しても、エラーにせず空データを返すことでアプリを落とさない
      return NextResponse.json({
        title: "解析エラー",
        summary: ["内容の読み取りに失敗しました💦", "URLを確認してもう一度試してみてね。"],
        nextSteps: []
      });
    }

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "解析に失敗しました" }, { status: 500 });
  }
}
