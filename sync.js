// 拉取 Hugging Face Daily Papers 最近 7 天的论文及社区点赞数，写入 data/hf-papers.json
// 由 GitHub Actions 每小时运行（腾讯云访问不了 huggingface.co，所以放在海外跑）
// 只保存 arXiv 公开元数据（标题、作者、摘要）和点赞数；不保存 HF 自己生成的 AI 摘要等内容
// 运行环境：Node 20+，无第三方依赖

const fs = require('fs')
const path = require('path')

const DAYS = 7
const API = 'https://huggingface.co/api/daily_papers'
const OUT = path.join(__dirname, 'data', 'hf-papers.json')

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'LunRan paper sync (GitHub Actions)' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

function dateStr(d) {
  return d.toISOString().slice(0, 10)
}

async function main() {
  const urls = [`${API}?limit=100`]
  for (let i = 0; i < DAYS; i++) urls.push(`${API}?date=${dateStr(new Date(Date.now() - i * 86400e3))}&limit=100`)

  const byId = new Map()
  for (const url of urls) {
    let list
    try {
      list = await getJson(url)
    } catch (e) {
      console.warn('skip', e.message)
      continue
    }
    for (const e of list) {
      const p = e.paper || {}
      if (!p.id || !/^\d{4}\.\d{4,5}$/.test(p.id)) continue // 只要标准 arXiv 编号的论文
      const item = {
        arxivId: p.id,
        title: (p.title || e.title || '').replace(/\s+/g, ' ').trim(),
        abstract: (p.summary || '').replace(/\s+/g, ' ').trim(),
        authors: (p.authors || []).map((a) => a.name).filter(Boolean).slice(0, 8),
        publishedAt: p.publishedAt,
        dailyAt: p.submittedOnDailyAt || e.publishedAt,
        upvotes: p.upvotes || 0,
      }
      const prev = byId.get(item.arxivId)
      if (!prev || item.upvotes > prev.upvotes) byId.set(item.arxivId, item)
    }
  }

  const cutoff = Date.now() - (DAYS + 1) * 86400e3
  const papers = [...byId.values()]
    .filter((p) => Date.parse(p.dailyAt) >= cutoff)
    .sort((a, b) => b.upvotes - a.upvotes)

  if (!papers.length) throw new Error('no papers fetched, keep previous file')

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), count: papers.length, papers }, null, 1))
  console.log(`wrote ${papers.length} papers, top: ${papers[0].upvotes} ${papers[0].title}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
