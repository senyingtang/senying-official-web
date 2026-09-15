# archive-unused

Phase 2.8.1：原本位於 `apps/marketing/public/images/`、但 runtime 沒有使用的 26 張 PNG（Phase 2.7 `UNUSED_IMAGE_ASSETS.csv` 列出，多數與 runtime final 圖逐位元相同）。

- 只搬移、不刪除；原路徑與新路徑見 `MOVED_FROM_PUBLIC.csv`
- 不會被官網 build 複製到 `dist`，也不是 runtime 圖片來源（ResponsiveImage 不可引用 docs/design）
- 需要時可從這裡取回原檔
