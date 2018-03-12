# longcontest visualizer framework

## demo

-   <https://kimiyuki.net/app/yandex-opt-2018-1/> ([kmyk/yandex-optimization-2018-round-1](https://github.com/kmyk/yandex-optimization-2018-round-1))

## what is this

Marathon Matchとかそういうののvisualizerをいい感じにやるためのtemplate。
公式のに不満があったり、そもそも公式のがないときに使ってください。
gif動画出力機能もあるよ！

## docs

-   使い方
    -   `index.ts` `index.html` を書き換えて実装
    -   `$ npm install` `$ tsc index.ts`
    -   `index.html` をbrowserで開く
-   構成
    -   Typescript + Semantic-UI
-   API
    -   `index.html` (問題に合わせて書き換え)
    -   module `framework`  (触る必要なし)
        -   class `FileParser`  (parserの実装に便利)
        -   class `FileSelector`
        -   class `RichSeekBar`
        -   class `FileExporter`
    -   module `visualizer`  (問題に合わせて書き換え)
        -   class `InputFile` 入力parser
        -   class `OutputFile` 出力parser
        -   class `TesterFrame` 問題の状態
        -   class `Tester` model framesをまとめたやつ 状態遷移
        -   class `Visualizer` view canvasを触る inputも触る
        -   class `App` controller adaptor 触らなくて大丈夫

## license

-   MIT License
-   デザインや初期のコードは[recruit-communications/rco-contest-2018 /final_A/visualizer](https://github.com/recruit-communications/rco-contest-2018/tree/master/final_A/visualizer)を参考にしました
-   `gif.worker.js` は[jnordberg/gif.js](https://github.com/jnordberg/gif.js/)によるものです
