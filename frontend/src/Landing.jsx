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

const GUIDE_GROUPS = [
  { name: "基礎與文字", hint: "收集文字、日期與時間", items: ["簡答", "詳答", "日期／時間"] },
  { name: "標準選擇", hint: "讓填答者從選項中回答", items: ["單選題", "核取方塊", "下拉式選單", "圖片選擇"] },
  { name: "評分與矩陣", hint: "比較程度、分數與多個項目", items: ["線性刻度", "星級評分", "單選方格", "核取方塊格", "總計分配"] },
  { name: "視覺與多媒體", hint: "用圖片、檔案或互動畫面收集答案", items: ["檔案／圖片上傳", "簽名", "熱點點擊", "文字螢光筆", "地圖定位"] },
  { name: "進階研究與邏輯", hint: "處理排序、名額、偏好與同意流程", items: ["巢狀選擇", "項目排序", "限量／庫存", "最大差異法", "條款同意"] },
  { name: "個人化動態", hint: "依使用者資料帶入或追問", items: ["連結型題目"] },
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

const stepFor = (name) => {
  if (name.includes("巢狀")) return ["進入「問卷設計」，新增「巢狀選擇」。", "在 Excel 將每一層放在不同欄，例如 A 欄縣市、B 欄行政區、C 欄門市。", "選取資料後按 Ctrl+C，回到問卷所點資料框，再按 Ctrl+V。", "按「儲存」，用預覽確認選了第一層後才會出現第二層。"];
  if (name.includes("方格")) return ["新增題目後，先在「列」輸入要詢問的項目。", "在「欄」輸入每個項目共用的答案。", "單選方格每列只能選一格；核取方塊格每列可以選很多格。", "按「儲存」後用手機預覽，確認表格不會太寬。"];
  if (name.includes("上傳") || name.includes("圖片上傳")) return ["新增「檔案／圖片上傳」題。", "把允許的格式、大小與最多張數寫進題目說明。", "只有真的需要時才開啟「必填」。", "儲存後實際上傳一個測試檔案，確認看得到檔名。"];
  if (name.includes("分配")) return ["新增「總計分配」題，輸入要比較的項目。", "設定總分，例如 100 點。", "在題目中告訴填答者：全部數字加起來必須等於 100。", "預覽並測試少於或超過總分時的提示。"];
  if (name.includes("排序")) return ["新增「項目排序」題。", "每行輸入一個項目，建議 5 到 8 個。", "說清楚排序方向，例如最重要放最上面。", "預覽時試著拖曳，手機上也要能順利移動。"];
  if (name.includes("連結型")) return ["先到「使用者設定」建立 account 與要帶入的資料欄位。", "新增連結型題目，選擇要對應的使用者欄位。", "設定資料帶入後要顯示或追問的內容。", "用一個測試帳號登入預覽，確認帶入資料正確。"];
  return ["進入專案的「問卷設計」，按「新增題目」。", `在題型清單選擇「${name}」，再輸入清楚的題目。`, "依需要加入選項、說明，只有一定要回答時才開啟「必填」。", "按「儲存」，再用「預覽」親自填一次。"];
};

function AnswerPreview({ name, example }) {
  const many = name.includes("核取") || name.includes("上傳");
  const options = name.includes("評分") || name.includes("刻度") ? ["1", "2", "3", "4", "5"] : ["選項 A", "選項 B", "其他"];
  return <div className="answer-preview" aria-label={`${name}填答畫面範例`}>
    <div className="answer-browser"><i/><i/><i/><span>填答畫面</span></div>
    <div className="answer-sheet"><small>問題 1　<span>＊必填</span></small><strong>{example}</strong>
      {(name.includes("簡答") || name.includes("詳答") || name.includes("日期") || name.includes("時間") || name.includes("定位"))
        ? <div className="fake-input">請在這裡輸入答案…</div>
        : <div className="fake-options">{options.map(x => <label key={x}><i className={many ? "square" : ""}/>{x}</label>)}</div>}
    </div>
  </div>;
}

export default function Landing() {
  const [query, setQuery] = useState("");
  const list = useMemo(() => QUESTION_GUIDE.filter(x => x.join(" ").includes(query.trim())), [query]);
  const groupedList = useMemo(() => GUIDE_GROUPS.map(group => ({...group, guides: list.filter(item => group.items.includes(item[0]))})).filter(group => group.guides.length), [list]);
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
          {groupedList.map((group, groupIndex) => <section className="guide-group" key={group.name}><header><span>{group.name}</span><p>{group.hint}</p></header>{group.guides.map(([name, example, note], itemIndex) => <details key={name} open={!query && groupIndex === 0 && itemIndex === 0}><summary><b>{name}</b><em>{example}</em><i>＋</i></summary><div className="guide-detail"><div className="guide-copy"><section><small>這種題目適合什麼時候？</small><p>{note}</p></section><section><small>管理頁面怎麼設定？</small><ol>{stepFor(name).map(step => <li key={step}>{step}</li>)}</ol></section></div><section><small>填答者實際會看到</small><AnswerPreview name={name} example={example}/><p className="preview-caption">這是簡化示意；實際畫面會套用你的題目、選項與必填設定。</p></section></div></details>)}</section>)}
          {!list.length && <div className="empty-guide">找不到符合的題型。試試「選擇」、「評分」或「上傳」。</div>}
        </div>
      </section>

      <section className="final-cta"><p>你的下一份問卷，可以更清楚。</p><h2>把時間留給真正重要的問題。</h2><button className="pill light" onClick={() => go("/register")}>建立第一份問卷</button></section>
    </main>
    <footer><button className="landing-brand" onClick={() => scrollTo({top:0,behavior:"smooth"})}><span>問</span>問卷所</button><p>讓調查設計回到清楚、誠實與好用。</p><div><a href="#guide">使用指南</a><button onClick={() => go("/admin/login")}>管理者登入</button></div></footer>
  </div>;
}
