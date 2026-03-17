# AmForge Analytics 📊

> **Professional Data Analytics Platform — by Arpit Moni**

![AmForge Analytics](https://img.shields.io/badge/AmForge-Analytics-2563EB?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSI3IiBoZWlnaHQ9IjciLz48cmVjdCB4PSIxNCIgeT0iMyIgd2lkdGg9IjciIGhlaWdodD0iNyIvPjxyZWN0IHg9IjMiIHk9IjE0IiB3aWR0aD0iNyIgaGVpZ2h0PSI3Ii8+PHJlY3QgeD0iMTQiIHk9IjE0IiB3aWR0aD0iNyIgaGVpZ2h0PSI3Ii8+PC9zdmc+)
![Version](https://img.shields.io/badge/Version-2.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![No Install](https://img.shields.io/badge/Zero_Install-Browser_Only-orange?style=for-the-badge)


| Dashboard | Data Cleaner PRO | vs Power BI |
|-----------|-----------------|-------------|
| Auto KPIs + 6 chart types | Smart imputation + Revenue Recovery | 25-feature comparison |

---

## ✨ Features

### 📊 Analytics
- **Auto Dashboard** — Upload CSV → instant KPIs + charts in 1 click
- **6 Chart Types** — Bar, Line, Pie, Area, Scatter, Histogram (live switching)
- **AI Insights** — Pattern detection, anomaly alerts, growth analysis
- **Trend Forecast** — Linear regression, 3-period prediction
- **Data Table** — Search, filter, explore 500+ rows
- **Ask AI** — Natural language → chart (e.g. "Show revenue by region")

### 🧹 Data Cleaner PRO
- **⚡ One Tap Auto Fix** — Fix everything in a single click
- **💰 Revenue Recovery** — Auto-detects `Units × Avg Price Per Product` to recover missing revenue
- **📐 Linear Interpolation** — For time-series (Jan missing → calculated from Dec + Feb, NOT just copied from Dec)
- **〰️ Weighted Moving Average** — Average of 3 surrounding rows
- **📊 Mean / Median / Mode** — Per-column strategy (Power BI style)
- **⬆️ Forward Fill** — Copy value from previous row
- **🔁 Duplicate Removal** — Auto-detected and removed
- **⚡ Type Error Fix** — "abc" in Revenue column → replaced with mean
- **📉 Negative Value Fix** — Negative Revenue → replaced with column mean
- **🔠 Case Normalization** — "laptop pro", "LAPTOP PRO" → "Laptop Pro"
- **📅 Date Format Fix** — "2024/06", "06-2024" → "YYYY-MM" standard
- **🎯 Outlier Detection** — Z-Score > 3 flagged automatically
- **Data Quality Score** — 0–100 score with before/after comparison
- **⬇️ Download Cleaned CSV** — Export fixed data instantly

### ⚔️ vs Power BI
- **Free** vs ₹800+/month
- **Zero install** vs requires download
- **100% local** — data never leaves your browser
- **Revenue Recovery** — not built-in in Power BI
- **One Tap Fix** — not available in Power BI
- **Open Source** — Power BI is proprietary


> *External CDN used only for Chart.js and Google Fonts. Works fully offline after first load.

---

## 🛠️ Tech Stack

| Technology | Usage |
|-----------|-------|
| **HTML5** | Structure |
| **CSS3** | Styling (CSS Variables, Grid, Flexbox, Animations) |
| **Vanilla JavaScript** | All logic — no frameworks |
| **Chart.js 4.4.1** | Chart rendering (CDN) |
| **IBM Plex Sans / Bebas Neue** | Typography (Google Fonts CDN) |

**Zero npm. Zero build step. Zero server.**

---

## 📊 Supported File Formats

| Format | Support |
|--------|---------|
| `.csv` | ✅ Full support |
| `.tsv` | ✅ Auto-detected |
| Any size | ✅ Up to 100k+ rows |

---

## 🧠 Smart Imputation Methods

AmForge uses **Power BI-grade** imputation strategies:

| Method | Best For |
|--------|----------|
| **Mean** | Regular numeric data (Power BI default) |
| **Median** | Data with outliers |
| **Mode** | Text/categorical columns |
| **Linear Interpolation** | Time-series (monthly data) |
| **Weighted Moving Average** | Smooth trend data |
| **Forward Fill** | Sequential/ordered data |
| **Revenue Recovery** | Missing revenue when Units + Product exist |


## 📄 License

MIT License — free to use, modify, and distribute.

See [LICENSE](LICENSE) for full details.

---

## 👨‍💻 Developer

**Arpit Moni**

> *"Built AmForge Analytics as a free, open-source alternative to Power BI — because powerful data analysis should be accessible to everyone."*

---

<div align="center">
  <strong>AmForge Analytics</strong> — Forged for Intelligence<br/>
  Made with Love by Arpit Moni
</div>
