# たき火の手記

記事を書くたびに地図が広がっていく、霧の中を歩いて読むブログです。
記事は `posts/` の Markdown で管理し、GitHub Actions でビルドして GitHub Pages に公開します。

<img width="600" alt="スクリーンショット 2026-09-24 0 06 53" src="https://github.com/user-attachments/assets/6ac783c9-a265-43d3-8741-d03c74551deb" />

https://yuki-sakaguchi.github.io/takibi-blog/


## 必要なもの

- Node.js 20 以上

## 手元で動かす

```sh
npm install
npm run dev
```

http://localhost:5173/ を開きます。`posts/` や `src/` を保存すると自動で再ビルドされるので、ブラウザを再読み込みしてください。

`http://localhost:5173/?demo` のように `?demo` をつけて開くと、目録に「手記を1冊増やす」「最初からやり直す」のデモ用ボタンが出ます。

## 手記を書く

```sh
npm run new -- my-first-camp "はじめてのキャンプ"
```

`posts/2026-09-24-my-first-camp.md` のようなファイルができ、同時に `map.lock.json` の末尾に登録されます。

```md
---
title: はじめてのキャンプ
date: 2026-09-24
category: 旅の記録
description: 省略すると本文の冒頭が使われます
draft: false
---

ここに本文を書きます。
```

| 項目 | 必須 | 説明 |
|---|---|---|
| `title` | ○ | 手記のタイトル |
| `date` | ○ | 日付（`YYYY-MM-DD`） |
| `category` | | 分類。省略すると「手記」 |
| `slug` | | URL に使う名前。省略するとファイル名から日付を除いたもの |
| `description` | | 個別ページの説明文（OGP にも使われます） |
| `draft` | | `true` にすると公開されません |

画像は `public/images/` に置き、本文からは `![説明](images/photo.png)` のように **先頭に `/` をつけずに** 書きます。地図の上でも個別ページでも同じ書き方で表示されます。

## map.lock.json について

地図の区画は `map.lock.json` の `order` の順に、道の先へ継ぎ足されていきます。記事を増やしても既存の場所が動かないのは、この順番を固定しているからです。

- `npm run new` や `npm run build` を実行すると、未登録の記事が日付順に末尾へ追加されます。**変更されたら一緒にコミットしてください。**
- 並び順を手で入れ替えると、地図全体の配置が変わります。
- 記事を削除したり `draft: true` に戻したりしても、区画は「跡地」（たき火と手記のない空き地）として残るので、以降の配置はずれません。完全に詰めたい場合は `order` から slug を消します。

## GitHub Pages で公開する

1. GitHub にリポジトリを作って push します。GitHub CLI を使う場合は次のとおりです。

   ```sh
   gh repo create takibi-blog --public --source=. --remote=origin --push
   ```

   Web で作る場合は、空のリポジトリを作ってから次を実行します。

   ```sh
   git remote add origin git@github.com:<ユーザー名>/takibi-blog.git
   git push -u origin main
   ```

2. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。
3. `main` に push するたびに `.github/workflows/deploy.yml` が動き、`https://<ユーザー名>.github.io/takibi-blog/` に公開されます。
4. 公開 URL が決まったら `site.config.json` の `url` に入れておくと、個別ページに `og:url` が入ります。

すべて相対パスで書いてあるので、`/takibi-blog/` のようなサブパスでも、独自ドメインのルートでもそのまま動きます。

## 構成

```
posts/                 手記（Markdown）
public/                そのまま公開されるファイル（画像など）
src/index.html         地図の画面（ゲーム本体）
src/post.html          手記の個別ページのテンプレート
scripts/build.mjs      dist/ へのビルド
scripts/dev.mjs        ローカル確認用サーバー
scripts/new-post.mjs   手記の雛形を作る
map.lock.json          地図に置く順番（コミットする）
site.config.json       サイト名・説明・公開 URL
```

ビルドすると `dist/` に次のものが出力されます。

- `index.html`：地図の画面
- `posts.json`：地図に置く順の手記データ
- `posts/<slug>/index.html`：手記ごとの個別ページ（検索や SNS 共有用。「地図の上で読む」から地図に戻れます）
