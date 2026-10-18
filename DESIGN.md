---
name: 英文账号资料生成器
description: 安静、可信、面向批量操作的本地资料工坊
colors:
  canvas: "#f4f2ec"
  surface: "#fffefa"
  on-accent: "#ffffff"
  surface-muted: "#e9eee9"
  ink: "#172421"
  muted: "#5e6c68"
  line: "#ced6d1"
  workshop-teal: "#246b5f"
  workshop-teal-hover: "#18564d"
  workshop-teal-soft: "#d9ece7"
  compliance-amber: "#e6b84b"
  danger: "#a13d36"
  danger-soft: "#f8e6e2"
  focus: "#0c6fbc"
typography:
  headline:
    fontFamily: "Segoe UI Variable, Segoe UI, Microsoft YaHei UI, PingFang SC, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Segoe UI Variable, Segoe UI, Microsoft YaHei UI, PingFang SC, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Segoe UI Variable, Segoe UI, Microsoft YaHei UI, PingFang SC, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Segoe UI Variable, Segoe UI, Microsoft YaHei UI, PingFang SC, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  control: "10px"
  button: "11px"
  surface: "14px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.workshop-teal}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.button}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.workshop-teal-hover}"
    textColor: "{colors.on-accent}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "42px"
---

# Design System: 英文账号资料生成器

## Overview

**Creative North Star: “本地资料工坊”**

界面像一张安静、可靠的桌面工作台：参数、生成结果、来源说明和导出操作都保持清晰的工作关系。它重视批量效率与合规边界，但不使用企业后台常见的冷蓝大面积铺色，也不把工具包装成社交平台。

方向种子为 `fe0197ff`（Operate 模式，方向索引 3）。视觉语言以暖灰纸面、墨色文字和克制的工坊绿构成，黄色只承担许可与合规提示。密度适中，桌面端侧栏固定，移动端在已有结果时折叠为设置摘要。

**Key Characteristics:**

- 本地工具感：明确的数据来源、保存方式和版本信息。
- 操作优先：44px 主要操作、紧凑工具栏、批量表格限高滚动。
- 合规可见：许可风险不藏在帮助页，直接出现在工作流中。
- 克制层次：边框和色块负责大部分分层，阴影只用于重点浮层与资料卡。

## Colors

暖中性画布承托偏深的墨绿文字，工坊绿只出现在主要动作、选中态和可信状态。

### Primary

- **工坊绿** (`#246b5f`)：主要按钮、交互选中态、来源状态和关键图标。
- **深工坊绿** (`#18564d`)：主要按钮悬停态，不另引入第二种主色。

### Secondary

- **合规琥珀** (`#e6b84b`)：照片许可、模拟数据和重要限制的提示色。

### Tertiary

- **状态暗红** (`#a13d36`)：删除、错误和明文密码风险状态；淡红面 (`#f8e6e2`) 仅作其低强度背景。
- **焦点蓝** (`#0c6fbc`)：仅用于键盘焦点外轮廓，不作为第二品牌色。

### Neutral

- **暖纸画布** (`#f4f2ec`)：全局背景。
- **净白纸面** (`#fffefa`)：卡片、输入框与顶栏。
- **纯白反字** (`#ffffff`)：仅用于深色按钮和状态面上的文字。
- **浅雾工作面** (`#e9eee9`)：用于低对比辅助容器的基准色。
- **墨色** (`#172421`)：标题、正文主信息和反白工具条背景。
- **雾灰绿** (`#5e6c68`)：辅助信息与说明文字。
- **细线灰绿** (`#ced6d1`)：边框、表格线和数据网格分隔。

**The Signal Rarity Rule.** 工坊绿和合规琥珀都应保持稀缺；前者表示可执行或可信状态，后者只表示需要用户注意的许可与限制。

## Typography

**Display Font:** Segoe UI Variable（回退到 Segoe UI 与中文系统 UI 字体）  
**Body Font:** Segoe UI Variable（同上）  
**Label/Mono Font:** Cascadia Code（回退到 Consolas），只用于用户名与密码等机器可复制字段。

**Character:** 使用 Windows 原生字体获得本地应用般的速度与熟悉感；标题通过字重和轻微负字距建立层次，不依赖夸张字号。

### Hierarchy

- **Headline**（700，25px，1.5）：结果工作区一级标题。
- **Title**（700，17–20px，1.5）：设置区与资料姓名。
- **Body**（400，13–14px，1.5）：说明、Bio 与正文。
- **Label**（700–800，10–13px，约 `.04em`）：字段名、记录编号与状态标签。

## Layout

桌面端使用最大 1640px 的两栏工作区：286px 设置栏与弹性结果区，中间 32px 间距。顶栏和生成进度保持可见；设置栏在桌面端粘附，在 900px 以下回归文档流并可折叠。680px 以下所有资料卡变为单列，主要按钮满宽；批量表格保留水平滚动并显示操作提示。间距以 8px 为基础节奏，常用层级为 12、16、24、32px。

## Elevation & Depth

系统以边框和邻近色面建立结构，阴影用于需要从画布中抬起的资料卡、提示和主要按钮。默认卡片阴影为 `0 12px 32px rgba(28, 47, 43, 0.09), 0 2px 6px rgba(28, 47, 43, 0.06)`；品牌标记只使用柔和环境阴影，不使用硬偏移装饰。

**The Layered-Only-When-Useful Rule.** 只有可操作资料卡、浮动提示和焦点动作获得阴影，表格、设置区和导出区保持有边框的平面层次。

## Shapes

控件使用 9–11px 圆角，内容容器使用 14px 圆角，状态标签与开关使用完全胶囊形。轮廓保持柔和但不追求“气泡化”；数据网格共享外轮廓并由细线分隔。

## Components

### Buttons

- **Shape:** 11px 圆角，常规高度至少 44px。
- **Primary:** 工坊绿底、白字，适用于生成与头像 ZIP 等单一主动作。
- **Hover / Focus:** 颜色加深并略微提升环境阴影；键盘焦点使用 3px 蓝色外轮廓。
- **Secondary:** 净白纸面配细线边框，适用于保存、去重和常规导出。

### Chips

- **Style:** 淡工坊绿背景配深绿文字；模拟或许可状态使用淡琥珀色。
- **State:** 只表达来源、计数和状态，不替代操作按钮。

### Cards / Containers

- **Corner Style:** 14px。
- **Background:** 净白纸面；头像列与设置区使用低对比灰绿色面。
- **Shadow Strategy:** 资料卡使用标准卡片阴影，其余容器以边框分层。
- **Internal Padding:** 16–22px，移动端收敛到 16–18px。

### Inputs / Fields

- **Style:** 净白背景、灰绿细边框、10px 圆角、高度 42px。
- **Focus:** 统一 3px 蓝色外轮廓，保证键盘可见性。
- **Error / Disabled:** 错误使用暗红与淡红面；禁用态降低透明度并移除阴影。

### Navigation

卡片/表格切换使用分段控件；活动态为墨色底白字。分页保持小型图标按钮，批量表格在固定最大高度内滚动，表头粘附。

### Profile Card

头像与结构化资料明确分区。头像来源直接叠加在图片上；用户名、Bio、翻译和密码放在可扫描的数据网格中，每项复制动作紧邻内容。移动端头像区横向压缩，正文转为单列。

## Do's and Don'ts

- **Do** 在生成、保存、导出等关键节点明确显示数据来源、密码持久化和头像许可状态。
- **Do** 让批量工作保持可扫描：桌面默认表格、移动默认卡片，长表格在容器内滚动。
- **Do** 使用系统字体和原生控件语义，保持 Windows 本地工具的熟悉感与可访问性。
- **Don't** 使用未经定义的高饱和品牌色、大面积渐变或纯装饰性动画。
- **Don't** 用颜色暗示远程 API 一定成功；本地模拟必须始终被明确标注。
- **Don't** 隐藏水平滚动、头像许可或明文密码风险等会改变用户决策的信息。
