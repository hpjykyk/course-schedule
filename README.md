# 我的课表 · 国贸2621

这是根据 `首页.pdf` 整理出的静态 PWA 课表网页，并配套一个 Scriptable iPhone 小组件。

## 已录入信息

- 起始日：2026-09-14
- 第一学期课程：截至 2027-01-17
- 寒假：2027-01-18 至 2027-02-20
- 第二学期开学：2027-02-21（课程暂未录入）
- 页面展示截止：2027-07-16
- 2026 年中秋、国庆放假与调休日期
- 2027 年元旦、春节、清明、劳动节、端午节的节日日期；国务院公布 2027 年具体调休后，可编辑 `data/holidays.json`

## 部署网页

把 `course-schedule` 文件夹部署到任意支持静态文件的 HTTPS 主机，例如 Cloudflare Pages、Vercel 或 GitHub Pages。不要直接双击 `index.html`，因为浏览器会阻止本地文件读取 JSON；部署后从 HTTPS 地址访问即可。

在 iPhone Safari 打开网址，选择“分享 → 添加到主屏幕 → 作为 Web App 打开”。

## 安装 Scriptable 小组件

1. 打开 `scriptable/next-class.js`。
2. 把顶部的 `DATA_URL` 和 `HOLIDAY_URL` 替换成部署后的完整地址，例如：

   `https://你的域名/data/schedule.json`

   `https://你的域名/data/holidays.json`

3. 将脚本复制到 iPhone 的 Scriptable。
4. 运行一次并允许联网。
5. 在主屏幕添加 Scriptable 小组件，选择 `next-class` 脚本。

小组件读取的就是网页同一份数据。倒计时会使用 iOS 的动态日期样式；iOS 负责决定小组件何时重新读取数据，因此课程切换时可能有少量延迟。

## 更新课表

主要编辑 `data/schedule.json`。课程支持：

- `weekday`：1 到 7 代表周一到周日
- `periods`：节次，例如 `[1, 2]`
- `weeks`：连续周次
- `parity`：`odd` 表示单周，`even` 表示双周
- `weekRanges`：同一课程不同周次可以配置不同老师

如果学校发布临时调课或补课，可以在 `data/holidays.json` 中维护节假日，或在课程数据结构中扩展日期例外。
