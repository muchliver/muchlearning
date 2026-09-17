# ==============================================================================
# 造句救星題庫爬蟲與結構化處理腳本 (scraper.ps1) - 全量 30,070+ 筆完整採集版
# ==============================================================================
param(
    [int]$MaxUncategorizedPages = 301,  # 預設 301 頁，全量爬取所有 30,070 篇一般造句與成語
    [string]$OutputDir = "$PSScriptRoot\data"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

function Clean-Html {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return "" }
    $t = [System.Net.WebUtility]::HtmlDecode($Text)
    $t = $t -replace '<br\s*/?>', "`n"
    $t = $t -replace '<[^>]+>', ''
    $t = $t -replace '&nbsp;', ' '
    $t = $t.Trim()
    return $t
}

$client = New-Object System.Net.WebClient
$client.Encoding = [System.Text.Encoding]::UTF8
$client.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)")

$allQuestions = [System.Collections.Generic.List[PSCustomObject]]::new()
$categoriesSummary = @{
    idioms = 0
    words = 0
    ellipsis = 0
    sentence = 0
    total = 0
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "開始執行「造句救星」全量題庫深度爬取..." -ForegroundColor Cyan
Write-Host "一般造句目標頁數: $MaxUncategorizedPages 頁 (全量 30,070 篇)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. 爬取 句型練習 (Category 4 - ellipsis) - 455 條
# ------------------------------------------------------------------------------
Write-Host "`n[1/3] 爬取 句型練習（刪節號造句）全部 5 頁 (共 455 條)..." -ForegroundColor Yellow
$cat4Pages = 5
for ($page = 1; $page -le $cat4Pages; $page++) {
    $url = "https://bookmarks.tw/dictionary/wp-json/wp/v2/posts?categories=4&per_page=100&page=$page&_fields=id,title,content"
    try {
        Write-Host "  -> 讀取第 $page/$cat4Pages 頁..." -NoNewline
        $jsonRaw = $client.DownloadString($url)
        $posts = $jsonRaw | ConvertFrom-Json
        foreach ($post in $posts) {
            $html = $post.content.rendered
            $title = Clean-Html $post.title.rendered
            
            $mPattern = [regex]::Match($html, "(?s)<h1>\s*(?:【)?(.*?)(?:】)?\s*</h1>")
            $pattern = if ($mPattern.Success -and -not [string]::IsNullOrWhiteSpace($mPattern.Groups[1].Value)) {
                Clean-Html $mPattern.Groups[1].Value
            } else {
                $title
            }
            
            $mEx = [regex]::Match($html, "(?s)<th[^>]*>.*?範.*?例.*?</th>\s*<td[^>]*>(.*?)</td>")
            $example = if ($mEx.Success) {
                $exText = Clean-Html $mEx.Groups[1].Value
                $exText = $exText -replace '^[「"『\s]+', '' -replace '[」"』\s]+$', ''
                $exText
            } else { "" }

            $isStub = [string]::IsNullOrWhiteSpace($example)
            if ($isStub) {
                $example = "（請依【$pattern】句型語境發揮想像力完成完整造句）"
            }

            if (-not [string]::IsNullOrWhiteSpace($pattern)) {
                $item = [PSCustomObject]@{
                    id = "ellipsis-$($post.id)"
                    type = "ellipsis"
                    category_name = "句型練習"
                    word = $pattern
                    title = $pattern
                    pattern = $pattern
                    zhuyin = ""
                    synonyms = ""
                    antonyms = ""
                    definition = "句型運用與刪節號複句造句練習"
                    example = $example
                    difficulty = "junior_high"
                    is_stub = $isStub
                }
                $allQuestions.Add($item)
                $categoriesSummary.ellipsis++
            }
        }
        Write-Host " 完成 (累計: $($allQuestions.Count))" -ForegroundColor Green
    }
    catch {
        Write-Host " 結束或錯誤: $($_.Exception.Message)" -ForegroundColor Red
        break
    }
}

# ------------------------------------------------------------------------------
# 2. 爬取 短語練習（照樣造句） (Category 2 - sentence) - 860 條
# ------------------------------------------------------------------------------
Write-Host "`n[2/3] 爬取 短語練習（照樣造句）全部 9 頁 (共 860 條)..." -ForegroundColor Yellow
$cat2Pages = 9
for ($page = 1; $page -le $cat2Pages; $page++) {
    $url = "https://bookmarks.tw/dictionary/wp-json/wp/v2/posts?categories=2&per_page=100&page=$page&_fields=id,title,content"
    try {
        Write-Host "  -> 讀取第 $page/$cat2Pages 頁..." -NoNewline
        $jsonRaw = $client.DownloadString($url)
        $posts = $jsonRaw | ConvertFrom-Json
        foreach ($post in $posts) {
            $html = $post.content.rendered
            $title = Clean-Html $post.title.rendered
            
            $mTemplate = [regex]::Match($html, "(?s)<h1>\s*(?:【)?(.*?)(?:】)?\s*</h1>")
            $template = if ($mTemplate.Success -and -not [string]::IsNullOrWhiteSpace($mTemplate.Groups[1].Value)) {
                Clean-Html $mTemplate.Groups[1].Value
            } else {
                $title
            }
            
            $mEx = [regex]::Match($html, "(?s)<th[^>]*>.*?範.*?例.*?</th>\s*<td[^>]*>(.*?)</td>")
            $example = if ($mEx.Success) {
                $exText = Clean-Html $mEx.Groups[1].Value
                $exText -replace '^[「"『\s]+', '' -replace '[」"』\s]+$', ''
            } else { "" }

            if (-not [string]::IsNullOrWhiteSpace($template) -and -not [string]::IsNullOrWhiteSpace($example)) {
                $item = [PSCustomObject]@{
                    id = "sentence-$($post.id)"
                    type = "sentence"
                    category_name = "短語練習"
                    word = $title
                    title = $title
                    template = $template
                    pattern = $template
                    zhuyin = ""
                    synonyms = ""
                    antonyms = ""
                    definition = "短語句構照樣造句仿寫"
                    example = $example
                    difficulty = "elementary"
                }
                $allQuestions.Add($item)
                $categoriesSummary.sentence++
            }
        }
        Write-Host " 完成 (累計: $($allQuestions.Count))" -ForegroundColor Green
    }
    catch {
        Write-Host " 結束或錯誤: $($_.Exception.Message)" -ForegroundColor Red
        break
    }
}

# ------------------------------------------------------------------------------
# 3. 爬取 一般造句與成語庫 (Category 1 - uncategorized) - 全量 301 頁
# ------------------------------------------------------------------------------
Write-Host "`n[3/3] 爬取 一般造句與成語庫 (全量目標: $MaxUncategorizedPages 頁，約 30,070 篇)..." -ForegroundColor Yellow

$outputJsonPath = Join-Path $OutputDir "question_bank.json"
$outputJsPath = Join-Path $OutputDir "question_bank.js"
$summaryJsonPath = Join-Path $OutputDir "categories.json"

for ($page = 1; $page -le $MaxUncategorizedPages; $page++) {
    $url = "https://bookmarks.tw/dictionary/wp-json/wp/v2/posts?categories=1&per_page=100&page=$page&_fields=id,title,content"
    try {
        $jsonRaw = $client.DownloadString($url)
        $posts = $jsonRaw | ConvertFrom-Json
        
        if ($posts.Count -eq 0) {
            Write-Host " 已無更多文章，抓取完畢。" -ForegroundColor Cyan
            break
        }

        foreach ($post in $posts) {
            $html = $post.content.rendered
            $title = Clean-Html $post.title.rendered
            
            $mWord = [regex]::Match($html, "(?s)<h1>\s*【(.*?)】\s*</h1>")
            $word = if ($mWord.Success -and -not [string]::IsNullOrWhiteSpace($mWord.Groups[1].Value)) {
                Clean-Html $mWord.Groups[1].Value
            } else {
                $title
            }
            
            $mZhuyin = [regex]::Match($html, "(?s)<th[^>]*>.*?注\s*音.*?</th>\s*<td[^>]*>(.*?)</td>")
            $zhuyin = if ($mZhuyin.Success) {
                $z = Clean-Html $mZhuyin.Groups[1].Value
                ($z -split '\s+' | Where-Object { $_ }) -join ' '
            } else { "" }
            
            $mSyn = [regex]::Match($html, "(?s)<th[^>]*>.*?相\s*似\s*詞.*?</th>\s*<td[^>]*>(.*?)</td>")
            $synonyms = if ($mSyn.Success) { Clean-Html $mSyn.Groups[1].Value } else { "" }
            
            $mAnt = [regex]::Match($html, "(?s)<th[^>]*>.*?相\s*反\s*詞.*?</th>\s*<td[^>]*>(.*?)</td>")
            $antonyms = if ($mAnt.Success) { Clean-Html $mAnt.Groups[1].Value } else { "" }
            
            $mDef = [regex]::Match($html, "(?s)<th[^>]*>.*?解\s*釋.*?</th>\s*<td[^>]*>(.*?)</td>")
            $rawDef = if ($mDef.Success) { Clean-Html $mDef.Groups[1].Value } else { "" }
            
            $definition = $rawDef
            $example = ""
            
            $mSplit = [regex]::Match($rawDef, '(?s)(.*?)\s*(?:如|例)[：:]([\s\S]+)')
            if ($mSplit.Success) {
                $definition = $mSplit.Groups[1].Value.Trim()
                $example = $mSplit.Groups[2].Value.Trim()
                $example = $example -replace '^[「"『\s]+', '' -replace '[」"』\s]+$', ''
            }
            
            $definition = $definition -replace '^[0-9]\.\s*', '' -replace '\n+', ' '
            
            if (-not [string]::IsNullOrWhiteSpace($word) -and (-not [string]::IsNullOrWhiteSpace($definition) -or -not [string]::IsNullOrWhiteSpace($example))) {
                $isIdiom = ($word.Length -eq 4)
                $subType = if ($isIdiom) { "idiom" } else { "vocabulary" }
                $diff = if ($isIdiom) { "junior_high" } else { "elementary" }
                
                $item = [PSCustomObject]@{
                    id = "word-$($post.id)"
                    type = $subType
                    category_name = if ($isIdiom) { "成語挑戰" } else { "常用字詞" }
                    word = $word
                    title = $word
                    zhuyin = $zhuyin
                    synonyms = $synonyms
                    antonyms = $antonyms
                    definition = $definition
                    example = $example
                    difficulty = $diff
                }
                $allQuestions.Add($item)
                if ($isIdiom) {
                    $categoriesSummary.idioms++
                } else {
                    $categoriesSummary.words++
                }
            }
        }

        if ($page % 10 -eq 0 -or $page -eq $MaxUncategorizedPages) {
            Write-Host "  -> 已完成第 $page/$MaxUncategorizedPages 頁 (累計題庫: $($allQuestions.Count) 條，成語: $($categoriesSummary.idioms)，常用字詞: $($categoriesSummary.words))" -ForegroundColor Green
            # 增量安全存檔，防止任何中斷損失
            $categoriesSummary.total = $allQuestions.Count
            $jsonString = $allQuestions | ConvertTo-Json -Depth 5
            [System.IO.File]::WriteAllText($outputJsonPath, $jsonString, [System.Text.Encoding]::UTF8)
            $jsString = "window.QUESTION_BANK = " + $jsonString + ";"
            [System.IO.File]::WriteAllText($outputJsPath, $jsString, [System.Text.Encoding]::UTF8)
            $summaryString = $categoriesSummary | ConvertTo-Json
            [System.IO.File]::WriteAllText($summaryJsonPath, $summaryString, [System.Text.Encoding]::UTF8)
        }
    }
    catch {
        Write-Host " 頁面 $page 讀取中斷: $($_.Exception.Message)" -ForegroundColor Red
        # 短暫休息重試或繼續下一頁
        Start-Sleep -Milliseconds 500
    }
}

$categoriesSummary.total = $allQuestions.Count

# 最終確認存檔
Write-Host "`n全量資料庫更新確認中..." -ForegroundColor Cyan
$jsonString = $allQuestions | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outputJsonPath, $jsonString, [System.Text.Encoding]::UTF8)
$jsString = "window.QUESTION_BANK = " + $jsonString + ";"
[System.IO.File]::WriteAllText($outputJsPath, $jsString, [System.Text.Encoding]::UTF8)
$summaryString = $categoriesSummary | ConvertTo-Json
[System.IO.File]::WriteAllText($summaryJsonPath, $summaryString, [System.Text.Encoding]::UTF8)

Write-Host "=================================================" -ForegroundColor Green
Write-Host "🎉 全量題庫採集全部完成！" -ForegroundColor Green
Write-Host "總筆數: $($categoriesSummary.total)" -ForegroundColor White
Write-Host "  - 成語挑戰 (四字成語): $($categoriesSummary.idioms) 條" -ForegroundColor White
Write-Host "  - 國小/國中常用字詞: $($categoriesSummary.words) 條" -ForegroundColor White
Write-Host "  - 句型練習 (刪節號): $($categoriesSummary.ellipsis) 條" -ForegroundColor White
Write-Host "  - 短語練習 (照樣造句): $($categoriesSummary.sentence) 條" -ForegroundColor White
Write-Host "檔案儲存於: $OutputDir" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Green

