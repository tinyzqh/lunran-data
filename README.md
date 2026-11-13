# lunran-data

论澜小程序的 Hugging Face Daily Papers 数据同步。

GitHub Actions 每小时运行 `sync.js`，拉取 Hugging Face Daily Papers 最近 7 天的论文和社区点赞数，
写入 `data/hf-papers.json`。小程序的云函数 `fetchSources` 再从
`raw.githubusercontent.com`（备用 jsDelivr）下载这个文件入库。

腾讯云访问不了 huggingface.co，所以这一步放在 GitHub 的海外服务器上跑。

只保存 arXiv 公开元数据（标题、作者、摘要）和点赞数，不保存 Hugging Face 生成的 AI 摘要等内容。

## 本地运行

```bash
node sync.js   # 需要 Node 20+，无第三方依赖
```
