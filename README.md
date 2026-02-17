# Questionnaire UI Prototype

Googleフォーム風のアンケート作成・回答・集計が可能なUIです。

## GitHub Pages で公開する方法

このリポジトリには `.github/workflows/deploy-pages.yml` を同梱しています。`main` / `master` ブランチへ push すると自動で GitHub Pages にデプロイされます。

1. GitHub の **Settings > Pages** を開く
2. **Build and deployment** の Source を **GitHub Actions** に設定する
3. `main` または `master` ブランチへ push する
4. Actions の `Deploy static site to GitHub Pages` が成功したら公開URLで閲覧する

公開URLの例:

- User/Org Pages: `https://<user>.github.io/`
- Project Pages: `https://<user>.github.io/<repository>/`

## ローカル確認

```bash
python3 -m http.server 4173
```

ブラウザで `http://127.0.0.1:4173` を開いて確認できます。

## Repository差し替えポイント

データ連携をAPI化する際は、`app/repository/createRepository.js` の返却実装を差し替えてください。
