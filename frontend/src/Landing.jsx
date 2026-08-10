import { useMemo, useState } from "react";

const go = (path) => { location.hash = path; };

const QUESTION_GUIDE = [
  ["簡答", "姓名、部門、員工編號", "適合一行內的文字。可設為必填，並用說明文字交代格式，例如「請輸入 6 碼員工編號」。"],
  ["詳答", "請說明本次活動最需要改善的地方", "適合意見與敘述。題目要聚焦，避免只寫「其他建議」而讓填答者無從下手。"],
  ["單選題", "您最常使用哪一種交通工具？", "選項互斥、只能選一個。若可能不在清單內，加入「其他」或「不適用」。"],
  ["核取方塊", "您使用過哪些服務？（可複選）", "可選多個答案。請在題目明說「可複選」，並避免選項彼此重疊。"],
  ["下拉式選單", "請選擇所在縣市", "適合選項多、名稱短的清單；選項少於 6 個時，通常用單選題更容易比較。"],
  ["線性刻度", "您有多大可能推薦本服務？0–10 分", "清楚標示最低與最高分代表的意義，例如 0＝完全不可能、10＝非常可能。"],
  ["單選方格", "請為各服務項目評分", "每一列只能選一格。列是待評項目，欄是同一組尺度，建議不超過 7 欄。"],
  ["核取方塊格", "各時段可參加的活動（可複選）", "每列可複選。適合多個對象共用相同選項；手機上列與欄不宜過多。"],
  ["日期／時間", "您希望預約的日期與時段", "分開詢問日期與時間，並在說明中交代時區、可選範圍與截止時間。"],
  ["圖片選擇", "請選出偏好的包裝設計", "每張圖片使用相同比例並加上文字標籤，避免答案只能靠顏色區分。"],
  ["星級評分", "請為本次體驗評分（1–5 星）", "適合快速滿意度；標註 1 星與 5 星含義，避免不同人對星等理解不一。"],
  ["巢狀選擇", "縣市 → 行政區 → 門市", "用於前一層會決定下一層的資料。先整理完整階層，並提供找不到項目時的替代選項。"],
  ["項目排序", "請依重要性排列以下福利", "項目建議控制在 5–8 個。題幹要寫清楚排序方向，例如「最重要放最上方」。"],
  ["總計分配", "請將 100 點分配給各項服務", "設定固定總分並即時顯示剩餘點數，適合衡量相對權重。"],
  ["限量／庫存", "請選擇可預約場次", "為每個選項設定可用數量；發佈前確認額滿後的顯示文字與替代方案。"],
  ["檔案／圖片上傳", "請上傳收據照片", "在題目中註明允許格式、檔案大小、張數與個資用途。非必要不要要求上傳。"],
  ["簽名", "本人確認上述資料正確", "簽名前先呈現確認內容；若涉及法律效力，仍應依組織規範處理身分驗證與留存。"],
  ["熱點點擊", "請點出最先注意到的區域", "上傳清楚的底圖並說明可點幾次。不同裝置比例需一致，避免座標偏移。"],
  ["文字螢光筆", "請標記文案中喜歡與不喜歡的片段", "文章不宜過長；先說明標記顏色的意義，並避免把必要資訊藏在長文內。"],
  ["最大差異法", "每組選出最重視與最不重視的項目", "適合測量偏好強度。選項文字需在同一層級，回合數不宜造成填答疲勞。"],
  ["地圖定位", "請標記服務發生地點", "允許搜尋地址或使用目前位置，並說明定位資料用途；最好提供手動輸入作為替代。"],
  ["條款同意", "閱讀個資告知後勾選同意", "條款需可閱讀、可捲動且有版本。必須同意與行銷訂閱應分開，不要預先勾選。"],
  ["連結型題目", "依使用者資料帶入部門並追問", "先確認連結欄位唯一且資料完整。讓填答者看得懂系統帶入了什麼，以及能否修正。"],
];

function MiniBuilder() {
  return <div className="product-preview" aria-label="問卷編輯器示意">
    <div className="preview-bar"><i/><span/><span/></div>
    <div className="preview-body">
      <aside><b>問卷設計</b><span>填答狀況</span><span>統計分析</span><span>分享設定</span></aside>
      <div className="preview-canvas">
        <div className="preview-title"><small>顧客體驗調查</small><strong>讓每一個問題都有目的。</strong></div>
        <div className="preview-question"><em>01</em><div><b>這次體驗最打動你的地方？</b><p>選擇一個最符合的答案</p><div className="preview-options"><i/><i/><i/></div></div></div>
        <div className="preview-question muted-card"><em>02</em><div><b>你願意推薦給朋友嗎？</b><div className="preview-scale">0<span/>1<span/>2<span/>3<span/>4<span/>5</div></div></div>
      </div>
    </div>
  </div>;
}

export default function Landing() {
  const [query, setQuery] = useState("");
  const list = useMemo(() => QUESTION_GUIDE.filter(x => x.join(" ").includes(query.trim())), [query]);
  return <div className="landing">
    <nav className="landing-nav" aria-label="主要導覽">
      <button className="landing-brand" onClick={() => scrollTo({top:0, behavior:"smooth"})}><span>問</span>問卷所</button>
      <div className="landing-links"><a href="#features">功能</a><a href="#guide">題型指南</a><button className="text-link" onClick={() => go("/admin/login")}>登入</button><button className="nav-cta" onClick={() => go("/register")}>開始建立</button></div>
    </nav>

    <main>
      <section className="landing-hero">
        <div className="eyebrow">SURVEY, MADE THOUGHTFUL</div>
        <h1>問得更好，<br/>答案自然更清楚。</h1>
        <p>從題目設計、名單管理到統計匯出，一個安靜、清楚的工作空間。複雜的研究方法，也能讓每位同事輕鬆上手。</p>
        <div className="hero-actions"><button className="pill primary" onClick={() => go("/register")}>免費開始</button><a className="pill link" href="#guide">查看題型指南 <span>→</span></a></div>
        <MiniBuilder />
      </section>

      <section className="promise" id="features">
        <p className="section-kicker">從想法到洞察</p>
        <h2>少一點設定，多一點理解。</h2>
        <div className="feature-grid">
          <article className="feature-card warm"><span className="feature-no">01</span><h3>像寫文件一樣設計</h3><p>把題目拖進段落、即時調整順序。基礎題型與進階研究題型放在清楚的分類中，不必猜功能藏在哪。</p><div className="feature-visual lines"><i/><i/><i/></div></article>
          <article className="feature-card blue"><span className="feature-no">02</span><h3>發佈前，先看見填答者</h3><p>指定名單、開放填答、預約期間與庫存限制各自說清楚。分享連結與 QR Code 集中管理。</p><div className="feature-visual people"><i>林</i><i>王</i><i>陳</i><b>+24</b></div></article>
          <article className="feature-card ink"><span className="feature-no">03</span><h3>結果不只是一張表</h3><p>即時掌握回收率、答案分布與文字回饋。需要深入分析時，再匯出乾淨資料。</p><div className="feature-visual chart"><i/><i/><i/><i/><i/></div></article>
        </div>
      </section>

      <section className="steps">
        <div><p className="section-kicker">簡單但不簡陋</p><h2>三步完成一份可靠問卷。</h2></div>
        <ol><li><b>建立架構</b><span>先寫調查目的，再用段落安排填答節奏。</span></li><li><b>選擇題型</b><span>依資料用途選題，而不是為了看起來豐富。</span></li><li><b>測試與發佈</b><span>用手機實際填一次，確認分支、必填與完成訊息。</span></li></ol>
      </section>

      <section className="guide" id="guide">
        <div className="guide-head"><div><p className="section-kicker">題型指南</p><h2>每一題，都有正確的問法。</h2><p>從常見選項到研究型題目，這裡提供可直接套用的設定案例。</p></div><label className="guide-search"><span>搜尋題型或情境</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="例如：評分、預約、圖片"/><i>⌕</i></label></div>
        <div className="guide-list">
          {list.map(([name, example, note], index) => <details key={name} open={!query && index < 3}><summary><span>{String(index + 1).padStart(2,"0")}</span><b>{name}</b><em>{example}</em><i>＋</i></summary><div className="guide-detail"><div><small>設定案例</small><p>{example}</p></div><div><small>設計提醒</small><p>{note}</p></div></div></details>)}
          {!list.length && <div className="empty-guide">找不到符合的題型。試試「選擇」、「評分」或「上傳」。</div>}
        </div>
      </section>

      <section className="final-cta"><p>你的下一份問卷，可以更清楚。</p><h2>把時間留給真正重要的問題。</h2><button className="pill light" onClick={() => go("/register")}>建立第一份問卷</button></section>
    </main>
    <footer><button className="landing-brand" onClick={() => scrollTo({top:0,behavior:"smooth"})}><span>問</span>問卷所</button><p>讓調查設計回到清楚、誠實與好用。</p><div><a href="#guide">使用指南</a><button onClick={() => go("/admin/login")}>管理者登入</button></div></footer>
  </div>;
}
