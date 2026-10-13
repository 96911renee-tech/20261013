// 設定 Google 試算表發布後的 CSV 網址
const GOOGLE_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEUDhDXIzgTuCS_z8_EJdBjItb0U8gCCTJ02jmt1eRQcMgb1Y0PH-T6M_0zf3LzOlqKGu-6FoOK4zN/pub?gid=1179744947&single=true&output=csv";

// 設定中文字型
const CHINESE_FONT = "Noto Serif TC";

// 設定英文與數字字型
const ENGLISH_FONT = "Libre Caslon Condensed";

// 設定每次測驗抽出的題目數量
const QUIZ_QUESTION_COUNT = 5;

// 設定自動更新題庫的時間，單位為毫秒
const UPDATE_INTERVAL = 60000;

// 儲存完整題庫
let questionBank = [];

// 儲存本次抽出的題目
let quizQuestions = [];

// 設定目前題目編號
let currentQuestion = 0;

// 設定答對題數
let score = 0;

// 設定是否已作答
let answered = false;

// 設定是否答錯
let wrongAnswer = false;

// 設定跳動動畫時間
let bounceTime = 0;

// 設定是否顯示提示文字
let showInstruction = true;

// 設定題庫是否已載入
let dataReady = false;

// 設定題庫是否發生錯誤
let dataError = false;

// 設定錯誤訊息
let errorMessage = "";

// 儲存選項按鈕
let optionButtons = [];

// 儲存下一題按鈕
let nextButton = null;

// 儲存重新抽題按鈕
let restartButton = null;

// 儲存畫布物件
let canvasElement = null;

// 設定響應式版面變數
let pagePadding = 20;
let buttonWidth = 300;
let buttonHeight = 50;
let buttonGap = 12;
let optionsStartY = 240;
let titleSize = 32;
let questionSize = 24;
let normalTextSize = 20;

// 預先載入 Google Fonts
function preload() {
  // 載入中文字型
  document.fonts.load('400 24px "Noto Serif TC"');

  // 載入英文字型
  document.fonts.load('400 24px "Libre Caslon Condensed"');
}

// 建立畫布與介面
function setup() {
  // 建立全螢幕畫布
  canvasElement = createCanvas(windowWidth, windowHeight);

  // 設定網頁外距
  document.body.style.margin = "0";

  // 設定網頁背景顏色
  document.body.style.backgroundColor = "#f1faee";

  // 隱藏網頁捲軸
  document.body.style.overflow = "hidden";

  // 設定畫布顯示方式
  canvasElement.style("display", "block");

  // 設定文字水平與垂直置中
  textAlign(CENTER, CENTER);

  // 設定預設中文字型
  textFont(CHINESE_FONT);

  // 建立選項按鈕
  createOptionButtons();

  // 建立下一題按鈕
  createNextButton();

  // 建立重新抽題按鈕
  createRestartButton();

  // 計算響應式版面
  calculateLayout();

  // 設定按鈕位置
  positionButtons();

  // 立即讀取 Google 試算表題庫
  loadGoogleSheetQuestions();

  // 設定定時更新題庫
  setInterval(loadGoogleSheetQuestions, UPDATE_INTERVAL);
}

// 從 Google 試算表讀取 CSV 題庫
function loadGoogleSheetQuestions() {
  // 建立避免瀏覽器快取的網址
  let requestUrl =
    GOOGLE_SHEET_CSV_URL +
    (GOOGLE_SHEET_CSV_URL.includes("?") ? "&" : "?") +
    "timestamp=" +
    Date.now();

  // 使用 fetch 讀取 Google 試算表 CSV
  fetch(requestUrl)
    .then(function (response) {
      // 判斷網路回應是否成功
      if (!response.ok) {
        // 建立錯誤
        throw new Error("Google 試算表讀取失敗：" + response.status);
      }

      // 將回應轉換成文字
      return response.text();
    })
    .then(function (csvText) {
      // 將 CSV 文字解析成題目資料
      let loadedQuestions = parseCSV(csvText);

      // 判斷題目數量是否足夠
      if (loadedQuestions.length < QUIZ_QUESTION_COUNT) {
        // 建立題庫數量錯誤
        throw new Error("Google 試算表有效題目少於五題。");
      }

      // 更新完整題庫
      questionBank = loadedQuestions;

      // 設定題庫已載入
      dataReady = true;

      // 清除錯誤狀態
      dataError = false;

      // 清除錯誤訊息
      errorMessage = "";

      // 如果目前尚未開始測驗，就開始抽題
      if (quizQuestions.length === 0) {
        // 開始隨機抽出五題
        startQuiz();
      }
    })
    .catch(function (error) {
      // 設定錯誤狀態
      dataError = true;

      // 儲存錯誤訊息
      errorMessage = error.message;

      // 在主控台顯示錯誤
      console.error(error);
    });
}

// 解析 CSV 文字
function parseCSV(csvText) {
  // 將 CSV 文字依照換行切開
  let rows = csvText.trim().split(/\r?\n/);

  // 判斷是否沒有資料
  if (rows.length < 2) {
    // 回傳空題庫
    return [];
  }

  // 解析第一列欄位名稱
  let headers = parseCSVLine(rows[0]);

  // 找出各欄位位置
  let questionIndex = headers.indexOf("question");
  let optionAIndex = headers.indexOf("optionA");
  let optionBIndex = headers.indexOf("optionB");
  let optionCIndex = headers.indexOf("optionC");
  let optionDIndex = headers.indexOf("optionD");
  let answerIndex = headers.indexOf("answer");

  // 宣告題庫陣列
  let parsedQuestions = [];

  // 從第二列開始讀取題目
  for (let i = 1; i < rows.length; i++) {
    // 解析目前資料列
    let columns = parseCSVLine(rows[i]);

    // 讀取題目內容
    let question = cleanText(columns[questionIndex]);

    // 讀取四個選項
    let optionA = cleanText(columns[optionAIndex]);
    let optionB = cleanText(columns[optionBIndex]);
    let optionC = cleanText(columns[optionCIndex]);
    let optionD = cleanText(columns[optionDIndex]);

    // 讀取答案
    let answerText = cleanText(columns[answerIndex]);

    // 將答案轉換為索引
    let answer = convertAnswerToIndex(answerText);

    // 確認資料完整
    if (
      question !== "" &&
      optionA !== "" &&
      optionB !== "" &&
      optionC !== "" &&
      optionD !== "" &&
      answer >= 0 &&
      answer <= 3
    ) {
      // 將題目加入題庫
      parsedQuestions.push({
        question: question,
        options: [optionA, optionB, optionC, optionD],
        answer: answer
      });
    }
  }

  // 回傳解析後的題庫
  return parsedQuestions;
}

// 解析 CSV 單列資料
function parseCSVLine(line) {
  // 建立儲存欄位的陣列
  let result = [];

  // 建立目前欄位內容
  let current = "";

  // 設定是否位於雙引號內
  let insideQuotes = false;

  // 逐字解析
  for (let i = 0; i < line.length; i++) {
    // 取得目前字元
    let character = line[i];

    // 判斷是否遇到雙引號
    if (character === '"') {
      // 判斷是否為連續雙引號
      if (insideQuotes && line[i + 1] === '"') {
        // 將雙引號加入欄位
        current += '"';

        // 跳過下一個雙引號
        i++;
      } else {
        // 切換雙引號狀態
        insideQuotes = !insideQuotes;
      }
    } else if (character === "," && !insideQuotes) {
      // 將目前欄位加入結果
      result.push(current);

      // 清空目前欄位
      current = "";
    } else {
      // 將字元加入目前欄位
      current += character;
    }
  }

  // 加入最後一個欄位
  result.push(current);

  // 回傳解析結果
  return result;
}

// 清理文字
function cleanText(value) {
  // 判斷內容是否存在
  if (value === undefined || value === null) {
    // 回傳空字串
    return "";
  }

  // 移除前後空白
  return String(value).trim();
}

// 將答案轉換為索引
function convertAnswerToIndex(answerText) {
  // 將答案轉成大寫
  let answer = answerText.toUpperCase();

  // 判斷 A 或 0
  if (answer === "A" || answer === "0") {
    // 回傳第一個選項
    return 0;
  }

  // 判斷 B 或 1
  if (answer === "B" || answer === "1") {
    // 回傳第二個選項
    return 1;
  }

  // 判斷 C 或 2
  if (answer === "C" || answer === "2") {
    // 回傳第三個選項
    return 2;
  }

  // 判斷 D 或 3
  if (answer === "D" || answer === "3") {
    // 回傳第四個選項
    return 3;
  }

  // 回傳無效答案
  return -1;
}

// 開始一次新的測驗
function startQuiz() {
  // 從題庫隨機抽出五題
  quizQuestions = shuffle(questionBank).slice(
    0,
    QUIZ_QUESTION_COUNT
  );

  // 重設題目編號
  currentQuestion = 0;

  // 重設答對題數
  score = 0;

  // 更新題目
  updateQuestion();

  // 重新設定按鈕位置
  positionButtons();
}

// 建立選項按鈕
function createOptionButtons() {
  // 建立四個按鈕
  for (let i = 0; i < 4; i++) {
    // 建立空白按鈕
    let button = createButton("");

    // 設定選項按鈕字型
    button.style(
      "font-family",
      '"' + ENGLISH_FONT + '", "' + CHINESE_FONT + '", serif'
    );

    // 設定按鈕文字大小
    button.style("font-size", "20px");

    // 設定按鈕內距
    button.style("padding", "10px 16px");

    // 設定背景顏色
    button.style("background-color", "#ffffff");

    // 設定文字顏色
    button.style("color", "#023047");

    // 設定邊框
    button.style("border", "2px solid #8ecae6");

    // 設定圓角
    button.style("border-radius", "8px");

    // 設定盒模型
    button.style("box-sizing", "border-box");

    // 設定最小高度
    button.style("min-height", "44px");

    // 設定文字換行
    button.style("white-space", "normal");

    // 設定觸控操作
    button.style("touch-action", "manipulation");

    // 設定滑鼠游標
    button.style("cursor", "pointer");

    // 設定按鈕點擊事件
    button.mousePressed(function () {
      // 判斷答案
      checkAnswer(i);
    });

    // 將按鈕加入陣列
    optionButtons.push(button);
  }
}

// 建立下一題按鈕
function createNextButton() {
  // 建立下一題按鈕
  nextButton = createButton("下一題");

  // 設定字型
  nextButton.style("font-family", '"' + CHINESE_FONT + '", serif');

  // 設定文字大小
  nextButton.style("font-size", "20px");

  // 設定內距
  nextButton.style("padding", "10px 28px");

  // 設定文字顏色
  nextButton.style("color", "#ffffff");

  // 設定背景顏色
  nextButton.style("background-color", "#023047");

  // 移除邊框
  nextButton.style("border", "none");

  // 設定圓角
  nextButton.style("border-radius", "8px");

  // 設定最小高度
  nextButton.style("min-height", "44px");

  // 設定觸控操作
  nextButton.style("touch-action", "manipulation");

  // 設定滑鼠游標
  nextButton.style("cursor", "pointer");

  // 設定點擊事件
  nextButton.mousePressed(nextQuestion);

  // 隱藏按鈕
  nextButton.hide();
}

// 建立重新抽題按鈕
function createRestartButton() {
  // 建立重新抽題按鈕
  restartButton = createButton("重新抽題");

  // 設定字型
  restartButton.style("font-family", '"' + CHINESE_FONT + '", serif');

  // 設定文字大小
  restartButton.style("font-size", "20px");

  // 設定內距
  restartButton.style("padding", "10px 28px");

  // 設定文字顏色
  restartButton.style("color", "#ffffff");

  // 設定背景顏色
  restartButton.style("background-color", "#219ebc");

  // 移除邊框
  restartButton.style("border", "none");

  // 設定圓角
  restartButton.style("border-radius", "8px");

  // 設定點擊事件
  restartButton.mousePressed(startQuiz);

  // 隱藏按鈕
  restartButton.hide();
}

// 每一幀繪製畫面
function draw() {
  // 設定背景顏色
  background("#f1faee");

  // 判斷題庫是否讀取錯誤
  if (dataError) {
    // 顯示錯誤訊息
    drawErrorMessage();

    // 結束繪圖
    return;
  }

  // 判斷題庫是否尚未讀取
  if (!dataReady || quizQuestions.length === 0) {
    // 顯示載入訊息
    drawLoadingMessage();

    // 結束繪圖
    return;
  }

  // 判斷是否完成五題
  if (currentQuestion >= quizQuestions.length) {
    // 顯示測驗結果
    drawResult();

    // 結束繪圖
    return;
  }

  // 計算響應式版面
  calculateLayout();

  // 設定標題顏色
  fill("#023047");

  // 設定標題大小
  textSize(titleSize);

  // 設定標題粗體
  textStyle(BOLD);

  // 顯示標題
  drawMixedText(
    "p5.js 簡易指令測驗",
    width / 2,
    pagePadding + titleSize / 2
  );

  // 恢復一般文字
  textStyle(NORMAL);

  // 設定題數顏色
  fill("#219ebc");

  // 設定題數大小
  textSize(normalTextSize);

  // 顯示目前題數
  drawMixedText(
    "第 " +
      (currentQuestion + 1) +
      " 題 / 共 " +
      quizQuestions.length +
      " 題",
    width / 2,
    pagePadding + titleSize + 28
  );

  // 設定題目顏色
  fill("#023047");

  // 設定題目大小
  textSize(questionSize);

  // 顯示題目
  drawWrappedText(
    quizQuestions[currentQuestion].question,
    width / 2,
    pagePadding + titleSize + 78,
    width - pagePadding * 2
  );

  // 判斷是否顯示提示文字
  if (showInstruction) {
    // 設定提示文字顏色
    fill("#023047");

    // 設定提示文字大小
    textSize(normalTextSize + 4);

    // 設定粗體
    textStyle(BOLD);

    // 顯示作答提示
    drawChineseText(
      "請點擊一個選項作答",
      width / 2,
      getInstructionY()
    );

    // 恢復一般文字
    textStyle(NORMAL);
  }

  // 判斷是否播放正確選項跳動
  if (wrongAnswer && !answered) {
    // 增加跳動動畫時間
    bounceTime += 0.12;

    // 更新按鈕位置
    positionButtons();
  }
}

// 顯示載入中訊息
function drawLoadingMessage() {
  // 設定文字顏色
  fill("#023047");

  // 設定文字大小
  textSize(28);

  // 顯示載入訊息
  drawChineseText("正在讀取 Google 試算表題庫⋯⋯", width / 2, height / 2);
}

// 顯示錯誤訊息
function drawErrorMessage() {
  // 設定錯誤訊息顏色
  fill("#d62828");

  // 設定錯誤訊息大小
  textSize(22);

  // 顯示錯誤訊息
  drawChineseText(errorMessage, width / 2, height / 2 - 40);

  // 設定補充文字大小
  textSize(18);

  // 顯示檢查提示
  drawChineseText(
    "請確認試算表已發布為 CSV，且網址設定正確。",
    width / 2,
    height / 2 + 20
  );
}

// 計算響應式版面
function calculateLayout() {
  // 設定左右留白
  pagePadding = constrain(width * 0.06, 16, 60);

  // 設定標題大小
  titleSize = constrain(width * 0.055, 24, 42);

  // 設定題目大小
  questionSize = constrain(width * 0.042, 18, 30);

  // 設定一般文字大小
  normalTextSize = constrain(width * 0.032, 16, 24);

  // 設定按鈕寬度
  buttonWidth = min(width - pagePadding * 2, 680);

  // 設定按鈕高度
  buttonHeight = constrain(height * 0.065, 44, 62);

  // 設定按鈕間距
  buttonGap = constrain(height * 0.018, 8, 18);

  // 設定選項起始位置
  optionsStartY = pagePadding + titleSize + 145;

  // 設定選項按鈕樣式
  for (let button of optionButtons) {
    // 設定按鈕文字大小
    button.style("font-size", normalTextSize + "px");

    // 設定按鈕高度
    button.style("height", buttonHeight + "px");
  }

  // 設定下一題按鈕文字大小
  if (nextButton) {
    // 設定下一題文字大小
    nextButton.style("font-size", normalTextSize + "px");
  }

  // 設定重新抽題按鈕文字大小
  if (restartButton) {
    // 設定重新抽題文字大小
    restartButton.style("font-size", normalTextSize + "px");
  }
}

// 更新題目內容
function updateQuestion() {
  // 確認題目已經抽出
  if (quizQuestions.length === 0) {
    // 結束函式
    return;
  }

  // 判斷是否完成測驗
  if (currentQuestion >= quizQuestions.length) {
    // 隱藏所有選項
    for (let button of optionButtons) {
      // 隱藏選項按鈕
      button.hide();
    }

    // 隱藏下一題按鈕
    nextButton.hide();

    // 顯示重新抽題按鈕
    restartButton.show();

    // 隱藏提示文字
    showInstruction = false;

    // 設定重新抽題按鈕位置
    restartButton.position(width / 2 - 60, height / 2 + 120);

    // 結束函式
    return;
  }

  // 隱藏重新抽題按鈕
  restartButton.hide();

  // 重設作答狀態
  answered = false;

  // 重設答錯狀態
  wrongAnswer = false;

  // 重設動畫時間
  bounceTime = 0;

  // 顯示作答提示
  showInstruction = true;

  // 取得目前題目資料
  let questionData = quizQuestions[currentQuestion];

  // 更新四個選項
  for (let i = 0; i < optionButtons.length; i++) {
    // 設定選項文字
    optionButtons[i].html(
      String.fromCharCode(65 + i) + ". " + questionData.options[i]
    );

    // 顯示選項按鈕
    optionButtons[i].show();

    // 恢復背景顏色
    optionButtons[i].style("background-color", "#ffffff");

    // 恢復文字顏色
    optionButtons[i].style("color", "#023047");

    // 恢復邊框顏色
    optionButtons[i].style("border", "2px solid #8ecae6");
  }

  // 隱藏下一題按鈕
  nextButton.hide();

  // 重新設定按鈕位置
  positionButtons();
}

// 判斷答案
function checkAnswer(selectedIndex) {
  // 防止重複作答
  if (answered) {
    // 結束函式
    return;
  }

  // 取得正確答案
  let correctIndex = quizQuestions[currentQuestion].answer;

  // 判斷答案是否正確
  if (selectedIndex === correctIndex) {
    // 增加答對題數
    score++;

    // 設定已作答
    answered = true;

    // 隱藏作答提示
    showInstruction = false;

    // 將正確選項變成綠色
    optionButtons[selectedIndex].style("background-color", "#90be6d");

    // 將正確選項文字變成白色
    optionButtons[selectedIndex].style("color", "#ffffff");

    // 顯示下一題按鈕
    nextButton.show();

    // 更新按鈕位置
    positionButtons();
  } else {
    // 設定答錯狀態
    wrongAnswer = true;

    // 隱藏作答提示
    showInstruction = false;

    // 將正確選項設定為 #219ebc
    optionButtons[correctIndex].style("background-color", "#219ebc");

    // 將正確選項文字設定為白色
    optionButtons[correctIndex].style("color", "#ffffff");

    // 將正確選項邊框設定為 #219ebc
    optionButtons[correctIndex].style("border", "2px solid #219ebc");

    // 顯示下一題按鈕
    nextButton.show();

    // 更新按鈕位置
    positionButtons();
  }
}

// 切換下一題
function nextQuestion() {
  // 增加目前題目編號
  currentQuestion++;

  // 更新題目
  updateQuestion();
}

// 計算提示文字位置
function getInstructionY() {
  // 將提示文字放在四個選項下方
  return (
    optionsStartY +
    optionButtons.length * (buttonHeight + buttonGap) +
    normalTextSize
  );
}

// 設定按鈕位置
function positionButtons() {
  // 確認選項按鈕已建立
  if (optionButtons.length === 0) {
    // 尚未建立按鈕時停止執行
    return;
  }

  // 計算響應式版面
  calculateLayout();

  // 設定四個選項按鈕
  for (let i = 0; i < optionButtons.length; i++) {
    // 計算按鈕基本位置
    let y = optionsStartY + i * (buttonHeight + buttonGap);

    // 設定跳動位移
    let bounceOffset = 0;

    // 判斷是否為答錯後的正確選項
    if (
      wrongAnswer &&
      !answered &&
      currentQuestion < quizQuestions.length &&
      i === quizQuestions[currentQuestion].answer
    ) {
      // 計算上下跳動效果
      bounceOffset = sin(bounceTime) * 12;
    }

    // 設定選項按鈕位置
    optionButtons[i].position(
      width / 2 - buttonWidth / 2,
      y + bounceOffset
    );

    // 設定按鈕寬度
    optionButtons[i].style("width", buttonWidth + "px");

    // 設定按鈕高度
    optionButtons[i].style("height", buttonHeight + "px");
  }

  // 確認下一題按鈕存在
  if (!nextButton || !nextButton.elt) {
    // 尚未建立按鈕時停止執行
    return;
  }

  // 取得下一題按鈕顯示狀態
  let displayValue = window.getComputedStyle(nextButton.elt).display;

  // 判斷下一題按鈕是否顯示
  if (displayValue !== "none") {
    // 設定下一題按鈕位置
    nextButton.position(
      width / 2 - 60,
      getInstructionY() + normalTextSize + 24
    );
  }
}

// 使用中文字型繪製文字
function drawChineseText(message, x, y) {
  // 設定中文字型
  textFont(CHINESE_FONT);

  // 繪製中文文字
  text(message, x, y);
}

// 使用對應字型繪製混合文字
function drawMixedText(message, x, y) {
  // 設定文字總寬度
  let totalWidth = 0;

  // 計算每個字元寬度
  for (let character of message) {
    // 判斷是否為中文
    if (isChineseCharacter(character)) {
      // 使用中文字型
      textFont(CHINESE_FONT);
    } else {
      // 使用英文與數字字型
      textFont(ENGLISH_FONT);
    }

    // 累加字元寬度
    totalWidth += textWidth(character);
  }

  // 設定第一個字元位置
  let currentX = x - totalWidth / 2;

  // 逐字繪製混合文字
  for (let character of message) {
    // 判斷是否為中文
    if (isChineseCharacter(character)) {
      // 使用中文字型
      textFont(CHINESE_FONT);
    } else {
      // 使用英文與數字字型
      textFont(ENGLISH_FONT);
    }

    // 取得目前字元寬度
    let characterWidth = textWidth(character);

    // 繪製目前字元
    text(character, currentX + characterWidth / 2, y);

    // 移動到下一個字元
    currentX += characterWidth;
  }
}

// 判斷是否為中文字
function isChineseCharacter(character) {
  // 使用 Unicode 範圍判斷中文字
  return /[\u3400-\u9fff]/.test(character);
}

// 繪製自動換行文字
function drawWrappedText(message, x, y, maxWidth) {
  // 設定中文字型
  textFont(CHINESE_FONT);

  // 將文字拆成單一字元
  let characters = message.split("");

  // 儲存目前文字行
  let line = "";

  // 儲存所有文字行
  let lines = [];

  // 逐字處理文字
  for (let character of characters) {
    // 建立測試文字行
    let testLine = line + character;

    // 判斷是否超過最大寬度
    if (textWidth(testLine) > maxWidth && line.length > 0) {
      // 儲存目前文字行
      lines.push(line);

      // 開始新的一行
      line = character;
    } else {
      // 加入目前文字行
      line = testLine;
    }
  }

  // 儲存最後一行
  lines.push(line);

  // 設定文字行距
  let lineHeight = questionSize * 1.35;

  // 計算文字總高度
  let totalHeight = lines.length * lineHeight;

  // 逐行繪製文字
  for (let i = 0; i < lines.length; i++) {
    // 計算目前文字行位置
    let lineY =
      y - totalHeight / 2 + lineHeight / 2 + i * lineHeight;

    // 繪製文字
    text(lines[i], x, lineY);
  }
}

// 顯示測驗結果
function drawResult() {
  // 設定標題顏色
  fill("#023047");

  // 設定標題大小
  textSize(constrain(width * 0.08, 28, 48));

  // 設定粗體
  textStyle(BOLD);

  // 顯示完成文字
  drawChineseText("測驗完成！", width / 2, height / 2 - 80);

  // 恢復一般文字
  textStyle(NORMAL);

  // 設定成績顏色
  fill("#219ebc");

  // 設定成績大小
  textSize(constrain(width * 0.06, 24, 36));

  // 顯示成績
  drawMixedText(
    "你答對了 " + score + " / " + quizQuestions.length + " 題",
    width / 2,
    height / 2
  );

  // 設定鼓勵文字顏色
  fill("#023047");

  // 設定鼓勵文字大小
  textSize(constrain(width * 0.04, 18, 26));

  // 顯示鼓勵文字
  drawMixedText(
    "歡迎繼續練習 p5.js！",
    width / 2,
    height / 2 + 75
  );
}

// 視窗大小改變時重新排版
function windowResized() {
  // 重新調整畫布大小
  resizeCanvas(windowWidth, windowHeight);

  // 確認介面元件已建立
  if (!nextButton || optionButtons.length === 0) {
    // 尚未建立完成時停止執行
    return;
  }

  // 重新計算版面
  calculateLayout();

  // 重新設定按鈕位置
  positionButtons();
}