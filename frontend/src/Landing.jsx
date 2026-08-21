import { useMemo, useState } from "react";
import { AdvancedQuestion } from "./AdvancedQuestions";

const go = (path) => { location.hash = path; };

const QUESTION_GUIDE = [
  ["簡答", "收集單行的簡短文字或特定格式資料", "適合姓名、編號、Email、電話或一句話回答。可設定文字、數字、Email 或電話格式驗證。", "short"],
  ["詳答", "收集可分段輸入的較長文字內容", "適合原因說明、意見、心得、需求描述或補充資訊。題目要聚焦，避免只寫「其他建議」。", "paragraph"],
  ["日期", "讓填答者選擇一個日期", "例如生日、到訪日、預計完成日或事件發生日。此題只收日期；若還需要時間，應另外新增時間題。", "date"],
  ["時間", "讓填答者選擇一個時間", "例如抵達時間、聯絡時間、開始時間或結束時間。請在題目說明中交代時區與可選範圍。", "time"],
  ["單選題", "從多個選項中選擇一個答案", "適合互斥且只能成立一項的答案，例如身分類別、偏好方案或是否同意；可能同時成立時請改用核取方塊。", "single"],
  ["核取方塊", "從多個選項中選擇一個或多個答案", "例如感興趣的主題、使用過的功能、可配合日期或符合的條件。題目中應明說可複選。", "checkbox"],
  ["下拉式選單", "從收合的選項清單中選擇一個答案", "適合選項較多且名稱較短的清單，例如單位、類別或年份。選項很少時，單選題通常較容易比較。", "dropdown"],
  ["圖片選擇", "以圖片呈現選項，讓填答者選擇", "例如設計偏好、商品樣式、圖像辨識或版面比較。圖片應使用一致比例並附文字標籤。", "image_choice"],
  ["線性刻度", "在連續刻度上選擇一個程度或分數", "可用於滿意、同意、困難、頻率或推薦意願。請清楚說明最低與最高刻度各代表什麼。", "scale"],
  ["星級評分", "以星號快速選擇一個評分", "適合整體評價、品質、使用感受或喜好程度。星星帶有好壞方向，不適合沒有正負方向的量測。", "star_rating"],
  ["單選方格", "對多個列項目，各選擇一個欄位答案", "例如同時評估多個項目的滿意度、同意程度或使用頻率。每一列只能選一格。", "radio_grid"],
  ["核取方塊格", "對多個列項目，各選擇一個或多個欄位答案", "例如不同日期可配合的時段，或多個項目各自符合的條件。手機畫面上不宜安排過多列與欄。", "checkbox_grid"],
  ["總計分配", "將固定總數分配到多個項目", "例如分配預算、時間、資源或相對權重。所有輸入值加總必須等於管理員設定的目標總數。", "allocation"],
  ["巢狀選擇", "依前一層選擇，逐層縮小下一層選項", "例如地區到地點、部門到人員、分類到品項。需先整理每一條完整階層路徑。", "cascading"],
  ["項目排序", "將多個項目排出先後順序", "可以依重要性、偏好、處理優先順序或理想流程排列。題目必須明確交代排序方向。", "ranking"],
  ["限量／庫存", "從具有剩餘數量限制的選項中選擇", "例如場次名額、商品、物資或配額。填答者正式送出後才會扣除數量。", "inventory"],
  ["最大差異法", "在多組項目中反覆選出最偏好與最不偏好的項目", "適合比較功能、品牌、購買因素或需求優先程度。這是研究型題型，不等同一般的最佳／最差單選題。", "maxdiff"],
  ["檔案／圖片上傳", "讓填答者從裝置選擇並上傳圖片檔案", "目前支援 JPG、PNG、WebP、HEIC 與 HEIF，例如照片、證明影像、畫面截圖或現場紀錄；單檔上限 5 MB。", "multi_image"],
  ["簽名", "讓填答者在畫面上手寫簽名", "例如簽收、內容確認或現場作業留存。系統收集的是簽名圖像，不應直接宣稱具有特定法律效力。", "signature"],
  ["熱點點擊", "在指定圖片上點選一個或多個位置", "例如標記注意區域、問題部位、偏好位置或空間中的特定位置。需提供清楚底圖。", "heatmap"],
  ["文字螢光筆", "在指定文字中選取並標記文字片段", "例如標出重要、不清楚、認同或需要修改的內容。請先說明不同標記的意義。", "text_highlight"],
  ["地圖定位", "透過裝置定位或手動輸入地址與座標", "例如填寫所在地、標記事件位置、指定集合點或回報需處理的位置。應說明位置資料的用途。", "location"],
  ["條款同意", "顯示一段內容，要求填答者確認是否同意", "例如使用規範、注意事項、活動聲明、個資告知或授權內容。不同目的的同意事項應分開詢問。", "terms"],
  ["連結型多選題", "依填寫者帳號顯示不同的可複選項目", "例如每人可處理的案件、可參加項目或負責對象不同。項目需依 account 預先設定。", "linked_multi"],
  ["連結型簡答題", "依填寫者帳號顯示不同項目，並逐項輸入文字", "例如對個人負責的案件、設備或任務逐一填寫說明。項目需依 account 預先設定。", "linked_short"],
  ["連結型矩陣題", "依帳號顯示不同項目，並回答相同的一組問項", "適合讓不同人針對自己負責的據點、對象或案件，逐項回答固定問題。使用者 ID 只用於配對，不會顯示。", "linked_matrix"],
];

const GUIDE_GROUPS = [
  { name: "基礎與文字", hint: "輸入文字、日期或時間", items: ["簡答", "詳答", "日期", "時間"] },
  { name: "標準選擇", hint: "讓填答者從選項中回答", items: ["單選題", "核取方塊", "下拉式選單", "圖片選擇"] },
  { name: "評分與矩陣", hint: "表達程度、評分或多項對照", items: ["線性刻度", "星級評分", "單選方格", "核取方塊格", "總計分配"] },
  { name: "視覺與多媒體", hint: "透過圖片、位置或手寫內容回答", items: ["檔案／圖片上傳", "簽名", "熱點點擊", "文字螢光筆", "地圖定位"] },
  { name: "進階研究與邏輯", hint: "處理階層、排序、數量與研究型回答", items: ["巢狀選擇", "項目排序", "限量／庫存", "最大差異法", "條款同意"] },
  { name: "依帳號顯示內容", hint: "為不同填寫者提供不同項目", items: ["連結型多選題", "連結型簡答題", "連結型矩陣題"] },
];

function MiniBuilder() {
  return <div className="product-preview" aria-label="問卷編輯器示意">
    <div className="preview-bar"><div><i /><span /><span /></div><p><b />所有變更已儲存</p></div>
    <div className="preview-body">
      <aside><b>問卷設計</b><span>填答狀況</span><span>統計分析</span><span>分享設定</span></aside>
      <div className="preview-canvas">
        <div className="preview-title"><small>顧客體驗調查　·　編輯中</small><strong>讓每一個問題都有目的。</strong></div>
        <div className="preview-question"><em>01</em><div><b>這次體驗最打動你的地方？</b><p>選擇一個最符合的答案</p><div className="preview-options"><i /><i /><i /></div></div></div>
        <div className="preview-question muted-card"><em>02</em><div><b>你願意推薦給朋友嗎？</b><div className="preview-scale">0<span />1<span />2<span />3<span />4<span />5</div></div></div>
      </div>
    </div>
  </div>;
}

const GUIDE_STEPS = {
  "簡答": ["新增「簡答」，輸入題目與必要的格式說明。", "選擇無限制、數字、Email 或電話格式。", "只有不可缺少的資料才勾選「必填」。", "預覽並輸入正確與錯誤格式各一次。"],
  "詳答": ["新增「詳答」，把希望說明的範圍寫進題目。", "在說明欄補充需要包含的資訊。", "依實際需要決定是否必填。", "以手機預覽，確認長文字容易閱讀與輸入。"],
  "日期": ["新增「日期」並說明要填哪一個日期。", "在說明欄寫清楚可填範圍或截止日。", "需要時間時另外新增「時間」題。", "預覽並使用日期選擇器測試。"],
  "時間": ["新增「時間」並說明要填哪一個時間點。", "在說明欄交代時區與可選時段。", "需要日期時另外新增「日期」題。", "預覽並使用時間選擇器測試。"],
  "單選題": ["新增「單選題」，每個答案按「＋新增選項」建立。", "確認所有選項互斥，不會同時成立。", "需要分流時，替各選項設定前往區段或送出表單。", "逐一測試每個選項的跳題結果。"],
  "核取方塊": ["新增「核取方塊」，每個答案按「＋新增選項」建立。", "在題目或說明中標示可複選。", "避免選項重疊，必要時加入「其他」或「不適用」。", "預覽並測試同時勾選多個答案。"],
  "下拉式選單": ["新增「下拉式選單」，建立所有清單項目。", "依填答者容易尋找的方式排列選項。", "需要分流時設定各選項的前往區段。", "預覽確認預設狀態仍是「請選擇」。"],
  "圖片選擇": ["新增「圖片選擇題」，為每個選項輸入名稱。", "在選項旁貼上圖片網址或按「直接上傳」。", "依需要設定是否允許多選。", "用桌面與手機預覽圖片比例和選取狀態。"],
  "線性刻度": ["新增「線性刻度」，以選項數量決定刻度格數。", "逐一修改刻度文字，說明每個值的含義。", "在題目中明確寫出評分方向。", "預覽滑桿與所有刻度標籤。"],
  "星級評分": ["新增「星級評分題」。", "在「最高星數」設定 2 至 10 星。", "在題目或說明中交代低星與高星的含義。", "預覽並點選不同星數確認顯示。"],
  "單選方格": ["新增「單選方格」。", "在左側「列選項」每行輸入一個待回答項目。", "在右側「欄選項」每行輸入一個共用答案。", "用手機預覽，確認表格不會因欄位太多而難以作答。"],
  "核取方塊格": ["新增「核取方塊格」。", "在左側「列選項」輸入項目，右側「欄選項」輸入共用答案。", "在說明中標示每列可以複選。", "預覽並測試同一列勾選多欄。"],
  "總計分配": ["新增「總計分配題」，建立要分配的項目。", "設定「目標總數」與顯示單位。", "在題目中說明所有項目的總和必須等於目標。", "預覽並測試不足、超過及正好符合目標三種情況。"],
  "巢狀選擇": ["新增「巢狀選擇」。", "在 Excel 將每一層放在不同欄，每列代表一條完整路徑。", "複製資料後貼入「巢狀選單資料」。", "預覽確認選擇前一層後，下一層只顯示對應項目。"],
  "項目排序": ["新增「項目排序題」，每行建立一個待排序項目。", "設定「最多排序數量」；0 代表全部都要排序。", "在題目中說明由上到下的排序方向。", "以按鈕及拖曳各測試一次，並檢查手機操作。"],
  "限量／庫存": ["新增「限量／庫存題」，建立可選項目。", "在各選項右側輸入初始庫存。", "確認額滿項目的顯示方式與替代說明。", "用測試問卷正式送出，確認送出後才扣除庫存。"],
  "最大差異法": ["新增「最大差異法題」，建立所有待比較項目。", "設定每輪顯示選項數與交叉題組輪數。", "確認各選項位於相同比較層級。", "完整預覽所有輪次，確認最佳與最差不能選同一項。"],
  "檔案／圖片上傳": ["新增「檔案／圖片上傳」，設定最多檔案數。", "在說明中寫明支援 JPG、PNG、WebP、HEIC、HEIF，且單檔上限 5 MB。", "說明圖片用途，非必要不要設為必填。", "實際上傳、重新開啟及刪除一個測試圖片。"],
  "簽名": ["新增「簽名題」，在題目前呈現要確認的內容。", "說明簽名用途及資料保存方式。", "預覽測試書寫、復原、清除與確認簽名。", "重新開啟測試回答，確認簽名預覽與重簽功能。"],
  "熱點點擊": ["新增「熱點點擊題」。", "在「底圖網址」貼上網址，或按「直接上傳」。", "在說明中交代要點選的位置與次數。", "分別用桌面和手機點擊，確認標記落在預期位置。"],
  "文字螢光筆": ["新增「文字螢光筆題」。", "在「要標記的原文」輸入固定文字。", "在題目中說明「喜歡」與「反感」標記代表什麼。", "預覽選取文字、切換標記及清除結果。"],
  "地圖定位": ["新增「地圖定位題」。", "在題目說明中交代要提供哪一個位置及資料用途。", "填答者可搜尋地址、輸入經緯度或取得目前位置。", "預覽測試地址搜尋、定位權限與地圖微調。"],
  "條款同意": ["新增「條款同意題」。", "在「條款內容」輸入完整且可閱讀的文字。", "不同目的的同意事項分成不同題目。", "預覽確認短條款可直接勾選，長條款需捲至底部。"],
  "連結型多選題": ["先到「使用者設定」建立填寫者帳號。", "新增「連結型多選題」，點「編輯連結型選項」。", "從 Excel 貼上 account、value、label 三欄；同一帳號可有多列。", "等候「已自動儲存」，再用不同帳號登入確認各自的複選項目。"],
  "連結型簡答題": ["先到「使用者設定」建立填寫者帳號。", "新增「連結型簡答題」，點「編輯連結型選項」。", "從 Excel 貼上 account、value、label 三欄；每列會成為一個文字輸入項目。", "等候「已自動儲存」，再用不同帳號登入確認各自的輸入項目。"],
  "連結型矩陣題": ["先到「使用者設定」建立填寫者帳號。", "新增「連結型矩陣題」，左側從 Excel 貼上使用者 ID、顯示項目兩欄。", "右側按「新增問項」，為每個橫向欄位設定名稱、簡答／單選／複選題型及選項。", "等候自動儲存，再用不同帳號登入確認只看到自己獲配的項目。"],
};
const stepFor = (name) => GUIDE_STEPS[name] || ["新增題目並輸入清楚的題目與說明。", "完成題型專屬設定。", "依必要性決定是否必填。", "儲存後實際預覽作答。"];

const option = (value, label = value) => ({ value, label });
const previewImage = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='640' height='260'><rect width='640' height='260' fill='#e8ece7'/><rect x='55' y='45' width='220' height='145' rx='12' fill='#c8d6cc'/><circle cx='445' cy='115' r='62' fill='#a8bcb0'/><path d='M0 235L165 145l115 65 120-90 240 115' fill='none' stroke='#64796d' stroke-width='12'/></svg>");
const SAMPLE_TITLES = {
  short: "請輸入識別代碼", paragraph: "請補充說明你的想法", date: "請選擇日期", time: "請選擇時間",
  single: "請選擇最符合的一項", checkbox: "請選擇所有符合的項目", dropdown: "請從清單選擇一項",
  image_choice: "請選擇偏好的圖片", scale: "請選擇符合你的程度", star_rating: "請給予整體評分",
  radio_grid: "請為各項目選擇一個程度", checkbox_grid: "請為各項目選擇所有符合條件",
  allocation: "請將 100 點分配給下列項目", cascading: "請依序選擇分類與項目", ranking: "請由上到下排列優先順序",
  inventory: "請選擇項目與數量", maxdiff: "每輪請選出最偏好與最不偏好的一項", multi_image: "請上傳所需圖片或檔案",
  signature: "請在下方簽名", heatmap: "請在圖片上點選指定位置", text_highlight: "請選取並標記文字片段",
  location: "請提供一個位置", terms: "請閱讀內容並確認是否同意", linked_multi: "請選擇你可處理的項目",
  linked_short: "請逐項填寫說明",
  linked_matrix: "請針對負責項目回答固定問項",
};
function sampleQuestion(name, type, summary) {
  const base = { id: `guide-${type}`, type, title: SAMPLE_TITLES[type] || summary, description: "以下為示範資料", required: true, options: [option("a", "項目 A"), option("b", "項目 B"), option("c", "項目 C")], config: {} };
  if (type === "scale") base.options = [1, 2, 3, 4, 5].map(x => option(String(x), String(x)));
  if (["radio_grid", "checkbox_grid"].includes(type)) Object.assign(base, { options: [option("item1", "項目一"), option("item2", "項目二")], config: { cols: ["低", "中", "高"] } });
  if (type === "star_rating") base.config = { max: 5 };
  if (type === "allocation") Object.assign(base, { options: [option("a", "項目 A"), option("b", "項目 B"), option("c", "項目 C")], config: { target: 100, unit: "點" } });
  if (type === "cascading") base.options = [option("類別/項目"), option("類別 A / 項目一"), option("類別 A / 項目二"), option("類別 B / 項目三")];
  if (type === "ranking") base.config = { rankLimit: 3 };
  if (type === "inventory") base.options = [{ value: "a", label: "項目 A", remaining: 8 }, { value: "b", label: "項目 B", remaining: 3 }];
  if (type === "maxdiff") Object.assign(base, { options: [option("a", "因素 A"), option("b", "因素 B"), option("c", "因素 C"), option("d", "因素 D")], config: { setSize: 4, rounds: 1 } });
  if (type === "image_choice") base.options = [{ value: "a", label: "圖片 A", imageUrl: previewImage }, { value: "b", label: "圖片 B", imageUrl: previewImage }];
  if (type === "heatmap") base.config = { imageUrl: previewImage };
  if (type === "text_highlight") base.config = { text: "這是一段可供填答者選取並標記的示範文字。" };
  if (type === "terms") base.config = { terms: "請閱讀這段示範內容，確認理解後再勾選同意。", version: "guide" };
  if (type === "linked_multi") base.options = [option("case-a", "此帳號的項目一"), option("case-b", "此帳號的項目二")];
  if (type === "linked_short") base.options = [option("case-a", "此帳號的項目一"), option("case-b", "此帳號的項目二")];
  if (type === "linked_matrix") Object.assign(base, { options:[option("site-a","台北據點"),option("site-b","桃園據點")], config:{prompts:[{id:"service",label:"服務品質"},{id:"clean",label:"環境整潔"}]} });
  return base;
}

function BasicPreview({ q, value, onChange }) {
  const common = { className: "input", value: value ?? "", onChange: e => onChange(e.target.value) };
  if (q.type === "paragraph") return <textarea {...common} />;
  if (["short", "date", "time"].includes(q.type)) return <input type={q.type === "short" ? "text" : q.type} {...common} />;
  if (q.type === "dropdown") return <select {...common}><option value="">請選擇</option>{q.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  if (q.type === "single") return <div className="stack">{q.options.map(o => <label key={o.value}><input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} /> {o.label}</label>)}</div>;
  if (["checkbox", "linked_multi"].includes(q.type)) { const vals = Array.isArray(value) ? value : []; return <div className="stack">{q.options.map(o => <label key={o.value}><input type="checkbox" checked={vals.includes(o.value)} onChange={e => onChange(e.target.checked ? [...vals, o.value] : vals.filter(x => x !== o.value))} /> {o.label}</label>)}</div>; }
  if (q.type === "linked_short") { const vals = value && typeof value === "object" ? value : {}; return <div className="stack">{q.options.map(o => <label className="field" key={o.value}><span>{o.label}</span><input className="input" value={vals[o.value] || ""} onChange={e => onChange({ ...vals, [o.value]: e.target.value })} /></label>)}</div>; }
  if (q.type === "linked_matrix") { const vals=value&&typeof value==="object"?value:{}; return <div className="table-wrap"><table className="grid-table"><thead><tr><th>項目</th>{q.config.prompts.map(p=><th key={p.id}>{p.label}</th>)}</tr></thead><tbody>{q.options.map(o=><tr key={o.value}><th>{o.label}</th>{q.config.prompts.map(p=><td key={p.id}><input className="input" value={vals[o.value]?.[p.id]||""} onChange={e=>onChange({...vals,[o.value]:{...vals[o.value],[p.id]:e.target.value}})} /></td>)}</tr>)}</tbody></table></div>; }
  if (q.type === "scale") return <div className="stack"><input type="range" min="1" max="5" value={value || 1} onChange={e => onChange(e.target.value)} /><div className="row spread small muted">{q.options.map(o => <span key={o.value}>{o.label}</span>)}</div></div>;
  if (["radio_grid", "checkbox_grid"].includes(q.type)) { const radio = q.type === "radio_grid"; return <div className="table-wrap"><table className="grid-table"><thead><tr><th></th>{q.config.cols.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{q.options.map(r => <tr key={r.value}><td>{r.label}</td>{q.config.cols.map(c => <td key={c}><input type={radio ? "radio" : "checkbox"} name={`${q.id}-${r.value}`} /></td>)}</tr>)}</tbody></table></div>; }
  if (q.type === "multi_image") return <label className="dropzone">選擇檔案（單檔 5 MB，最多 5 個）<input hidden type="file" multiple /></label>;
  if (q.type === "signature") return <div className="stack"><canvas className="signature" aria-label="簽名畫布"></canvas><div className="row"><button type="button" disabled className="btn secondary">清除</button><button type="button" disabled className="btn secondary">復原</button><button type="button" disabled className="btn primary">確認簽名</button></div></div>;
  return <AdvancedQuestion q={q} value={value} onChange={onChange} disabled={false} />;
}

function AnswerPreview({ name, summary, type }) {
  const q = useMemo(() => sampleQuestion(name, type, summary), [name, type, summary]);
  const [value, setValue] = useState("");
  return <div className="answer-preview" aria-label={`${name}填答畫面範例`}>
    <div className="answer-browser"><i /><i /><i /><span>填答畫面</span></div>
    <div className="answer-sheet"><small>問題 1　<span>＊必填</span></small><div className="question stack"><div><strong>{q.title} <span className="required">*</span></strong><div className="muted small">{q.description}</div></div><BasicPreview q={q} value={value} onChange={setValue} /></div>
    </div>
  </div>;
}

export default function Landing() {
  const [query, setQuery] = useState("");
  const list = useMemo(() => QUESTION_GUIDE.filter(x => x.join(" ").includes(query.trim())), [query]);
  const groupedList = useMemo(() => GUIDE_GROUPS.map(group => ({ ...group, guides: list.filter(item => group.items.includes(item[0])) })).filter(group => group.guides.length), [list]);
  return <div className="landing">
    <nav className="landing-nav" aria-label="主要導覽">
      <button className="landing-brand" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><span>問</span>問卷所</button>
      <div className="landing-links"><a href="#features">功能</a><a href="#guide">題型指南</a><button className="text-link" onClick={() => go("/admin/login")}>登入</button><button className="nav-cta" onClick={() => go("/register")}>開始建立</button></div>
    </nav>

    <main>
      <section className="landing-hero">
        <div className="eyebrow">SURVEY, MADE THOUGHTFUL</div>
        <h1>問得更好，<br />答案自然更清楚。</h1>
        <p>操作直覺、題型豐富，而且免費。從 20+ 種問項、名單與填答權限，到即時統計與 Excel／CSV 匯出，一個地方就能完成。</p>
        <div className="hero-actions"><button className="pill primary" onClick={() => go("/register")}>免費建立第一份問卷</button><a className="pill link" href="#features">看看如何運作 <span>→</span></a></div>
        <div className="hero-proof" aria-label="產品特色"><span>免信用卡</span><span>支援匿名填答</span><span>Excel／CSV 匯出</span></div>
        <p className="preview-label">從設計到回收，集中在同一個工作區</p>
        <MiniBuilder />
      </section>

      <section className="promise" id="features">
        <p className="section-kicker">從想法到洞察</p>
        <h2>少一點設定，多一點理解。</h2>
        <div className="feature-grid">
          <article className="feature-card warm"><span className="feature-no">01</span><h3>像寫文件一樣設計</h3><p>把題目拖進段落、即時調整順序。基礎題型與進階研究題型放在清楚的分類中，不必猜功能藏在哪。</p><div className="feature-visual lines"><i /><i /><i /></div></article>
          <article className="feature-card blue"><span className="feature-no">02</span><h3>能開放大眾填寫，也能精準設定答題者名單</h3><p>除了像 Google 表單一樣，讓任何取得連結的人填寫，也能指定填答者並驗證身分，確保調查樣本來自真正需要的對象。</p><div className="feature-visual people"><i>林</i><i>王</i><i>陳</i><b>+24</b></div></article>
          <article className="feature-card ink"><span className="feature-no">03</span><h3>結果不只是一張表</h3><p>即時掌握回收率、答案分布與文字回饋。需要深入分析時，再匯出乾淨資料。</p><div className="feature-visual chart"><i /><i /><i /><i /><i /></div></article>
        </div>
      </section>

      <section className="steps">
        <div><p className="section-kicker">輕鬆擁有專業設計的質感</p><h2>三步完成一份可靠問卷。</h2></div>
        <ol><li><b>建立架構</b><span>先寫調查目的，再用段落安排填答節奏。</span></li><li><b>選擇題型</b><span>依資料用途選題，而不是為了看起來豐富。</span></li><li><b>測試與發佈</b><span>用手機實際填一次，確認分支、必填與完成訊息。</span></li></ol>
      </section>

      <section className="guide" id="guide">
        <div className="guide-head"><div><p className="section-kicker">題型指南</p><h2>每一題，都有正確的問法。</h2><p>從常見選項到研究型題目，這裡提供可直接套用的設定案例。</p></div><label className="guide-search"><span>搜尋題型或情境</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="例如：評分、預約、圖片" /><i>⌕</i></label></div>
        <div className="guide-list">
          {groupedList.map((group, groupIndex) => <section className="guide-group" key={group.name}><header><span>{group.name}</span><p>{group.hint}</p></header>{group.guides.map(([name, summary, note, type], itemIndex) => <details key={name} open={!query && groupIndex === 0 && itemIndex === 0}><summary><b>{name}</b><em>{summary}</em><i>＋</i></summary><div className="guide-detail"><div className="guide-copy"><section><small>這種題目適合什麼時候？</small><p>{note}</p></section><section><small>管理頁面怎麼設定？</small><ol>{stepFor(name).map(step => <li key={step}>{step}</li>)}</ol></section></div><section><small>填答者畫面預覽</small><AnswerPreview name={name} summary={summary} type={type} /><p className="preview-caption">預覽使用與正式填答頁相同的題型控制；內容為不含個資的示範資料。</p></section></div></details>)}</section>)}
          {!list.length && <div className="empty-guide">找不到符合的題型。試試「選擇」、「評分」或「上傳」。</div>}
        </div>
      </section>

      <section className="final-cta"><p>你的下一份問卷，可以更清楚。</p><h2>把時間留給真正重要的問題。</h2><button className="pill light" onClick={() => go("/register")}>建立第一份問卷</button></section>
    </main>
    <footer><button className="landing-brand" onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><span>問</span>問卷所</button><p>讓調查設計回到清楚、誠實與好用。</p><div><a href="#guide">使用指南</a><button onClick={() => go("/admin/login")}>管理者登入</button></div></footer>
  </div>;
}
