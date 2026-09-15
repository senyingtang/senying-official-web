import type { FaqItem } from '@syt/seo';
import type { Feature } from './types';

export interface LandingVariant {
  slug: string;
  path: string;
  name: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  lead: string;
  cardSummary: string;
  fits: string[];
  sections: Feature[];
  formFields: string[];
  tips: Feature[];
  faq: FaqItem[];
}

export const landingVariants: LandingVariant[] = [
  {
    slug: 'group-buy-promo',
    path: '/products/landing-page/group-buy-promo',
    name: '團購促銷頁',
    seoTitle: '團購促銷頁｜檔期優惠、方案說明與下單表單',
    seoDescription: '團購與檔期優惠適合用一頁式網頁呈現：商品重點、方案組合、截止時間與下單表單放在同一頁，手機上也好閱讀。',
    h1: '團購促銷頁，把優惠、截止時間和下單方式放在同一頁',
    lead: '社群貼文很快被洗掉，把團購資訊整理成一個頁面，分享連結時資訊完整，也方便收集訂購資料。',
    cardSummary: '檔期優惠、方案組合與截止時間，搭配下單表單。',
    fits: ['社群團購與預購', '節慶檔期優惠', '新品限時方案'],
    sections: [
      { title: '優惠主視覺', description: '商品照片、優惠重點與截止時間。' },
      { title: '方案組合', description: '不同組合的內容並排比較。' },
      { title: '取貨與出貨說明', description: '出貨時間、取貨方式與注意事項。' },
      { title: '下單表單', description: '姓名、電話、方案與數量。' },
    ],
    formFields: ['姓名', '手機', '方案', '數量', '取貨方式', '備註'],
    tips: [
      { title: '截止時間放在第一屏', description: '截止日期越早看到，越不容易錯過。' },
      { title: '方案用卡片比較', description: '不同組合並排呈現，內容差異一眼看懂。' },
      { title: '取貨規則寫清楚', description: '出貨時間、取貨地點與注意事項，減少私訊詢問。' },
    ],
    faq: [
      { question: '可以設定截止時間嗎？', answer: '頁面可以清楚標示截止時間；自動關閉表單的功能會在後續版本提供。' },
      { question: '可以直接線上付款嗎？', answer: '第一版以下單表單收集資料，線上付款會在金流功能開放後提供。' },
      { question: '可以放多個方案嗎？', answer: '可以，方案區塊可以新增多個組合。' },
    ],
  },
  {
    slug: 'event-registration',
    path: '/products/landing-page/event-registration',
    name: '活動報名頁',
    seoTitle: '活動報名頁｜講座、市集與活動線上報名',
    seoDescription: '講座、市集、展覽或聚會的線上報名頁：活動時間地點、流程、講者介紹與報名表單，報名資料集中保存在後台。',
    h1: '活動報名頁，時間、地點、流程和報名一次說清楚',
    lead: '把活動資訊與報名表單放在同一頁，參加者不必在貼文和表單之間來回確認。',
    cardSummary: '活動資訊、流程、講者介紹與報名表單。',
    fits: ['講座與分享會', '市集與展覽', '社群聚會與體驗活動'],
    sections: [
      { title: '活動資訊', description: '時間、地點、費用與名額。' },
      { title: '活動流程', description: '依時段列出內容安排。' },
      { title: '講者或主辦介紹', description: '讓參加者了解主辦單位。' },
      { title: '報名表單', description: '姓名、聯絡方式、人數與備註。' },
    ],
    formFields: ['姓名', 'Email', '手機', '參加人數', '場次', '備註'],
    tips: [
      { title: '時間地點放第一屏', description: '參加者最先確認的就是能不能到。' },
      { title: '流程用時間軸', description: '依時段列出內容，比整段文字好讀。' },
      { title: '報名按鈕重複出現', description: '看完流程或講者介紹後，隨時可以報名。' },
    ],
    faq: [
      { question: '報名資料可以匯出嗎？', answer: '報名資料保存在後台表單紀錄，匯出功能會在後台提供。' },
      { question: '可以限制報名人數嗎？', answer: '第一版可在頁面標示名額；自動額滿關閉會在後續版本提供。' },
      { question: '可以寄確認信嗎？', answer: '通知信功能規劃中，目前可以在後台查看報名紀錄後聯繫。' },
    ],
  },
  {
    slug: 'course-enrollment',
    path: '/products/landing-page/course-enrollment',
    name: '課程招生頁',
    seoTitle: '課程招生頁｜課程大綱、講師介紹與報名諮詢',
    seoDescription: '課程與工作坊招生頁：適合對象、課程大綱、講師介紹、上課方式與報名諮詢表單，讓學員在報名前就能看懂課程內容。',
    h1: '課程招生頁，讓學員報名前就看懂課程內容',
    lead: '學員最常問的是上什麼、適不適合自己、怎麼上課。把這些答案放在頁面裡，可以減少重複回覆的訊息。',
    cardSummary: '課程大綱、講師介紹、上課方式與報名諮詢。',
    fits: ['線上課程與實體課程', '工作坊與短期班', '補習班與才藝課招生'],
    sections: [
      { title: '適合對象', description: '說明誰適合、誰不適合這門課。' },
      { title: '課程大綱', description: '依堂數或單元列出內容。' },
      { title: '講師介紹', description: '相關經歷與教學方式。' },
      { title: '報名與諮詢表單', description: '想上的梯次、聯絡方式與問題。' },
    ],
    formFields: ['姓名', '手機或 LINE ID', '想報名的梯次', '目前程度', '想問的問題'],
    tips: [
      { title: '先說適合誰', description: '適合與不適合都寫，學員更容易判斷。' },
      { title: '大綱依堂數列出', description: '每堂上什麼一目了然，減少報名前的疑問。' },
      { title: '講師經歷只放相關的', description: '和課程主題有關的經驗最有說服力。' },
    ],
    faq: [
      { question: '可以放多個梯次嗎？', answer: '可以，在課程資訊區塊列出不同梯次的時間。' },
      { question: '可以放學員心得嗎？', answer: '可以放在見證區塊，請使用真實且取得同意的內容。' },
      { question: '可以加入影片嗎？', answer: '可以放入影片連結，建議使用 YouTube 等平台嵌入。' },
    ],
  },
  {
    slug: 'booking-form',
    path: '/products/landing-page/booking-form',
    name: '預約表單頁',
    seoTitle: '預約表單頁｜服務介紹、時段說明與線上預約',
    seoDescription: '美業、健身、顧問與維修服務的預約頁：服務項目、價格說明、營業時段與預約表單，客人不用私訊也能先留下需求。',
    h1: '預約表單頁，客人不用私訊也能先留下需求',
    lead: '把服務項目、注意事項和預約表單放在一起，客人可以先看清楚再預約，你也能集中處理預約需求。',
    cardSummary: '服務項目、時段說明與預約表單。',
    fits: ['美髮、美甲與美容服務', '健身教練與體驗課', '顧問諮詢與到府服務'],
    sections: [
      { title: '服務項目', description: '服務內容、時間長度與價格說明。' },
      { title: '營業與預約時段', description: '可預約的日期與時段規則。' },
      { title: '注意事項', description: '取消規則與到店須知。' },
      { title: '預約表單', description: '姓名、電話、服務項目與希望時段。' },
    ],
    formFields: ['姓名', '手機', '服務項目', '希望日期', '希望時段', '備註'],
    tips: [
      { title: '服務與價格說明先看到', description: '客人確認內容與價格後，再決定預約。' },
      { title: '時段規則寫清楚', description: '可預約的日期、時段與提前多久預約。' },
      { title: '取消規則放在表單前', description: '送出前就知道規則，減少爭議。' },
    ],
    faq: [
      { question: '可以自動顯示空檔嗎？', answer: '第一版以表單收集希望時段，行事曆與自動排程會在後續評估。' },
      { question: '預約資料誰看得到？', answer: '只有你的工作區成員可以在後台查看預約紀錄。' },
      { question: '可以放 Google 地圖嗎？', answer: '可以在頁面中放入地圖連結或嵌入地圖。' },
    ],
  },
];
