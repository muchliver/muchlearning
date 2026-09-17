/**
 * 出題練習系統 - 前端核心邏輯 (app.js)
 * v3.0 旗艦版：全量 31,302 筆題庫
 * 支援 8 大核心題型：克漏字、錯字訂正、重組造句、國字注音、近義替換、情境成語、關聯詞複句、照樣仿寫
 * 嚴格保證出題題數 100% 精準對齊所選題數
 */

(function () {
  'use strict';

  // 全域題庫狀態
  let rawBank = [];
  let bankByType = {
    idiom: [],
    vocabulary: [],
    sentence: [],
    ellipsis: [],
    withSynonyms: [],
    withZhuyin: []
  };

  // 常見國語文易錯字對照庫 (用於形音義錯別字出題)
  const COMMON_TYPO_MAP = {
    '部': '步', '步': '部',
    '茅': '矛', '矛': '茅',
    '及': '急', '急': '及',
    '厲': '利', '利': '厲',
    '題': '提', '提': '題',
    '規': '歸', '歸': '規',
    '絕': '決', '決': '絕',
    '蜂': '峰', '峰': '蜂',
    '湧': '勇', '勇': '湧',
    '容': '融', '融': '容',
    '景': '井', '井': '景',
    '致': '至', '至': '致',
    '辨': '辯', '辯': '辨',
    '截': '接', '接': '截',
    '再': '在', '在': '再',
    '度': '渡', '渡': '度',
    '宣': '喧', '喧': '宣',
    '蔚': '慰', '慰': '蔚',
    '滄': '蒼', '蒼': '滄',
    '券': '卷', '卷': '券',
    '聯': '連', '連': '聯',
    '藉': '借', '借': '藉',
    '副': '幅', '幅': '副',
    '馳': '弛', '弛': '馳',
    '濫': '爛', '爛': '濫',
    '璧': '壁', '壁': '璧',
    '籌': '愁', '愁': '籌',
    '概': '慨', '慨': '概',
    '履': '屢', '屢': '履',
    '鍛': '段', '練': '鍊',
    '甘': '柑', '迫': '破',
    '名': '明', '班': '般',
    '抒': '舒', '煞': '殺',
    '蹙': '促', '悄': '俏',
    '按': '安', '首': '手'
  };

  // 線上測驗狀態
  let currentQuizList = [];
  let currentQuizIndex = 0;
  let quizScore = 0;
  let quizStreak = 0;
  let quizCurrentMode = 'idiom';
  let unscrambleUserSlots = [];

  // 字典檢索狀態
  let dictFilteredList = [];
  let dictCurrentPage = 1;
  const DICT_PAGE_SIZE = 24;

  // DOM 元素快取
  const elements = {
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    totalWordCount: document.getElementById('totalWordCount'),

    // A4 試卷控制器
    paperTitleInput: document.getElementById('paperTitleInput'),
    paperSubtitleInput: document.getElementById('paperSubtitleInput'),
    targetScopeSelect: document.getElementById('targetScopeSelect'),
    questionCountSelect: document.getElementById('questionCountSelect'),
    layoutSelect: document.getElementById('layoutSelect'),
    chkShowZhuyin: document.getElementById('chkShowZhuyin'),
    chkShowHeaderBox: document.getElementById('chkShowHeaderBox'),
    chkIncludeAnswerKey: document.getElementById('chkIncludeAnswerKey'),
    chkShowMimicPattern: document.getElementById('chkShowMimicPattern'),
    btnGeneratePaper: document.getElementById('btnGeneratePaper'),
    btnPrintPaper: document.getElementById('btnPrintPaper'),

    // A4 預覽區
    displayPaperTitle: document.getElementById('displayPaperTitle'),
    displayPaperSubtitle: document.getElementById('displayPaperSubtitle'),
    displayAnswerSubtitle: document.getElementById('displayAnswerSubtitle'),
    studentInfoBox: document.getElementById('studentInfoBox'),
    displayMarks: document.getElementById('displayMarks'),
    printableQuestionsList: document.getElementById('printableQuestionsList'),
    printableAnswerKeyList: document.getElementById('printableAnswerKeyList'),
    answerKeyPage: document.getElementById('answerKeyPage'),

    // 線上測驗
    modeChips: document.querySelectorAll('.mode-chip'),
    quizProgress: document.getElementById('quizProgress'),
    quizScore: document.getElementById('quizScore'),
    quizStreak: document.getElementById('quizStreak'),
    btnRestartQuiz: document.getElementById('btnRestartQuiz'),
    quizCategoryBadge: document.getElementById('quizCategoryBadge'),
    quizTypeHint: document.getElementById('quizTypeHint'),
    quizQuestionPrompt: document.getElementById('quizQuestionPrompt'),
    quizPromptHint: document.getElementById('quizPromptHint'),
    quizOptionsContainer: document.getElementById('quizOptionsContainer'),
    quizUnscrambleContainer: document.getElementById('quizUnscrambleContainer'),
    traySlots: document.getElementById('traySlots'),
    btnResetUnscramble: document.getElementById('btnResetUnscramble'),
    unscrambleCardsGrid: document.getElementById('unscrambleCardsGrid'),
    btnSubmitUnscramble: document.getElementById('btnSubmitUnscramble'),
    quizWriteContainer: document.getElementById('quizWriteContainer'),
    txtUserWriting: document.getElementById('txtUserWriting'),
    btnShowWriteSample: document.getElementById('btnShowWriteSample'),
    quizExplanationBox: document.getElementById('quizExplanationBox'),
    quizResultStatus: document.getElementById('quizResultStatus'),
    quizCorrectAnswer: document.getElementById('quizCorrectAnswer'),
    quizFullExample: document.getElementById('quizFullExample'),
    quizDetailProps: document.getElementById('quizDetailProps'),
    btnNextQuestion: document.getElementById('btnNextQuestion'),

    // 字典檢索
    dictSearchInput: document.getElementById('dictSearchInput'),
    dictFilterType: document.getElementById('dictFilterType'),
    dictResultCount: document.getElementById('dictResultCount'),
    dictCardsList: document.getElementById('dictCardsList'),
    btnLoadMoreDict: document.getElementById('btnLoadMoreDict')
  };

  // 高品質即時啟動題庫 (保證頁面 0 毫秒秒開並立即呈現試卷，不需等待後台大數據)
  const STARTER_BANK = [
    { id: 's-1', type: 'idiom', category_name: '成語熟語', word: '守株待兔', title: '守株待兔', zhuyin: 'ㄕㄡˇ ㄓㄨ ㄉㄞˋ ㄊㄨˋ', definition: '比喻拘泥守舊，不知變通，妄想不勞而獲。', example: '做事要腳踏實地，如果只是守株待兔，終究不會有成果。', synonyms: '刻舟求劍', antonyms: '', template: '守株待兔', pattern: '守株待兔', difficulty: 'junior_high' },
    { id: 's-2', type: 'idiom', category_name: '成語熟語', word: '井底之蛙', title: '井底之蛙', zhuyin: 'ㄐㄧㄥˇ ㄉㄧˇ ㄓ ㄨㄚ', definition: '比喻見識狹窄、眼界狹小的人。', example: '我們應該多方學習、開拓視野，千萬不要成為自滿的井底之蛙。', synonyms: '目光短淺', antonyms: '見多識廣', template: '井底之蛙', pattern: '井底之蛙', difficulty: 'junior_high' },
    { id: 's-3', type: 'idiom', category_name: '成語熟語', word: '胸有成竹', title: '胸有成竹', zhuyin: 'ㄒㄩㄥ ㄧㄡˇ ㄔㄥˊ ㄓㄨˊ', definition: '比喻處事已具備完整計畫與充分把握。', example: '經過連日充分準備，他在上台報告前顯得胸有成竹。', synonyms: '心中有數', antonyms: '束手無策', template: '胸有成竹', pattern: '胸有成竹', difficulty: 'junior_high' },
    { id: 's-4', type: 'idiom', category_name: '成語熟語', word: '水落石出', title: '水落石出', zhuyin: 'ㄕㄨㄟˇ ㄌㄨㄛˋ ㄕˊ ㄔㄨ', definition: '比喻事情的真相完全顯露出來。', example: '經過警方的縝密調查，案情終於水落石出。', synonyms: '真相大白', antonyms: '撲朔迷離', template: '水落石出', pattern: '水落石出', difficulty: 'junior_high' },
    { id: 's-5', type: 'idiom', category_name: '成語熟語', word: '畫龍點睛', title: '畫龍點睛', zhuyin: 'ㄏㄨㄚˋ ㄌㄨㄥˊ ㄉㄧㄢˇ ㄐㄧㄥ', definition: '比喻在關鍵處加上精闢字句，使內容更加生動有力。', example: '這幅畫加上落日餘暉的色彩，真有畫龍點睛的奇妙效果。', synonyms: '錦上添花', antonyms: '畫蛇添足', template: '畫龍點睛', pattern: '畫龍點睛', difficulty: 'junior_high' },
    { id: 's-6', type: 'idiom', category_name: '成語熟語', word: '走馬看花', title: '走馬看花', zhuyin: 'ㄗㄡˇ ㄇㄚˇ ㄎㄢˋ ㄏㄨㄚ', definition: '比喻粗略瀏覽，未能深入了解事物精華。', example: '這座博物館館藏極為豐富，如果只是走馬看花實在大為可惜。', synonyms: '浮光掠影', antonyms: '觀察入微', template: '走馬看花', pattern: '走馬看花', difficulty: 'junior_high' },
    { id: 's-7', type: 'idiom', category_name: '成語熟語', word: '名副其實', title: '名副其實', zhuyin: 'ㄇㄧㄥˊ ㄈㄨˋ ㄑㄧˊ ㄕˊ', definition: '名聲或名稱與實質內容完全相符。', example: '他熱心助人且處事正直，是一位名副其實的優秀模範生。', synonyms: '名不虛傳', antonyms: '名不副實', template: '名副其實', pattern: '名副其實', difficulty: 'junior_high' },
    { id: 's-8', type: 'idiom', category_name: '成語熟語', word: '亡羊補牢', title: '亡羊補牢', zhuyin: 'ㄨㄤˊ ㄧㄤˊ ㄅㄨˇ ㄌㄠˊ', definition: '比喻犯錯或遭遇挫折後及時補救，尚可防患未然。', example: '現在發現錯誤還不算太晚，亡羊補牢猶未為晚。', synonyms: '及時補救', antonyms: '執迷不悟', template: '亡羊補牢', pattern: '亡羊補牢', difficulty: 'junior_high' },
    { id: 's-9', type: 'vocabulary', category_name: '國小國中常用語詞', word: '徘徊', title: '徘徊', zhuyin: 'ㄆㄞˊ ㄏㄨㄞˊ', definition: '在一個地方來回走動，或形容猶豫不決的樣子。', example: '他在校門口來回徘徊，不知道該如何向老師解釋遲到的原因。', synonyms: '盤桓', antonyms: '果決', template: '徘徊', pattern: '徘徊', difficulty: 'elementary' },
    { id: 's-10', type: 'vocabulary', category_name: '國小國中常用語詞', word: '謹慎', title: '謹慎', zhuyin: 'ㄐㄧㄣˇ ㄕㄣˋ', definition: '小心仔細，慎重不苟。', example: '處理重要文件時必須格外謹慎，以免發生錯誤。', synonyms: '小心', antonyms: '粗心', template: '謹慎', pattern: '謹慎', difficulty: 'elementary' },
    { id: 's-11', type: 'vocabulary', category_name: '國小國中常用語詞', word: '敏捷', title: '敏捷', zhuyin: 'ㄇㄧㄣˇ ㄐㄧㄝˊ', definition: '動作或思維靈敏迅速。', example: '獵豹以敏捷的身手在草原上奔馳追逐獵物。', synonyms: '靈活', antonyms: '遲鈍', template: '敏捷', pattern: '敏捷', difficulty: 'elementary' },
    { id: 's-12', type: 'vocabulary', category_name: '國小國中常用語詞', word: '吩咐', title: '吩咐', zhuyin: 'ㄈㄣ ㄈㄨˋ', definition: '口頭指派或囑託事情。', example: '媽媽出門前特地吩咐我要把客廳收拾乾淨。', synonyms: '叮囑', antonyms: '', template: '吩咐', pattern: '吩咐', difficulty: 'elementary' },
    { id: 's-13', type: 'vocabulary', category_name: '國小國中常用語詞', word: '謙虛', title: '謙虛', zhuyin: 'ㄑㄧㄢ ㄒㄩ', definition: '虛心不自誇，能聽取別人的意見。', example: '即使屢獲大獎，他依然保持謙虛待人的態度。', synonyms: '虛心', antonyms: '傲慢', template: '謙虛', pattern: '謙虛', difficulty: 'elementary' },
    { id: 's-14', type: 'vocabulary', category_name: '國小國中常用語詞', word: '沉思', title: '沉思', zhuyin: 'ㄔㄣˊ ㄙ', definition: '深切思考，專注冥想。', example: '面對難解的數學題目，他雙手托腮陷入了沉思。', synonyms: '深思', antonyms: '', template: '沉思', pattern: '沉思', difficulty: 'elementary' },
    { id: 's-15', type: 'vocabulary', category_name: '國小國中常用語詞', word: '燦爛', title: '燦爛', zhuyin: 'ㄘㄢˋ ㄌㄢˋ', definition: '形容光彩鮮明奪目，或笑容生動美好。', example: '夏日的夜空中綻放著燦爛奪目的煙火。', synonyms: '絢麗', antonyms: '黯淡', template: '燦爛', pattern: '燦爛', difficulty: 'elementary' },
    { id: 's-16', type: 'vocabulary', category_name: '國小國中常用語詞', word: '澎湃', title: '澎湃', zhuyin: 'ㄆㄥˊ ㄆㄞˋ', definition: '波浪相激撞擊的聲勢，比喻氣勢磅礡或情緒激動。', example: '聽完這場感人肺腑的演說，大家心中澎湃不已。', synonyms: '洶湧', antonyms: '平靜', template: '澎湃', pattern: '澎湃', difficulty: 'elementary' },
    { id: 's-17', type: 'sentence', category_name: '短語練習', word: '一面走路、一面吟誦', title: '一面走路、一面吟誦', zhuyin: '', definition: '並列動作短語練習', example: '一面走路、一面吟誦', synonyms: '', antonyms: '', template: '一面走路、一面吟誦', pattern: '一面走路、一面吟誦', difficulty: 'elementary' },
    { id: 's-18', type: 'sentence', category_name: '短語練習', word: '像樹枝般昂揚的鹿角', title: '像樹枝般昂揚的鹿角', zhuyin: '', definition: '比喻修飾短語練習', example: '像樹枝般昂揚的鹿角', synonyms: '', antonyms: '', template: '像樹枝般昂揚的鹿角', pattern: '像樹枝般昂揚的鹿角', difficulty: 'elementary' },
    { id: 's-19', type: 'sentence', category_name: '短語練習', word: '靜靜的看著星空', title: '靜靜的看著星空', zhuyin: '', definition: '副詞動作受詞短語練習', example: '靜靜的看著星空', synonyms: '', antonyms: '', template: '靜靜的看著星空', pattern: '靜靜的看著星空', difficulty: 'elementary' },
    { id: 's-20', type: 'sentence', category_name: '短語練習', word: '輕輕的微風吹拂著臉龐', title: '輕輕的微風吹拂著臉龐', zhuyin: '', definition: '形容詞主詞動作短語練習', example: '輕輕的微風吹拂著臉龐', synonyms: '', antonyms: '', template: '輕輕的微風吹拂著臉龐', pattern: '輕輕的微風吹拂著臉龐', difficulty: 'elementary' },
    { id: 's-21', type: 'ellipsis', category_name: '句型練習', word: '不僅有…和…還有…', title: '不僅有…和…還有…', zhuyin: '', definition: '遞進複句造句練習', example: '這次旅行不僅有美麗的風景和豐富的文化體驗，還有無數令人感動的回憶。', synonyms: '', antonyms: '', template: '不僅有…和…還有…', pattern: '不僅有…和…還有…', difficulty: 'junior_high' },
    { id: 's-22', type: 'ellipsis', category_name: '句型練習', word: '一方面…另一方面…', title: '一方面…另一方面…', zhuyin: '', definition: '並列複句造句練習', example: '他一方面希望能有更多時間休息，另一方面又擔心工作進度落後。', synonyms: '', antonyms: '', template: '一方面…另一方面…', pattern: '一方面…另一方面…', difficulty: 'junior_high' },
    { id: 's-23', type: 'ellipsis', category_name: '句型練習', word: '像…般…', title: '像…般…', zhuyin: '', definition: '比喻複句造句練習', example: '她的笑容像陽光般溫暖人心。', synonyms: '', antonyms: '', template: '像…般…', pattern: '像…般…', difficulty: 'junior_high' },
    { id: 's-24', type: 'ellipsis', category_name: '句型練習', word: '如果…還會…', title: '如果…還會…', zhuyin: '', definition: '假設遞進複句造句練習', example: '老師說如果我努力持續下去，就還會有更大的進步。', synonyms: '', antonyms: '', template: '如果…還會…', pattern: '如果…還會…', difficulty: 'junior_high' }
  ];

  // ============================================================================
  // 初始化與題庫載入 (採用秒開啟動 + 背景無縫載入全量題庫)
  // ============================================================================
  function initApp() {
    initTheme();
    bindEvents();

    // 1. 0 毫秒極速啟動：立刻使用啟動題庫渲染頁面與試卷
    processBank(STARTER_BANK, false);

    // 2. 背景非同步載入 31,302 筆全量大題庫
    loadFullBankBackground();
  }

  function loadFullBankBackground() {
    let attempts = 0;
    const maxAttempts = 100; // 最多輪詢 15 秒

    const timer = setInterval(() => {
      attempts++;
      if (window.QUESTION_BANK_COMPACT && Array.isArray(window.QUESTION_BANK_COMPACT) && window.QUESTION_BANK_COMPACT.length > 0) {
        clearInterval(timer);
        unpackAndApplyFullBank(window.QUESTION_BANK_COMPACT);
      } else if (window.QUESTION_BANK && Array.isArray(window.QUESTION_BANK) && window.QUESTION_BANK.length > 0) {
        clearInterval(timer);
        processBank(window.QUESTION_BANK, true);
      } else if (attempts >= maxAttempts) {
        clearInterval(timer);
        console.log('背景題庫載入超時，維持啟動題庫運作');
      }
    }, 150);
  }

  function unpackAndApplyFullBank(compactRows) {
    const typeMap = ['vocabulary', 'idiom', 'sentence', 'ellipsis'];
    const catNameMap = ['國小國中常用語詞', '成語熟語', '短語練習', '句型練習'];
    
    const unpacked = compactRows.map((rawRow, idx) => {
      const row = Array.isArray(rawRow) ? rawRow : (rawRow && rawRow.value ? rawRow.value : []);
      const tIdx = typeof row[0] === 'number' ? row[0] : 0;
      return {
        id: `item-${idx}`,
        type: typeMap[tIdx] || 'vocabulary',
        category_name: catNameMap[tIdx] || '國小國中常用語詞',
        word: row[1] || '',
        title: row[1] || '',
        zhuyin: row[2] || '',
        definition: row[3] || '',
        example: row[4] || '',
        synonyms: row[5] || '',
        antonyms: row[6] || '',
        template: row[7] || row[1] || '',
        pattern: row[7] || row[1] || '',
        difficulty: (tIdx === 1 || tIdx === 3) ? 'junior_high' : 'elementary'
      };
    });

    processBank(unpacked, true);
    console.log(`✅ 全量題庫已成功就緒：${unpacked.length} 筆資料`);
  }

  function processBank(data, isFullBank) {
    rawBank = data || [];
    bankByType = {
      idiom: rawBank.filter(i => i.type === 'idiom'),
      vocabulary: rawBank.filter(i => i.type === 'vocabulary'),
      sentence: rawBank.filter(i => i.type === 'sentence'),
      ellipsis: rawBank.filter(i => i.type === 'ellipsis'),
      withSynonyms: rawBank.filter(i => i.synonyms && i.synonyms.trim().length > 0),
      withZhuyin: rawBank.filter(i => i.zhuyin && i.zhuyin.trim().length > 0)
    };

    if (elements.totalWordCount) {
      elements.totalWordCount.textContent = rawBank.length.toLocaleString();
    }

    try {
      if (!isFullBank) {
        generateWorksheet();
        startNewQuizSession('idiom');
      }
      initDictSearch();
    } catch (err) {
      console.error('出題或初始化錯誤:', err);
    }
  }

  function initTheme() {
    const saved = localStorage.getItem('app-theme') || 'theme-light';
    document.body.className = saved;
    updateThemeIcon(saved);
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark');
    const newTheme = isDark ? 'theme-light' : 'theme-dark';
    document.body.className = newTheme;
    localStorage.setItem('app-theme', newTheme);
    updateThemeIcon(newTheme);
  }

  function updateThemeIcon(theme) {
    const iconSpan = elements.btnThemeToggle.querySelector('.theme-icon');
    if (iconSpan) {
      iconSpan.textContent = theme === 'theme-dark' ? '☀️' : '🌙';
    }
  }

  function bindEvents() {
    elements.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.tabButtons.forEach(b => b.classList.remove('active'));
        elements.tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        const targetContent = document.getElementById(tabId);
        if (targetContent) targetContent.classList.add('active');
      });
    });

    elements.btnThemeToggle.addEventListener('click', toggleTheme);

    elements.btnGeneratePaper.addEventListener('click', generateWorksheet);
    elements.btnPrintPaper.addEventListener('click', () => window.print());
    elements.paperTitleInput.addEventListener('input', () => {
      elements.displayPaperTitle.textContent = elements.paperTitleInput.value || '國語文練習單';
    });
    elements.paperSubtitleInput.addEventListener('input', () => {
      elements.displayPaperSubtitle.textContent = elements.paperSubtitleInput.value || '';
      elements.displayAnswerSubtitle.textContent = elements.paperSubtitleInput.value ? `(${elements.paperSubtitleInput.value})` : '請由家長或教師進行批改';
    });
    elements.targetScopeSelect.addEventListener('change', generateWorksheet);
    elements.questionCountSelect.addEventListener('change', generateWorksheet);
    elements.layoutSelect.addEventListener('change', updateLayoutMode);
    elements.chkShowZhuyin.addEventListener('change', generateWorksheet);
    elements.chkShowHeaderBox.addEventListener('change', () => {
      elements.studentInfoBox.style.display = elements.chkShowHeaderBox.checked ? 'flex' : 'none';
    });
    elements.chkIncludeAnswerKey.addEventListener('change', () => {
      elements.answerKeyPage.style.display = elements.chkIncludeAnswerKey.checked ? 'flex' : 'none';
    });
    if (elements.chkShowMimicPattern) {
      elements.chkShowMimicPattern.addEventListener('change', generateWorksheet);
    }

    elements.modeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.modeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        quizCurrentMode = chip.dataset.mode;
        startNewQuizSession(quizCurrentMode);
      });
    });

    elements.btnRestartQuiz.addEventListener('click', () => startNewQuizSession(quizCurrentMode));
    elements.btnNextQuestion.addEventListener('click', nextQuestion);
    elements.btnShowWriteSample.addEventListener('click', showWriteSample);
    elements.btnResetUnscramble.addEventListener('click', resetUnscrambleTray);
    elements.btnSubmitUnscramble.addEventListener('click', submitUnscrambleAnswer);

    elements.dictSearchInput.addEventListener('input', debounce(filterDictionary, 250));
    elements.dictFilterType.addEventListener('change', filterDictionary);
    elements.btnLoadMoreDict.addEventListener('click', loadMoreDictItems);
  }

  function updateLayoutMode() {
    const isDouble = elements.layoutSelect.value === 'double';
    if (isDouble) {
      elements.printableQuestionsList.classList.add('layout-double');
    } else {
      elements.printableQuestionsList.classList.remove('layout-double');
    }
  }

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getRandomSample(arr, n) {
    if (!arr || arr.length === 0) return [];
    const shuffled = shuffleArray(arr);
    return shuffled.slice(0, Math.min(n, shuffled.length));
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ============================================================================
  // 8 大題型建構器 (Question Builders)
  // ============================================================================

  // 1. 克漏字選詞造句 (Cloze)
  function buildClozeQuestion(item) {
    if (!item || !item.word) return null;
    let maskedSentence = item.example || '';
    if (maskedSentence && maskedSentence.includes(item.word)) {
      maskedSentence = maskedSentence.replace(item.word, '【　　　　】');
    } else if (maskedSentence) {
      maskedSentence = `「${maskedSentence}」文句中最適當填入的詞語是【　　　　】。`;
    } else {
      maskedSentence = `下列詞語中，意思為「${item.definition || '……'}」的是【　　　　】。`;
    }

    const pool = (item.type === 'idiom') ? bankByType.idiom : bankByType.vocabulary;
    const distractors = getRandomSample(pool.filter(i => i.word !== item.word), 3).map(i => i.word);
    const options = shuffleArray([item.word, ...distractors]);

    return {
      ...item,
      quizType: 'cloze',
      promptSentence: maskedSentence,
      options,
      correctAnswer: item.word
    };
  }

  // 2. 國字注音辨別題 (Zhuyin & Character Transcription)
  function buildZhuyinQuestion(item) {
    if (!item || !item.word || !item.zhuyin) return null;
    const isWriteChar = Math.random() > 0.5;

    if (isWriteChar) {
      // 看音寫國字
      let sentence = item.example || `請寫出「${item.word}」的國字。`;
      if (sentence.includes(item.word)) {
        sentence = sentence.replace(item.word, `（　　）[注音：${item.zhuyin}]`);
      }
      const pool = (item.type === 'idiom') ? bankByType.idiom : bankByType.vocabulary;
      const distractors = getRandomSample(pool.filter(i => i.word !== item.word), 3).map(i => i.word);
      const options = shuffleArray([item.word, ...distractors]);

      return {
        ...item,
        quizType: 'zhuyin',
        subType: 'write_char',
        promptSentence: sentence,
        promptLabel: `【看音辨國字】（注音：${item.zhuyin}）`,
        options,
        correctAnswer: item.word,
        handwriteHint: `國字填寫：（ ＿＿＿＿ ）`
      };
    } else {
      // 看字辨注音
      let sentence = item.example || `請辨別「${item.word}」的正確注音。`;
      if (sentence.includes(item.word)) {
        sentence = sentence.replace(item.word, `【${item.word}】`);
      }
      // 生成干擾注音 (抽其他詞條之注音)
      const distractors = getRandomSample(bankByType.withZhuyin.filter(i => i.zhuyin !== item.zhuyin), 3).map(i => i.zhuyin);
      const options = shuffleArray([item.zhuyin, ...distractors]);

      return {
        ...item,
        quizType: 'zhuyin',
        subType: 'write_zhuyin',
        promptSentence: sentence,
        promptLabel: `【看字辨注音】請選出【${item.word}】的正確注音`,
        options,
        correctAnswer: item.zhuyin,
        handwriteHint: `注音填寫：（ ＿＿＿＿ ）`
      };
    }
  }

  // 3. 近義詞替換與詞義辨析題 (Synonym Replacement)
  function buildSynonymQuestion(item) {
    let sourceItem = item;
    if (!sourceItem.synonyms) {
      const candidates = bankByType.withSynonyms;
      if (candidates.length > 0) {
        sourceItem = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
    if (!sourceItem || !sourceItem.synonyms) return null;

    const synList = sourceItem.synonyms.split(/[、,，\s]+/).filter(s => s.trim().length > 0);
    const correctSyn = synList[0];
    if (!correctSyn) return null;

    let sentence = sourceItem.example || `他在文章中恰當地使用了「${sourceItem.word}」。`;
    if (sentence.includes(sourceItem.word)) {
      sentence = sentence.replace(sourceItem.word, `「${sourceItem.word}」`);
    } else {
      sentence = `「${sourceItem.word}」：${sentence}`;
    }

    const distractors = getRandomSample(
      rawBank.filter(i => i.word !== sourceItem.word && i.word !== correctSyn),
      3
    ).map(i => i.word);

    const options = shuffleArray([correctSyn, ...distractors]);

    return {
      ...sourceItem,
      quizType: 'synonym',
      promptSentence: `下列文句「　」中的詞語，替換為哪一個選項後，句子意思「最相近」？<br>「${sentence}」`,
      options,
      correctAnswer: correctSyn,
      targetWord: sourceItem.word,
      synonymWord: correctSyn
    };
  }

  // 4. 成語生活情境素養題 (Situational Idiom)
  function buildSituationalQuestion(item) {
    let idiomItem = (item && item.type === 'idiom') ? item : getRandomSample(bankByType.idiom, 1)[0];
    if (!idiomItem || !idiomItem.definition) return null;

    let scenario = '';
    if (idiomItem.example && idiomItem.example.length > 10) {
      scenario = `面對「${idiomItem.example}」這樣的生活情境，其所展現的處事態度或情狀，最適合用下列哪一個成語來形容概括？`;
    } else {
      scenario = `如果有人想表達「${idiomItem.definition}」的意思，並勉勵大家在團隊合作或日常處事中實踐，最恰當的成語是：`;
    }

    const distractors = getRandomSample(bankByType.idiom.filter(i => i.word !== idiomItem.word), 3).map(i => i.word);
    const options = shuffleArray([idiomItem.word, ...distractors]);

    return {
      ...idiomItem,
      quizType: 'situational',
      promptSentence: scenario,
      options,
      correctAnswer: idiomItem.word
    };
  }

  // 5. 關聯詞複句邏輯選擇題 (Conjunction Logic)
  function buildConjunctionQuestion(item) {
    let ellItem = (item && item.type === 'ellipsis') ? item : getRandomSample(bankByType.ellipsis, 1)[0];
    if (!ellItem || !ellItem.pattern || !ellItem.example) return null;

    // 分割關聯詞（例如 不僅有…和…還有… -> [不僅有, 和, 還有]）
    const markers = ellItem.pattern.split(/[…\.⋯]+/).map(m => m.trim()).filter(m => m.length > 0);
    if (markers.length === 0) return null;

    let masked = ellItem.example;
    markers.forEach(m => {
      if (masked.includes(m)) {
        masked = masked.replace(m, '【　　】');
      }
    });

    const candidateConjs = ['不僅…而且…', '雖然…但是…', '如果…就…', '因為…所以…', '無論…都…', '與其…不如…', '只有…才…', '一方面…另一方面…'];
    const distractors = getRandomSample(candidateConjs.filter(c => c !== ellItem.pattern), 3);
    const options = shuffleArray([ellItem.pattern, ...distractors]);

    return {
      ...ellItem,
      quizType: 'conjunction',
      promptSentence: `請在下列句子的空格中填入最恰當的關聯詞語：<br>「${masked}」`,
      options,
      correctAnswer: ellItem.pattern
    };
  }

  // 6. 造句錯字訂正 (Typo)
  function buildTypoQuestion(item) {
    if (!item || !item.word || !item.example) return null;

    let targetChar = '';
    let typoChar = '';
    let charIdx = -1;

    for (let i = 0; i < item.word.length; i++) {
      const ch = item.word[i];
      if (COMMON_TYPO_MAP[ch]) {
        targetChar = ch;
        typoChar = COMMON_TYPO_MAP[ch];
        charIdx = i;
        break;
      }
    }

    if (!targetChar) {
      charIdx = Math.floor(Math.random() * item.word.length);
      targetChar = item.word[charIdx];
      const fallbackList = ['及', '急', '以', '已', '即', '提', '題', '部', '步', '歷', '厲', '絕', '決', '湧', '勇'];
      typoChar = fallbackList.find(c => c !== targetChar) || '其';
    }

    const typoWord = item.word.substring(0, charIdx) + typoChar + item.word.substring(charIdx + 1);
    let typoSentence = item.example.includes(item.word)
      ? item.example.replace(item.word, typoWord)
      : `他在句子中誤將「${item.word}」寫成了「${typoWord}」。`;

    const extra = ['容', '融', '榮', '急', '及', '提', '題', '步', '部', '厲', '利', '決', '絕'].filter(c => c !== targetChar && c !== typoChar);
    const options = shuffleArray([targetChar, typoChar, ...getRandomSample(extra, 2)]);

    return {
      ...item,
      quizType: 'typo',
      targetChar,
      typoChar,
      typoWord,
      typoSentence,
      options,
      correctAnswer: targetChar
    };
  }

  // 7. 重組造句 (Unscramble)
  function buildUnscrambleQuestion(item) {
    if (!item || !item.example || item.example.length < 10) return null;
    let clean = item.example.replace(/^[「"『\s]+/, '').replace(/[」"』\s]+$/, '').replace(/。$/, '');

    let chunks = [];
    if (clean.includes('，') || clean.includes('、')) {
      const parts = clean.split(/[，、]/).filter(p => p.trim().length > 0);
      if (parts.length >= 4) {
        chunks = parts.slice(0, 4);
      } else if (parts.length === 2) {
        chunks = [
          parts[0].slice(0, Math.ceil(parts[0].length / 2)),
          parts[0].slice(Math.ceil(parts[0].length / 2)),
          parts[1].slice(0, Math.ceil(parts[1].length / 2)),
          parts[1].slice(Math.ceil(parts[1].length / 2))
        ];
      } else if (parts.length === 3) {
        chunks = [
          parts[0],
          parts[1].slice(0, Math.ceil(parts[1].length / 2)),
          parts[1].slice(Math.ceil(parts[1].length / 2)),
          parts[2]
        ];
      }
    }

    if (chunks.length < 4) {
      const step = Math.ceil(clean.length / 4);
      chunks = [
        clean.slice(0, step),
        clean.slice(step, step * 2),
        clean.slice(step * 2, step * 3),
        clean.slice(step * 3)
      ].filter(c => c.length > 0);
    }

    if (chunks.length !== 4) return null;

    const labels = ['甲', '乙', '丙', '丁'];
    const originalCards = chunks.map((text, idx) => ({ text, origIdx: idx }));
    const shuffled = shuffleArray(originalCards);
    const labeledCards = shuffled.map((card, idx) => ({
      label: labels[idx],
      text: card.text,
      origIdx: card.origIdx
    }));

    const correctOrder = [0, 1, 2, 3].map(origIdx => {
      const found = labeledCards.find(c => c.origIdx === origIdx);
      return found ? found.label : '';
    }).join('');

    const distractorSet = new Set();
    while (distractorSet.size < 3) {
      const perm = shuffleArray([...labels]).join('');
      if (perm !== correctOrder) distractorSet.add(perm);
    }
    const options = shuffleArray([correctOrder, ...Array.from(distractorSet)]);

    return {
      ...item,
      quizType: 'unscramble',
      cleanSentence: clean,
      labeledCards,
      correctOrderLabels: correctOrder,
      options,
      correctAnswer: correctOrder
    };
  }

  // 8. 短語照樣造句 (Sentence Mimicry)
  function buildSentenceMimicQuestion(item) {
    let sentenceItem = (item && item.type === 'sentence') ? item : getRandomSample(bankByType.sentence, 1)[0];
    if (!sentenceItem) return null;
    return {
      ...sentenceItem,
      quizType: 'sentence',
      correctAnswer: sentenceItem.example || sentenceItem.title
    };
  }

  // ============================================================================
  // 核心功能 1: A4 練習券出卷產生引擎 (保證 100% 題數相符)
  // ============================================================================
  function generateWorksheet() {
    if (rawBank.length === 0) return;

    const targetCount = parseInt(elements.questionCountSelect.value, 10) || 10;
    const scope = elements.targetScopeSelect.value;
    const showZhuyin = elements.chkShowZhuyin.checked;

    elements.displayPaperTitle.textContent = elements.paperTitleInput.value || '國語文造句與成語練習單';
    elements.displayPaperSubtitle.textContent = elements.paperSubtitleInput.value || '';
    elements.displayMarks.textContent = `總題數：${targetCount} 題 (滿分 100 分，每題 ${Math.floor(100 / targetCount)} 分)`;

    const collectedQuestions = [];

    // 依題型專題進行抽題
    if (scope === 'zhuyin') {
      const candidates = shuffleArray(bankByType.withZhuyin);
      for (let c of candidates) {
        const q = buildZhuyinQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'synonym') {
      const candidates = shuffleArray(bankByType.withSynonyms);
      for (let c of candidates) {
        const q = buildSynonymQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'situational') {
      const candidates = shuffleArray(bankByType.idiom);
      for (let c of candidates) {
        const q = buildSituationalQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'conjunction') {
      const candidates = shuffleArray(bankByType.ellipsis);
      for (let c of candidates) {
        const q = buildConjunctionQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'typo') {
      const candidates = shuffleArray([...bankByType.idiom, ...bankByType.vocabulary]);
      for (let c of candidates) {
        const q = buildTypoQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'unscramble') {
      const candidates = shuffleArray([...bankByType.idiom, ...bankByType.vocabulary]);
      for (let c of candidates) {
        const q = buildUnscrambleQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'sentence') {
      const candidates = shuffleArray(bankByType.sentence);
      for (let c of candidates) {
        const q = buildSentenceMimicQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'ellipsis') {
      const candidates = shuffleArray(bankByType.ellipsis);
      for (let c of candidates) {
        const q = buildConjunctionQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'idiom') {
      const candidates = shuffleArray(bankByType.idiom);
      for (let c of candidates) {
        const r = Math.random();
        let q = null;
        if (r < 0.4) q = buildClozeQuestion(c);
        else if (r < 0.7) q = buildSituationalQuestion(c);
        else q = buildTypoQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'elementary') {
      const candidates = shuffleArray([...bankByType.vocabulary, ...bankByType.sentence]);
      for (let c of candidates) {
        let q = null;
        if (c.type === 'sentence') q = buildSentenceMimicQuestion(c);
        else if (Math.random() < 0.5) q = buildZhuyinQuestion(c);
        else q = buildClozeQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else if (scope === 'junior_high') {
      const candidates = shuffleArray([...bankByType.idiom, ...bankByType.ellipsis]);
      for (let c of candidates) {
        let q = null;
        if (c.type === 'ellipsis') q = buildConjunctionQuestion(c);
        else if (Math.random() < 0.5) q = buildSituationalQuestion(c);
        else q = buildTypoQuestion(c);
        if (q) collectedQuestions.push(q);
        if (collectedQuestions.length >= targetCount) break;
      }
    } else {
      // 綜合全題型：按比例分配 8 大題型
      const builders = [
        buildClozeQuestion,
        buildZhuyinQuestion,
        buildSynonymQuestion,
        buildSituationalQuestion,
        buildConjunctionQuestion,
        buildTypoQuestion,
        buildUnscrambleQuestion,
        buildSentenceMimicQuestion
      ];

      const poolShuffled = shuffleArray(rawBank);
      let bIdx = 0;
      for (let item of poolShuffled) {
        const builder = builders[bIdx % builders.length];
        const q = builder(item);
        if (q) {
          collectedQuestions.push(q);
          bIdx++;
        }
        if (collectedQuestions.length >= targetCount) break;
      }
    }

    // 🌟 嚴格保證迴圈：若因特殊篩選使題目數不足 targetCount，立刻無縫自動補滿！
    let fallbackIdx = 0;
    const fallbackShuffled = shuffleArray(rawBank);
    while (collectedQuestions.length < targetCount) {
      const item = fallbackShuffled[fallbackIdx % fallbackShuffled.length];
      fallbackIdx++;
      const q = buildClozeQuestion(item);
      if (q) collectedQuestions.push(q);
    }

    const finalQuestions = collectedQuestions.slice(0, targetCount);

    renderPaperQuestions(finalQuestions, showZhuyin);
    renderAnswerKey(finalQuestions);
  }

  function renderPaperQuestions(questions, showZhuyin) {
    elements.printableQuestionsList.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const qDiv = document.createElement('div');
      qDiv.className = 'question-item';

      const zhuyinHtml = (showZhuyin && q.zhuyin) ? `<span class="q-zhuyin-tag">(${q.zhuyin})</span>` : '';

      if (q.quizType === 'zhuyin') {
        // 國字注音辨別題
        const correctLetter = letters[q.options.indexOf(q.correctAnswer)];
        q._correctLetter = correctLetter;

        qDiv.innerHTML = `
          <div class="q-header">
            <span class="q-bracket">(　　)</span>
            <span class="q-number">${qNum}.</span>
            <span class="q-badge" style="background:#e0f2fe; color:#0369a1;">國字注音</span>
            <span style="font-weight:700; color:#111;">${q.promptLabel || '【國字注音測驗】'}</span>
          </div>
          <div class="q-body">${q.promptSentence}</div>
          <div class="q-options-row">
            ${q.options.map((opt, oIdx) => `<div class="q-option-choice"><b>(${letters[oIdx]})</b> ${opt}</div>`).join('')}
          </div>
          <div style="font-size:0.86rem; color:#475569; margin-top:8px; padding-left:20px;">
            ✍️ ${q.handwriteHint}
          </div>
        `;
      } else if (q.quizType === 'synonym') {
        // 近義詞替換題
        const correctLetter = letters[q.options.indexOf(q.correctAnswer)];
        q._correctLetter = correctLetter;

        qDiv.innerHTML = `
          <div class="q-header">
            <span class="q-bracket">(　　)</span>
            <span class="q-number">${qNum}.</span>
            <span class="q-badge" style="background:#f3e8ff; color:#6b21a8;">詞義辨析</span>
            <span style="font-weight:700; color:#111;">【文意相近詞語替換】</span>
          </div>
          <div class="q-body">${q.promptSentence}</div>
          <div class="q-options-row">
            ${q.options.map((opt, oIdx) => `<div class="q-option-choice"><b>(${letters[oIdx]})</b> ${opt}</div>`).join('')}
          </div>
        `;
      } else if (q.quizType === 'situational') {
        // 成語生活情境素養題
        const correctLetter = letters[q.options.indexOf(q.correctAnswer)];
        q._correctLetter = correctLetter;

        qDiv.innerHTML = `
          <div class="q-header">
            <span class="q-bracket">(　　)</span>
            <span class="q-number">${qNum}.</span>
            <span class="q-badge" style="background:#fef3c7; color:#92400e;">情境素養</span>
            <span style="font-weight:700; color:#111;">【生活語境成語應用】</span>
          </div>
          <div class="q-body" style="background:#fdfdfd; padding:8px 12px; border-left:3px solid #f59e0b; border-radius:4px; margin:4px 0 8px 0;">
            ${q.promptSentence}
          </div>
          <div class="q-options-row">
            ${q.options.map((opt, oIdx) => `<div class="q-option-choice"><b>(${letters[oIdx]})</b> ${opt}</div>`).join('')}
          </div>
        `;
      } else if (q.quizType === 'conjunction') {
        // 關聯詞複句邏輯選擇題
        const correctLetter = letters[q.options.indexOf(q.correctAnswer)];
        q._correctLetter = correctLetter;

        qDiv.innerHTML = `
          <div class="q-header">
            <span class="q-bracket">(　　)</span>
            <span class="q-number">${qNum}.</span>
            <span class="q-badge" style="background:#ecfdf5; color:#065f46;">關聯複句</span>
            <span style="font-weight:700; color:#111;">【複句邏輯連詞選擇】</span>
          </div>
          <div class="q-body">${q.promptSentence}</div>
          <div class="q-options-row">
            ${q.options.map((opt, oIdx) => `<div class="q-option-choice"><b>(${letters[oIdx]})</b> ${opt}</div>`).join('')}
          </div>
        `;
      } else if (q.quizType === 'typo') {
        // 錯字訂正題
        const correctLetter = letters[q.options.indexOf(q.correctAnswer)];
        q._correctLetter = correctLetter;

        const sentenceWithMark = q.typoSentence.replace(q.typoWord, `【<u>${q.typoWord}</u>】`);

        qDiv.innerHTML = `
          <div class="q-header">
            <span class="q-bracket">(　　)</span>
            <span class="q-number">${qNum}.</span>
            <span class="q-badge" style="background:#fee2e2; color:#991b1b;">錯字訂正</span>
            <span style="font-weight:700; color:#111;">【挑出錯別字並訂正】</span>
            ${zhuyinHtml}
          </div>
          <div class="q-body">下列文句中畫底線處含有一個錯別字，請選出改正後的正確字：<br>「${sentenceWithMark}」</div>
          <div class="q-options-row">
            ${q.options.map((opt, oIdx) => `<div class="q-option-choice"><b>(${letters[oIdx]})</b> ${opt}</div>`).join('')}
          </div>
          <div style="font-size:0.86rem; color:#475569; margin-top:8px; padding-left:20px;">
            ✍️ 手寫訂正欄：錯字是（ <strong>${q.typoChar}</strong> ），應改正為：（ ＿＿ ）
          </div>
        `;
      } else if (q.quizType === 'unscramble') {
        // 重組造句題
        const correctLetter = letters[q.options.indexOf(q.correctAnswer)];
        q._correctLetter = correctLetter;

        qDiv.innerHTML = `
          <div class="q-header">
            <span class="q-bracket">(　　)</span>
            <span class="q-number">${qNum}.</span>
            <span class="q-badge" style="background:#fef3c7; color:#92400e;">重組造句</span>
            <span style="font-weight:700; color:#111;">【文句語意重組排序】</span>
          </div>
          <div class="q-body">
            請將下列打亂順序的詞語區塊，重組成文意流暢合理的完整句子：
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; margin:6px 0; font-weight:600;">
              ${q.labeledCards.map(c => `<span><b>${c.label}、</b>${c.text}</span>`).join('　')}
            </div>
          </div>
          <div class="q-options-row">
            ${q.options.map((opt, oIdx) => `<div class="q-option-choice"><b>(${letters[oIdx]})</b> ${opt}</div>`).join('')}
          </div>
          <div style="font-size:0.86rem; color:#475569; margin-top:8px; padding-left:20px;">
            ✍️ 重組排序：( 　 ) ➔ ( 　 ) ➔ ( 　 ) ➔ ( 　 )
          </div>
        `;
      } else if (q.quizType === 'sentence') {
        // 照樣造句題 (純例句自由仿寫，可勾選顯示骨架結構)
        q._correctLetter = '照樣仿寫題（參見標準範例）';
        
        const exampleText = (q.example || q.title || '').replace(/[()（）]/g, '').replace(/。$/, '');
        let templateText = q.template || q.title || '';
        if (!templateText.includes('　') && templateText.includes('(')) {
          templateText = templateText.replace(/\(([^)]+)\)/g, '(　　)');
        }

        const showPattern = elements.chkShowMimicPattern && elements.chkShowMimicPattern.checked;

        qDiv.innerHTML = `
          <div class="q-header">
            <span class="q-number">${qNum}.</span>
            <span class="q-badge">${q.category_name || '短語練習'}</span>
            <span style="font-weight: 700; color: #1e293b;">【照樣寫短語】</span>
          </div>
          <div class="q-body">請仔細體會【例句示範】的詞性節奏與句構特徵，發揮創意照樣仿寫出一個通順生動的短語：</div>
          <div class="q-handwrite-box">
            <div class="q-example-prompt">
              <span class="ex-tag">📖【例句示範】</span><strong>${exampleText}</strong>
            </div>
            ${showPattern ? `
            <div class="q-pattern-template">
              <span class="pat-tag">【仿寫結構】</span><strong>${templateText}</strong>
            </div>` : ''}
            <div class="q-student-write-guide">✏️ 請照樣仿寫作答：</div>
            <div class="handwrite-line"></div>
          </div>
        `;
      } else {
        // 標準克漏字題
        const correctLetter = letters[q.options.indexOf(q.correctAnswer)];
        q._correctLetter = correctLetter;

        qDiv.innerHTML = `
          <div class="q-header">
            <span class="q-bracket">(　　)</span>
            <span class="q-number">${qNum}.</span>
            <span class="q-badge">${q.category_name}</span>
            ${zhuyinHtml}
          </div>
          <div class="q-body">${q.promptSentence}</div>
          ${q.definition ? `<div class="q-hint-text">💡 提示：${q.definition}</div>` : ''}
          <div class="q-options-row">
            ${q.options.map((opt, oIdx) => `<div class="q-option-choice"><b>(${letters[oIdx]})</b> ${opt}</div>`).join('')}
          </div>
        `;
      }

      elements.printableQuestionsList.appendChild(qDiv);
    });
  }

  function renderAnswerKey(questions) {
    elements.printableAnswerKeyList.innerHTML = '';

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      const ansDiv = document.createElement('div');
      ansDiv.className = 'answer-item';

      if (q.quizType === 'zhuyin') {
        ansDiv.innerHTML = `
          <div class="ans-title-row">
            <span class="ans-badge" style="background:#e0f2fe; color:#0369a1;">第 ${qNum} 題 國字注音</span>
            <span style="color:#000; font-weight:800; font-size:1.05rem;">正解：(${q._correctLetter}) ${q.correctAnswer}</span>
            <span class="ans-word">${q.word} (${q.zhuyin})</span>
          </div>
          <div class="ans-desc"><b>【字詞釋義】</b>${q.definition || '無'}</div>
          ${q.example ? `<div class="ans-full-ex"><b>【完整例句】</b>${q.example}</div>` : ''}
        `;
      } else if (q.quizType === 'synonym') {
        ansDiv.innerHTML = `
          <div class="ans-title-row">
            <span class="ans-badge" style="background:#f3e8ff; color:#6b21a8;">第 ${qNum} 題 近義替換</span>
            <span style="color:#000; font-weight:800; font-size:1.05rem;">正解：(${q._correctLetter}) ${q.correctAnswer}</span>
            <span class="ans-word">「${q.targetWord}」與「${q.synonymWord}」語意相近</span>
          </div>
          <div class="ans-desc"><b>【詞義釋義】</b>${q.definition || '無'} ｜ 相似詞：${q.synonyms || '無'}</div>
          ${q.example ? `<div class="ans-full-ex"><b>【文句語境】</b>${q.example}</div>` : ''}
        `;
      } else if (q.quizType === 'situational') {
        ansDiv.innerHTML = `
          <div class="ans-title-row">
            <span class="ans-badge" style="background:#fef3c7; color:#92400e;">第 ${qNum} 題 情境素養</span>
            <span style="color:#000; font-weight:800; font-size:1.05rem;">正解：(${q._correctLetter}) ${q.correctAnswer}</span>
            <span class="ans-word">【${q.word}】 (${q.zhuyin})</span>
          </div>
          <div class="ans-desc"><b>【成語釋義】</b>${q.definition || '無'}</div>
          ${q.example ? `<div class="ans-full-ex"><b>【生活範例】</b>${q.example}</div>` : ''}
        `;
      } else if (q.quizType === 'conjunction') {
        ansDiv.innerHTML = `
          <div class="ans-title-row">
            <span class="ans-badge" style="background:#ecfdf5; color:#065f46;">第 ${qNum} 題 關聯複句</span>
            <span style="color:#000; font-weight:800; font-size:1.05rem;">正解：(${q._correctLetter}) ${q.correctAnswer}</span>
          </div>
          <div class="ans-full-ex"><b>【完整複句示範】</b>${q.example}</div>
        `;
      } else if (q.quizType === 'typo') {
        ansDiv.innerHTML = `
          <div class="ans-title-row">
            <span class="ans-badge" style="background:#fee2e2; color:#991b1b;">第 ${qNum} 題 錯字訂正</span>
            <span style="color:#000; font-weight:800; font-size:1.05rem;">正解：(${q._correctLetter}) ${q.correctAnswer}</span>
            <span class="ans-word">錯字「${q.typoChar}」➔ 正字「${q.targetChar}」</span>
          </div>
          <div class="ans-desc"><b>【詞條正字】</b><strong>${q.word}</strong> (${q.zhuyin}) ｜ 釋義：${q.definition || '無'}</div>
          <div class="ans-full-ex"><b>【正確原句】</b>${q.example}</div>
        `;
      } else if (q.quizType === 'unscramble') {
        ansDiv.innerHTML = `
          <div class="ans-title-row">
            <span class="ans-badge" style="background:#fef3c7; color:#92400e;">第 ${qNum} 題 重組造句</span>
            <span style="color:#000; font-weight:800; font-size:1.05rem;">正解：(${q._correctLetter}) ${q.correctOrderLabels}</span>
          </div>
          <div class="ans-full-ex"><b>【重組完整句子】</b>${q.cleanSentence}。</div>
        `;
      } else if (q.quizType === 'sentence') {
        const exampleText = (q.example || q.title || '').replace(/[()（）]/g, '').replace(/。$/, '');
        ansDiv.innerHTML = `
          <div class="ans-title-row">
            <span class="ans-badge">第 ${qNum} 題 照樣仿寫</span>
            <span class="ans-word">示範：${exampleText}</span>
          </div>
          <div class="ans-desc"><b>【標準示範例句】</b><span style="color:#059669; font-weight:700;">${exampleText}</span></div>
          <div style="font-size:0.83rem; color:#475569; margin-top:3px; line-height:1.45;">
            ※ <b>評分批改原則</b>：本題為開放式句構仿寫，<b>不硬性限制必須使用相同字詞</b>。只要字數節奏、詞性對稱（如動詞對動詞、名詞對名詞、並列連詞代換如「一面…一面…」寫成「一邊…一邊…」或「時而…時而…」）合理且語意流暢，均應評為滿分。
          </div>
        `;
      } else {
        ansDiv.innerHTML = `
          <div class="ans-title-row">
            <span class="ans-badge">第 ${qNum} 題 克漏字</span>
            <span style="color:#000; font-weight:800; font-size:1.05rem;">正解：(${q._correctLetter}) ${q.correctAnswer}</span>
            <span class="ans-word">${q.word} (${q.zhuyin})</span>
          </div>
          <div class="ans-desc"><b>【詞義釋義】</b>${q.definition || '無'}</div>
          ${q.example ? `<div class="ans-full-ex"><b>【完整例句】</b>${q.example}</div>` : ''}
        `;
      }

      elements.printableAnswerKeyList.appendChild(ansDiv);
    });
  }

  // ============================================================================
  // 核心功能 2: 線上互動測驗系統 (支援 8 大題型)
  // ============================================================================
  function startNewQuizSession(mode) {
    quizScore = 0;
    quizStreak = 0;
    currentQuizIndex = 0;
    updateQuizStats();

    currentQuizList = [];
    const count = 10;

    let candidates = [];
    if (mode === 'zhuyin') {
      candidates = shuffleArray(bankByType.withZhuyin);
      for (let c of candidates) {
        const q = buildZhuyinQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    } else if (mode === 'synonym') {
      candidates = shuffleArray(bankByType.withSynonyms);
      for (let c of candidates) {
        const q = buildSynonymQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    } else if (mode === 'situational') {
      candidates = shuffleArray(bankByType.idiom);
      for (let c of candidates) {
        const q = buildSituationalQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    } else if (mode === 'conjunction') {
      candidates = shuffleArray(bankByType.ellipsis);
      for (let c of candidates) {
        const q = buildConjunctionQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    } else if (mode === 'typo') {
      candidates = shuffleArray([...bankByType.idiom, ...bankByType.vocabulary]);
      for (let c of candidates) {
        const q = buildTypoQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    } else if (mode === 'unscramble') {
      candidates = shuffleArray([...bankByType.idiom, ...bankByType.vocabulary]);
      for (let c of candidates) {
        const q = buildUnscrambleQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    } else if (mode === 'sentence') {
      candidates = shuffleArray(bankByType.sentence);
      for (let c of candidates) {
        const q = buildSentenceMimicQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    } else if (mode === 'elementary') {
      candidates = shuffleArray(bankByType.vocabulary);
      for (let c of candidates) {
        const q = buildClozeQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    } else {
      // 隨機混合
      const pool = shuffleArray(rawBank);
      for (let c of pool) {
        const r = Math.random();
        let q = null;
        if (r < 0.2) q = buildClozeQuestion(c);
        else if (r < 0.35) q = buildZhuyinQuestion(c);
        else if (r < 0.5) q = buildSynonymQuestion(c);
        else if (r < 0.65) q = buildSituationalQuestion(c);
        else if (r < 0.8) q = buildTypoQuestion(c);
        else q = buildUnscrambleQuestion(c);
        if (q) currentQuizList.push(q);
        if (currentQuizList.length >= count) break;
      }
    }

    // 補齊
    let fIdx = 0;
    while (currentQuizList.length < count) {
      const q = buildClozeQuestion(rawBank[fIdx % rawBank.length]);
      if (q) currentQuizList.push(q);
      fIdx++;
    }

    renderCurrentQuizQuestion();
  }

  function updateQuizStats() {
    elements.quizScore.textContent = quizScore;
    elements.quizStreak.textContent = quizStreak;
    elements.quizProgress.textContent = `${currentQuizIndex + 1} / ${currentQuizList.length || 10}`;
  }

  function renderCurrentQuizQuestion() {
    if (currentQuizIndex >= currentQuizList.length) {
      renderQuizFinishedCard();
      return;
    }

    updateQuizStats();
    elements.quizExplanationBox.style.display = 'none';

    const q = currentQuizList[currentQuizIndex];

    if (q.quizType === 'unscramble') {
      elements.quizCategoryBadge.textContent = '重組造句';
      elements.quizCategoryBadge.className = 'badge badge-primary';
      elements.quizTypeHint.textContent = '請依序點選下方詞塊，組裝成流暢完整的句子';
      elements.quizOptionsContainer.style.display = 'none';
      elements.quizUnscrambleContainer.style.display = 'block';
      elements.quizWriteContainer.style.display = 'none';

      elements.quizQuestionPrompt.innerHTML = `文句重組：請將打亂的 4 個詞語依序點擊排好`;
      elements.quizPromptHint.innerHTML = `💡 提示：按語法順序點擊詞塊卡片，點錯可按「重排」重置。`;

      unscrambleUserSlots = [];
      renderUnscrambleInteractive(q);
    } else if (q.quizType === 'sentence') {
      elements.quizCategoryBadge.textContent = '短語仿寫';
      elements.quizCategoryBadge.className = 'badge badge-primary';
      elements.quizTypeHint.textContent = '觀察示範例句之詞性與節奏進行仿寫';
      elements.quizOptionsContainer.style.display = 'none';
      elements.quizUnscrambleContainer.style.display = 'none';
      elements.quizWriteContainer.style.display = 'block';
      elements.txtUserWriting.value = '';

      const exampleText = (q.example || q.title || '').replace(/[()（）]/g, '').replace(/。$/, '');

      elements.quizQuestionPrompt.innerHTML = `
        <div style="font-size:1.05rem; font-weight:700; color:#1e293b; margin-bottom:12px;">請體會示範短語的詞性節奏，發揮創意照樣仿寫：</div>
        <div class="q-example-prompt" style="margin-bottom:8px;">
          <span class="ex-tag">📖【例句示範】</span><strong>${exampleText}</strong>
        </div>
      `;
      elements.quizPromptHint.innerHTML = `💡 提示：掌握句構節奏與詞性搭配即可，用詞不需完全一模一樣（例如「一面…一面…」亦可仿寫為「一邊…一邊…」）。`;
    } else {
      // 選擇題型 (克漏字、注音、近義、情境、錯字、關聯詞)
      elements.quizOptionsContainer.style.display = 'grid';
      elements.quizUnscrambleContainer.style.display = 'none';
      elements.quizWriteContainer.style.display = 'none';

      let catName = '測驗挑戰';
      if (q.quizType === 'zhuyin') catName = '國字注音';
      else if (q.quizType === 'synonym') catName = '近義替換';
      else if (q.quizType === 'situational') catName = '情境素養';
      else if (q.quizType === 'conjunction') catName = '關聯複句';
      else if (q.quizType === 'typo') catName = '錯字訂正';
      else catName = q.category_name || '詞語造句';

      elements.quizCategoryBadge.textContent = catName;
      elements.quizCategoryBadge.className = 'badge badge-primary';
      elements.quizTypeHint.textContent = '請從下列選項中選出最適當的答案';

      elements.quizQuestionPrompt.innerHTML = q.promptSentence || q.example;
      elements.quizPromptHint.innerHTML = `
        <strong>💡 導引提示：</strong>${q.definition || '請依語法與語意邏輯選出最佳選項'}
        ${q.zhuyin ? ` ｜ <strong>注音：</strong>${q.zhuyin}` : ''}
      `;

      elements.quizOptionsContainer.innerHTML = '';
      q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.innerHTML = `<span>${opt}</span> <span class="opt-mark"></span>`;
        btn.addEventListener('click', () => handleChoiceAnswer(btn, opt, q));
        elements.quizOptionsContainer.appendChild(btn);
      });
    }
  }

  function handleChoiceAnswer(btn, selectedValue, question) {
    const allBtns = elements.quizOptionsContainer.querySelectorAll('.quiz-option-btn');
    allBtns.forEach(b => b.disabled = true);

    const isCorrect = (selectedValue === question.correctAnswer);

    if (isCorrect) {
      btn.classList.add('correct');
      btn.querySelector('.opt-mark').textContent = '✅';
      quizScore += 10;
      quizStreak += 1;
      elements.quizResultStatus.textContent = '🎉 答對了！太厲害了！';
      elements.quizResultStatus.className = 'result-status success';
    } else {
      btn.classList.add('wrong');
      btn.querySelector('.opt-mark').textContent = '❌';
      quizStreak = 0;
      elements.quizResultStatus.textContent = '💡 差一點點，再接再厲！';
      elements.quizResultStatus.className = 'result-status error';

      allBtns.forEach(b => {
        if (b.textContent.includes(question.correctAnswer)) {
          b.classList.add('correct');
          b.querySelector('.opt-mark').textContent = '✅';
        }
      });
    }

    updateQuizStats();

    elements.quizCorrectAnswer.innerHTML = `正確解答：<strong>${question.correctAnswer}</strong>`;
    elements.quizFullExample.innerHTML = `<strong>參考例句：</strong>${question.example || question.cleanSentence || '無完整原句'}`;

    let props = [];
    if (question.word) props.push(`詞條：${question.word}`);
    if (question.zhuyin) props.push(`注音：${question.zhuyin}`);
    if (question.definition) props.push(`釋義：${question.definition}`);
    elements.quizDetailProps.textContent = props.join(' ｜ ');

    elements.quizExplanationBox.style.display = 'block';
  }

  function renderUnscrambleInteractive(q) {
    elements.traySlots.innerHTML = '<span class="empty-hint">請依序點擊下方卡片...</span>';
    elements.unscrambleCardsGrid.innerHTML = '';

    q.labeledCards.forEach(c => {
      const cardBtn = document.createElement('button');
      cardBtn.className = 'unscramble-card-btn';
      cardBtn.innerHTML = `<strong>${c.label}</strong> <span>${c.text}</span>`;
      cardBtn.addEventListener('click', () => {
        if (cardBtn.classList.contains('selected')) return;
        cardBtn.classList.add('selected');
        unscrambleUserSlots.push(c);
        updateUnscrambleTray();
      });
      elements.unscrambleCardsGrid.appendChild(cardBtn);
    });
  }

  function updateUnscrambleTray() {
    if (unscrambleUserSlots.length === 0) {
      elements.traySlots.innerHTML = '<span class="empty-hint">請依序點擊下方卡片...</span>';
      return;
    }
    elements.traySlots.innerHTML = '';
    unscrambleUserSlots.forEach((c, idx) => {
      const chip = document.createElement('span');
      chip.className = 'unscramble-chip';
      chip.innerHTML = `<b>${idx + 1}.</b> ${c.label} (${c.text})`;
      elements.traySlots.appendChild(chip);
    });
  }

  function resetUnscrambleTray() {
    unscrambleUserSlots = [];
    updateUnscrambleTray();
    const cards = elements.unscrambleCardsGrid.querySelectorAll('.unscramble-card-btn');
    cards.forEach(c => c.classList.remove('selected'));
  }

  function submitUnscrambleAnswer() {
    const q = currentQuizList[currentQuizIndex];
    if (!q || !q.correctOrderLabels) return;

    if (unscrambleUserSlots.length < 4) {
      alert('請先點選滿 4 個詞組卡片再提交！');
      return;
    }

    const userOrder = unscrambleUserSlots.map(c => c.label).join('');
    const isCorrect = (userOrder === q.correctOrderLabels);

    if (isCorrect) {
      quizScore += 10;
      quizStreak += 1;
      elements.quizResultStatus.textContent = '🎉 語意重組完全正確！太棒了！';
      elements.quizResultStatus.className = 'result-status success';
    } else {
      quizStreak = 0;
      elements.quizResultStatus.textContent = '💡 排序稍有不同，來看看正確順序吧！';
      elements.quizResultStatus.className = 'result-status error';
    }

    updateQuizStats();

    elements.quizCorrectAnswer.innerHTML = `正確排列順序：<strong>${q.correctOrderLabels}</strong>`;
    elements.quizFullExample.innerHTML = `<strong>重組完整句子：</strong>${q.cleanSentence}。`;
    elements.quizDetailProps.textContent = `原詞詞條：${q.word || q.title}`;
    elements.quizExplanationBox.style.display = 'block';
  }

  function showWriteSample() {
    const q = currentQuizList[currentQuizIndex];
    elements.quizResultStatus.textContent = '✨ 參考示範範例';
    elements.quizResultStatus.className = 'result-status success';
    elements.quizCorrectAnswer.innerHTML = `標準參考：<strong>${q.example}</strong>`;
    if (q.quizType === 'sentence') {
      elements.quizFullExample.innerHTML = `<strong>評分原則：</strong>本題為開放式仿寫，詞性搭配與節奏對齊、語意通順即可滿分，不限制使用完全相同字詞。`;
    } else {
      elements.quizFullExample.innerHTML = `<strong>結構解析：</strong>${q.definition || '詞性結構對齊，語意通順完整。'}`;
    }
    elements.quizDetailProps.textContent = '';
    elements.quizExplanationBox.style.display = 'block';

    quizScore += 10;
    quizStreak += 1;
    updateQuizStats();
  }

  function nextQuestion() {
    currentQuizIndex++;
    renderCurrentQuizQuestion();
  }

  function renderQuizFinishedCard() {
    elements.quizQuestionPrompt.innerHTML = '🎊 本輪測驗完成！';
    elements.quizPromptHint.innerHTML = `
      您的最終得分：<strong style="color:var(--primary); font-size:1.4rem;">${quizScore}</strong> 分！<br>
      最高連勝紀錄：<strong>${quizStreak}</strong> 次！
    `;
    elements.quizOptionsContainer.style.display = 'none';
    elements.quizUnscrambleContainer.style.display = 'none';
    elements.quizWriteContainer.style.display = 'none';
    elements.quizExplanationBox.style.display = 'none';

    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary btn-block';
    retryBtn.textContent = '🔄 再挑戰一輪 (換新題庫)';
    retryBtn.addEventListener('click', () => startNewQuizSession(quizCurrentMode));
    elements.quizOptionsContainer.innerHTML = '';
    elements.quizOptionsContainer.style.display = 'block';
    elements.quizOptionsContainer.appendChild(retryBtn);
  }

  // ============================================================================
  // 核心功能 3: 題庫字典大檢索 (全量 31,302 筆)
  // ============================================================================
  function initDictSearch() {
    filterDictionary();
  }

  function filterDictionary() {
    const keyword = elements.dictSearchInput.value.trim().toLowerCase();
    const type = elements.dictFilterType.value;

    dictFilteredList = rawBank.filter(item => {
      if (type !== 'all' && item.type !== type) return false;
      if (!keyword) return true;

      const matchWord = (item.word || '').toLowerCase().includes(keyword);
      const matchZhuyin = (item.zhuyin || '').toLowerCase().includes(keyword);
      const matchDef = (item.definition || '').toLowerCase().includes(keyword);
      const matchEx = (item.example || '').toLowerCase().includes(keyword);
      return matchWord || matchZhuyin || matchDef || matchEx;
    });

    elements.dictResultCount.textContent = dictFilteredList.length.toLocaleString();
    dictCurrentPage = 1;
    renderDictCards();
  }

  function renderDictCards() {
    elements.dictCardsList.innerHTML = '';
    appendDictCardsBatch();
  }

  function appendDictCardsBatch() {
    const start = (dictCurrentPage - 1) * DICT_PAGE_SIZE;
    const end = start + DICT_PAGE_SIZE;
    const batch = dictFilteredList.slice(start, end);

    batch.forEach(item => {
      const card = document.createElement('div');
      card.className = 'dict-card';

      const typeBadgeClass = (item.type === 'idiom') ? 'badge-primary' : 'badge-success';

      card.innerHTML = `
        <div class="dict-card-header">
          <span class="dict-word-title">${item.word || item.title}</span>
          <span class="badge ${typeBadgeClass}">${item.category_name}</span>
        </div>
        ${item.zhuyin ? `<div class="dict-zhuyin">注音：${item.zhuyin}</div>` : ''}
        ${item.definition ? `<div class="dict-def"><b>釋義：</b>${item.definition}</div>` : ''}
        ${item.example ? `<div class="dict-ex"><b>例句：</b>${item.example}</div>` : ''}
      `;
      elements.dictCardsList.appendChild(card);
    });

    if (end < dictFilteredList.length) {
      elements.btnLoadMoreDict.style.display = 'inline-block';
    } else {
      elements.btnLoadMoreDict.style.display = 'none';
    }
  }

  function loadMoreDictItems() {
    dictCurrentPage++;
    appendDictCardsBatch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // 兜底保證：超時 4 秒自動淡出遮罩
  setTimeout(() => {
    const loader = document.getElementById('appLoader');
    if (loader && loader.style.display !== 'none') {
      loader.style.opacity = '0';
      setTimeout(() => { loader.style.display = 'none'; }, 300);
    }
  }, 4000);
})();
