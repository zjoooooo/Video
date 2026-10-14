# Galaxy Explorer 宣传片《Look Up》：设计

日期：2026-10-14。状态：Justin 确认了横版、英文旁白 + 中文字幕、管风琴 + 钢琴配乐、确定性录真实画面的方案；然后要求"脱离以前的视频风格，自由发挥，怎么吸引人怎么做"，并确认了《Look Up》方向。

## 1. 目标

| 项目 | 决定 |
|---|---|
| 产品 | Galaxy Explorer（`/Users/justin/Project/galaxy-explorer`，线上 https://zjoooooo.github.io/galaxy-explorer/） |
| 投放 | GitHub README、演示页、B站 / YouTube；横版 16:9 |
| 时长 | 约 92 秒，由配音实测和小节网格决定 |
| 语言 | 英文旁白（OpenAI `coral`），中文字幕烧录；另出 `zh.srt`、`en.srt` |
| 配乐 | 空灵 → 渐强：管风琴 + 钢琴，弦乐和定音鼓在爆发段加入；fluidsynth + MuseScore_General |
| 画面 | 真实产品画面（确定性逐帧录制）+ 极简电影字体；不用 PPT 式章节头、编号 kicker、擦除转场 |

**不沿用**：报告片的版式（琥珀编号 kicker + 80 px 标题、擦除转场、按功能逐条讲），以及 7 月 `galaxy-pro-video` 的录屏 + 字幕 + edge-tts。

## 2. 概念

一路向外拉远的尺度之旅：从人抬头看星空出发，经过太阳系、冲出银河、看到别的星系；最后镜头继续拉远，整个宇宙缩进一个浏览器窗口——原来这只是一个网页。

吸引人的四个手段：
1. **前 3 秒给最强画面**：太阳日珥特写，不慢慢淡入。
2. **尺度推进叙事**：每一镜都比上一镜更大，观众自然想看下一镜。
3. **形式即反转**：全片 2.39:1 宽银幕遮幅；反转时遮幅打开，画面变成屏幕里的网页。
4. **剪辑长在音乐上**：120 BPM 的小节网格（2 s 一小节，半拍感），镜头切在小节线上，重音落在关键画面。

## 3. 结构

| 段 | 时间 | 画面 | 音乐 |
|---|---|---|---|
| 钩子 | 0–6 | 太阳表面特写，日珥喷出；硬切黑，字 *Look up.* | 管风琴低音轰入，然后静 |
| I 仰望 | 6–22 | 地球视角的星空穹顶，金色星座线描依次渐显，镜头转向人马座、银心 | 钢琴独奏 |
| II 出发 | 22–54 | 地球晨昏线 → 月球 → 太阳日冕 → 木星系 → 低角度土星环 → 哈雷彗星双尾；每镜 2 小节 | 钢琴固定音型进入，逐渐加密 |
| 爆发 | 54–68 | 虫洞（倒放，向外冲），星光拉线，冲出后升起看到整个银河旋臂 | 管风琴 + 弦乐 + 定音鼓全开 |
| III 更远 | 68–80 | 麦哲伦云 → 半人马座 A 尘埃带与等离子喷流（高潮）→ M87 单侧喷流 | 定音鼓重击落在喷流上 |
| 反转 | 80–92 | 音乐收回独奏钢琴；镜头继续后拉，遮幅打开，画面缩进一个通用浏览器窗口（地址栏是真实网址），光标拖动，银河跟着转；*One web page. No install.*；网址 | 钢琴收尾，最后一个和弦延音 |

## 4. 视觉系统

- **遮幅**：1920×1080 画布，画面区 1920×804，上下黑边各 138 px；反转段黑边在 2 小节内退开。
- **字体**：标题 Helvetica Neue UltraLight/Thin，宽字距（0.3 em），居中，暖白 `#f3efe6`；中文字幕 PingFang SC Light，放在下黑边里，不压画面。屏幕文字不小于 26 px。
- **角落数据**：偶尔一行小字（Menlo，22–26 px，45% 不透明度），如 *85,000 stars · generated in code*，只写可在代码里核实的数。
- **强调色**：星座金 `#ffd45a`，全片最多出现三次。
- **转场**：硬切为主；虫洞段用白闪 + 光晕；片尾用光圈收。不用擦除。
- **运动**：所有叠加元素都是 `t` 的纯函数，弹簧为闭式解。

## 5. 旁白（英文草稿，中文字幕同步）

1. *Look up.* —— 抬头看。（只出字，不配音）
2. *For as long as we've had eyes, we've looked up, and drawn stories in the stars.* —— 自从有了眼睛，我们就抬头仰望，把故事画进星空。
3. *Now go further.* —— 现在，走得更远。
4. *Past the Moon. Past a living Sun.* —— 越过月球，越过一颗活着的太阳。
5. *Out into eighty-five thousand points of light, every one of them made by code.* —— 冲进八万五千个光点，每一个都由代码生成。（README 写的是"约 85,000 个尘埃点"，不说"星"）
6. *Further still, to galaxies that fire jets of plasma across the dark.* —— 再远一些，有星系向黑暗射出等离子喷流。
7. *And all of it lives in one web page.* —— 而这一切，都在一个网页里。
8. *No install. Just open it, and look up.* —— 不用安装。打开它，抬头看。

片尾小字注明 AI 配音。

## 6. 事实（每一句都要能在产品里找到）

来源：galaxy-explorer `main`（`fea48ca`）的 README 和 `index.html`。
- 银河盘 `DUST.count = 85000` 个点，四条旋臂，加载时用代码生成，没有图片素材（README；`index.html` 的 tunables）。
- 约 30 个可点击信标（`BEACONS`），卡片支持 5 种语言。
- 太阳系：太阳、八大行星、月球、谷神星、冥王星和 7 颗著名卫星，NASA 底图；6 秒虫洞进入；太阳有颗粒、黑子、日珥和日冕环。
- 只有一颗彗星：Halley's Comet，走哈雷型的演示轨道，有蓝色离子尾和白色尘埃尾（`solarComets` 只建了一颗；README 写的"两颗"已经过时）。
- 星空：25 个星座，按真实 J2000 恒星位置绘制；另有 7 个河外星系。
- 半人马座 A：双向等离子喷流加电波瓣；M87：单侧喷流（反向喷流因多普勒减暗而看不见）。
- 单个 HTML 页面，不需要安装、构建、依赖包或 API key；静态托管即可。
- 许可证是 PolyForm Noncommercial，不是 OSI 意义上的开源；片中不说 "open source"。
- 太阳系的距离和大小为了好看做过调整，不按真实比例；片中不暗示是按真实比例。

## 7. 制作流程

**录制**（galaxy-explorer 只临时改动，录完还原）：
1. `../galaxy-pro-video/video-patch.sh on`，打上 3 处视频钩子（2026-10-14 检查过，对 `main` 能干净打上）。
2. 用新写的逐帧录制脚本打开 `?video=1`（固定种子、虚拟时钟）。脚本接管 `requestAnimationFrame`：推进一帧、截一帧，60 fps。运镜用 `VIDEO_CAMERA_PRESETS` 加 `GalaxyVideoDirector.resetForShot`，需要时补自定义机位。
3. 同一帧渲两次比对哈希，证明确定性。某个镜头如果有按墙钟走的动画（例如 CSS 过渡），就把这一镜退回 7 月验证过的 GPU 实时录制。
4. 每镜编码为全关键帧 mp4（`-g 1`），放在 `out/galaxy-look-up/shots/`；录完执行 `video-patch.sh off`。

**合成**（Video 仓库 `films/2026-10-galaxy-look-up/`）：
- `film.src.html` 按 `seek(t)` 把当前帧画到 canvas：先画素材帧（按 `timeline.json` 选镜头和片内时间，可以倒放），再画遮幅、字、浏览器窗口和光圈。`scripts/render.mjs` 的 `--sheet`、`--check`、`--sub` 照常使用。
- `narration.json → scripts/voice.py → plan.py → timeline.json → music.py`，共用 `scripts/narrated.py`（120 BPM、2 s 小节、混音时音乐让位人声、响度 -14 LUFS）。
- 字幕：`plan.py` 从 voice.json 的分句时间生成 `zh.srt` / `en.srt`；中文字幕由 `film.src.html` 烧录。

**审核**：
- 独立的美术总监子代理看 30 fps 预览（`--fps 30 --sub 1`）打分，到 9/10 才做 `--sub 8` 正式渲染。
- 另做一次事实核对：每一句旁白和角落数据都对应第 6 节。
- 音频由 Justin 判断（Claude 听不到）。

## 8. 交付

- `out/galaxy-look-up.mp4`（1920×1080，60 fps，AAC 192k）
- `out/galaxy-look-up.zh.srt`、`out/galaxy-look-up.en.srt`
- `package.json` 加 `npm run look-up`（以及 `look-up:sheet`、`look-up:check`）。

不在本次范围：竖版剪辑，上传 README / B站 / YouTube（对外发布，另行确认）。

## 9. 风险

| 风险 | 对策 |
|---|---|
| 逐帧接管 rAF 后，某些效果仍按墙钟走 | 用哈希比对找出来；那一镜改用 GPU 实时录制 |
| 虫洞倒放不像"冲出去" | 改用银河素材的径向拉伸 + 白闪做光速转场 |
| 无头 Chromium 上 WebGL 慢 | 逐帧录制不受渲染速度影响，只是耗时更长；用 GPU 启动参数（`galaxy-pro-video/src/browser.mjs` 的 `GPU_LAUNCH_ARGS`） |
| 素材体积大 | 全关键帧素材只放在 `out/`（已 gitignore），不入库 |

## 10. 成片（2026-10-14）

美术总监评审了四轮：6 → 7.5 → 8.5 → 9/10。最终结构 78 秒：

| 段 | 时间 | 镜头 |
|---|---|---|
| 钩子 | 0–6 | 太阳边缘特写（拉远）→ 黑场 *Look up.* |
| I | 6–16 | 狮子座 / 天蝎座 / 人马座，三刀，各从选中那一刻切入 |
| II | 16–34 | 地球（日面）、月球（凸月）、太阳拉远（行星入画）、木星、土星、哈雷彗星；4-4-4-2-2-2，拉远、偏离中心、录制时真实拖拽产生视差 |
| 爆发 | 34–46 | 真实虫洞倒放加速 → 加法白闪 → 银河升起（`grade_rise.py` 离线羽化核球光晕硬边） |
| III | 46–60 | 大麦哲伦云（含 SN 1987A 光环）、半人马座 A（尘埃带 + 双喷流）、M87（剪点上的镜头冲击） |
| 反转 | 60–78 | M87 缩进浏览器窗口 → 同一机位的真实页面带 UI 溶入 → 光标点真实的 "Back to the Milky Way" → 飞回（1.6 倍）→ 拖拽到正面 → 片名 + 网址 → 光圈收在银河上 |

评审中保留的产品特征（不是缺陷）：自转轴线和赤道环（飞入行星系统时产品就会显示）、SN 1987A 的光环、地球极光。
技术记录：逐帧接管 rAF 的录制结果逐位一致；UI 镜头用 Web Animations API 把 CSS 动画拨到帧时钟上；Chrome 中鼠标和滚轮事件要等原生帧，所以拖拽和缩放改为直接派发 PointerEvent / WheelEvent；画布上画过渐变之后后续混合的光栅化会变，因此在 READY 前先预热一次。
